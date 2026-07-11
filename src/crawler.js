/**
 * 입학처/모집요강 페이지를 가져와 콘텐츠 해시를 비교, 변경을 감지한다.
 *
 * - 대상 URL 우선순위: admissionBoardUrl(모집요강/공지 게시판) > admissionOfficeUrl(입학처) > ipsiUrl(후보)
 * - 본문 텍스트를 정규화 후 SHA-256 해시. 직전 해시와 다르면 "변경 감지".
 * - 결과는 store 의 state.json 에 기록(마지막 확인시각, 해시, 변경 이력).
 */
const crypto = require("crypto");
const axios = require("axios");
const cheerio = require("cheerio");
const store = require("./store");
const base = require("./universities.base");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36 UnivAdmissionGuideBot/1.0";

const FETCH_TIMEOUT_MS = 15000;
const CONCURRENCY = 5;
const MAX_CHANGELOG = 300;

function nowIso() {
  return new Date().toISOString();
}

function targetUrlFor(slug, admissionsBySlug) {
  const a = admissionsBySlug[slug];
  if (a) return a.admissionBoardUrl || a.admissionOfficeUrl || a.ipsiUrl;
  const b = base.find((x) => x.slug === slug);
  return b ? b.ipsiUrl : null;
}

/** HTML → 정규화된 본문 텍스트 */
function extractText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg").remove();
  const text = $("body").text() || $.root().text() || "";
  return text.replace(/\s+/g, " ").trim();
}

function hashOf(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function fetchOne(school, url) {
  try {
    const res = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      maxRedirects: 5,
      responseType: "text",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      validateStatus: (s) => s >= 200 && s < 400,
      // 일부 대학 사이트는 EUC-KR. axios 는 utf8 로 디코드하지만 해시 비교엔 일관되면 충분.
      transformResponse: (d) => d,
    });
    const text = extractText(res.data || "");
    return { ok: true, httpStatus: res.status, text };
  } catch (err) {
    const httpStatus = err.response ? err.response.status : null;
    return { ok: false, httpStatus, error: err.code || err.message };
  }
}

/**
 * 한 학교 점검. state 를 직접 변형하고, 변경여부 정보를 반환.
 */
async function checkSchool(school, url, state) {
  const prev = state.schools[school.slug] || {};
  const result = await fetchOne(school, url);
  const at = nowIso();

  if (!result.ok) {
    state.schools[school.slug] = {
      ...prev,
      slug: school.slug,
      name: school.name,
      url,
      lastChecked: at,
      status: "error",
      httpStatus: result.httpStatus || null,
      error: result.error,
    };
    return { slug: school.slug, name: school.name, outcome: "error", error: result.error };
  }

  const hash = hashOf(result.text);
  const hadPrev = !!prev.contentHash;
  const changed = hadPrev && prev.contentHash !== hash;

  state.schools[school.slug] = {
    slug: school.slug,
    name: school.name,
    url,
    lastChecked: at,
    status: "ok",
    httpStatus: result.httpStatus,
    contentHash: hash,
    contentLength: result.text.length,
    lastChanged: changed ? at : prev.lastChanged || (hadPrev ? prev.lastChanged : at),
    error: null,
  };

  let outcome = "unchanged";
  if (!hadPrev) {
    outcome = "baseline";
    state.changeLog.unshift({
      at,
      slug: school.slug,
      name: school.name,
      type: "baseline",
      message: `최초 스냅샷 저장 (본문 ${result.text.length.toLocaleString()}자)`,
    });
  } else if (changed) {
    outcome = "changed";
    state.changeLog.unshift({
      at,
      slug: school.slug,
      name: school.name,
      type: "changed",
      message: `입학처 페이지 내용 변경 감지 (본문 ${result.text.length.toLocaleString()}자)`,
    });
  }
  return { slug: school.slug, name: school.name, outcome };
}

/** 배열을 동시성 제한으로 순회 */
async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * 전체(또는 일부) 학교 점검. trigger: "scheduled" | "manual"
 */
async function runCheck({ trigger = "manual", slugs = null } = {}) {
  const state = store.readState();
  if (state.running) {
    return { started: false, reason: "already-running", lastFullCheck: state.lastFullCheck };
  }
  state.running = true;
  store.writeState(state);

  const startedAt = nowIso();
  const admissions = store.readAdmissions();
  const admissionsBySlug = {};
  (admissions.universities || []).forEach((u) => (admissionsBySlug[u.slug] = u));

  let targets = base;
  if (slugs && slugs.length) targets = base.filter((b) => slugs.includes(b.slug));

  try {
    const results = await mapLimit(targets, CONCURRENCY, (school) => {
      const url = targetUrlFor(school.slug, admissionsBySlug) || school.ipsiUrl;
      return checkSchool(school, url, state);
    });

    // 변경이력 상한 유지
    if (state.changeLog.length > MAX_CHANGELOG) state.changeLog.length = MAX_CHANGELOG;

    const summary = {
      trigger,
      startedAt,
      finishedAt: nowIso(),
      checked: results.length,
      changed: results.filter((r) => r.outcome === "changed").length,
      baseline: results.filter((r) => r.outcome === "baseline").length,
      unchanged: results.filter((r) => r.outcome === "unchanged").length,
      errors: results.filter((r) => r.outcome === "error").length,
      changedSchools: results.filter((r) => r.outcome === "changed").map((r) => r.name),
    };

    state.lastFullCheck = summary.finishedAt;
    state.lastRun = summary;
    return { started: true, summary };
  } finally {
    // runCheck 내부에서 state 객체를 계속 변형해 왔으므로 그대로 저장
    state.running = false;
    store.writeState(state);
  }
}

module.exports = { runCheck, extractText, hashOf };
