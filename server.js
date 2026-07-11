/**
 * 서울·수도권 4년제(상위 20교) 논술·정시 입시요강 정리 웹서버
 *  - 로그인 없음
 *  - 매일 1회 백그라운드로 입학처 페이지 변경 감지 (scheduler)
 *  - "다시 조사하기" 버튼 → 즉시 재점검 (POST /api/recheck)
 *  - 수능 백분위 입력 → 지원가능 대학·학과 찾기 (POST /api/match)
 */
const path = require("path");
const express = require("express");

const store = require("./src/store");
const base = require("./src/universities.base");
const crawler = require("./src/crawler");
const scheduler = require("./src/scheduler");
const matcher = require("./src/matcher");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── 데이터 병합 헬퍼 ────────────────────────────────────
function admissionsBySlug() {
  const a = store.readAdmissions();
  const map = {};
  (a.universities || []).forEach((u) => (map[u.slug] = u));
  return { map, generatedAt: a.generatedAt };
}

function mergeSchool(b, adm, state) {
  const st = (state.schools && state.schools[b.slug]) || {};
  return {
    slug: b.slug,
    rank: b.rank,
    name: b.name,
    region: b.region,
    campus: b.campus,
    women: b.women,
    homepage: b.homepage,
    admissionOfficeUrl: (adm && adm.admissionOfficeUrl) || b.ipsiUrl,
    admissionBoardUrl: (adm && adm.admissionBoardUrl) || "",
    admissionYear: (adm && adm.admissionYear) || "",
    phone: (adm && adm.phone) || "",
    nonsul: (adm && adm.nonsul) || { offered: b.nonsul, note: "조사 대기중" },
    jeongsi: (adm && adm.jeongsi) || null,
    cutlines: (adm && adm.cutlines) || [],
    features: (adm && adm.features) || [],
    sourceUrls: (adm && adm.sourceUrls) || [],
    confidence: (adm && adm.confidence) || null,
    researched: !!adm,
    urlVerified: !!(adm && adm.urlVerified),
    // 크롤링 상태
    check: {
      lastChecked: st.lastChecked || null,
      status: st.status || null,
      httpStatus: st.httpStatus || null,
      lastChanged: st.lastChanged || null,
      contentLength: st.contentLength || null,
      error: st.error || null,
    },
  };
}

// ── API ────────────────────────────────────────────────
app.get("/api/universities", (req, res) => {
  const { map, generatedAt } = admissionsBySlug();
  const state = store.readState();
  const list = base
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((b) => mergeSchool(b, map[b.slug], state));
  res.json({ generatedAt, count: list.length, universities: list });
});

app.get("/api/universities/:slug", (req, res) => {
  const b = base.find((x) => x.slug === req.params.slug);
  if (!b) return res.status(404).json({ error: "not-found" });
  const { map } = admissionsBySlug();
  const state = store.readState();
  res.json(mergeSchool(b, map[b.slug], state));
});

app.get("/api/status", (req, res) => {
  const state = store.readState();
  const { generatedAt } = admissionsBySlug();
  const schools = Object.values(state.schools || {});
  res.json({
    running: !!state.running,
    lastFullCheck: state.lastFullCheck,
    lastRun: state.lastRun || null,
    dailyCron: scheduler.DAILY_CRON,
    timezone: scheduler.TZ,
    dataGeneratedAt: generatedAt,
    totalSchools: base.length,
    checkedSchools: schools.filter((s) => s.contentHash).length,
    errorSchools: schools.filter((s) => s.status === "error").length,
    recentChanges: (state.changeLog || []).filter((c) => c.type === "changed").length,
  });
});

app.get("/api/changelog", (req, res) => {
  const state = store.readState();
  const limit = Math.min(Number(req.query.limit) || 50, 300);
  res.json({ changes: (state.changeLog || []).slice(0, limit) });
});

// "다시 조사하기" — 즉시 재점검
app.post("/api/recheck", async (req, res) => {
  try {
    const slugs = Array.isArray(req.body && req.body.slugs) ? req.body.slugs : null;
    const result = await crawler.runCheck({ trigger: "manual", slugs });
    res.json(result);
  } catch (err) {
    console.error("[api] recheck 오류:", err);
    res.status(500).json({ started: false, error: err.message });
  }
});

// 수능 점수 → 지원가능 대학·학과
app.post("/api/match", (req, res) => {
  try {
    const result = matcher.match(req.body || {});
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("[api] match 오류:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🎓 입시요강 웹서버 실행: http://localhost:${PORT}`);
  console.log(`   대상: 서울·수도권 4년제 상위 ${base.length}교 (논술·정시 위주)`);
  scheduler.start();
});
