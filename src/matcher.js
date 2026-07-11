/**
 * 수능 성적(백분위 위주) → 정시 지원가능 대학·학과 매칭
 *
 * cutline.percentile = 해당 모집단위의 "국·수·탐 백분위 평균" 기준 정시 지원가능선(전년도 입결 근사).
 * 사용자 백분위 평균과의 차이(diff)로 안정/적정/소신/도전/어려움을 판정한다.
 *
 * ※ 영어는 대학마다 등급별 가·감점 방식이 달라 평균 계산에서 제외하고 참고용으로만 표시한다.
 */
const store = require("./store");
const base = require("./universities.base");

// diff = userAvg - cutPercentile
const BANDS = [
  { key: "안정", min: 4, color: "#1a7f37" },
  { key: "적정", min: 1, color: "#0969da" },
  { key: "소신", min: -2, color: "#9a6700" },
  { key: "도전", min: -5, color: "#cf222e" },
  { key: "어려움", min: -Infinity, color: "#6e7781" },
];

function bandFor(diff) {
  for (const b of BANDS) if (diff >= b.min) return b.key;
  return "어려움";
}

function trackMatches(userTrack, cutTrack) {
  if (!userTrack || userTrack === "전체") return true;
  if (!cutTrack) return true; // 미분류 모집단위는 항상 포함
  const t = String(cutTrack);
  if (t.includes("공통") || t.includes("기타")) return true;
  return t.includes(userTrack);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * @param {Object} scores { korean, math, tamgu, english, koreanHistory, track, includeHard }
 * @returns 매칭 결과
 */
function match(scores) {
  const korean = num(scores.korean);
  const math = num(scores.math);
  const tamgu = num(scores.tamgu);
  const parts = [korean, math, tamgu].filter((v) => v !== null);
  if (parts.length === 0) {
    return { ok: false, error: "국어·수학·탐구 백분위 중 최소 하나는 입력해야 합니다." };
  }
  const userAvg = round1(parts.reduce((a, b) => a + b, 0) / parts.length);
  const track = scores.track || "전체";
  const includeHard = !!scores.includeHard;

  const admissions = store.readAdmissions();
  const bySlug = {};
  (admissions.universities || []).forEach((u) => (bySlug[u.slug] = u));

  const matchedSchools = [];
  const counts = { 안정: 0, 적정: 0, 소신: 0, 도전: 0, 어려움: 0 };

  for (const b of base) {
    const u = bySlug[b.slug];
    const cutlines = (u && u.cutlines) || [];
    const depts = [];
    for (const c of cutlines) {
      if (typeof c.percentile !== "number") continue;
      if (!trackMatches(track, c.track)) continue;
      const diff = round1(userAvg - c.percentile);
      const band = bandFor(diff);
      counts[band] = (counts[band] || 0) + 1;
      if (band === "어려움" && !includeHard) continue;
      depts.push({
        dept: c.dept || c.track || "모집단위",
        track: c.track || "",
        percentile: c.percentile,
        diff,
        band,
        baseYear: c.baseYear || "",
        note: c.note || "",
      });
    }
    if (depts.length === 0) continue;
    depts.sort((a, b2) => b2.percentile - a.percentile);
    const bestBand = depts
      .map((d) => d.band)
      .sort((a, b2) => BANDS.findIndex((x) => x.key === a) - BANDS.findIndex((x) => x.key === b2))[0];
    matchedSchools.push({
      slug: b.slug,
      name: b.name,
      rank: b.rank,
      region: b.region,
      campus: b.campus,
      nonsulOffered: !!(u && u.nonsul && u.nonsul.offered),
      admissionOfficeUrl: (u && u.admissionOfficeUrl) || b.ipsiUrl,
      bestBand,
      depts,
    });
  }

  // 학교 정렬: 지원가능(안정/적정/소신/도전) 우선, 그다음 rank
  const bandOrder = { 안정: 0, 적정: 1, 소신: 2, 도전: 3, 어려움: 4 };
  matchedSchools.sort((a, b2) => {
    const d = bandOrder[a.bestBand] - bandOrder[b2.bestBand];
    if (d !== 0) return d;
    return a.rank - b2.rank;
  });

  return {
    ok: true,
    userAvg,
    inputs: { korean, math, tamgu, english: num(scores.english), koreanHistory: num(scores.koreanHistory), track },
    counts,
    schoolCount: matchedSchools.length,
    deptCount: matchedSchools.reduce((n, s) => n + s.depts.length, 0),
    schools: matchedSchools,
    dataYear: admissions.generatedAt ? admissions.generatedAt : null,
    disclaimer:
      "지원가능선은 전년도 입시결과에 기반한 추정치입니다. 실제 지원 전 반드시 각 대학 최신 모집요강과 입시업체 자료로 재확인하세요.",
  };
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = { match, BANDS };
