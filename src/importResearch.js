/**
 * 리서치 워크플로우 결과(JSON)를 data/admissions.json 으로 통합한다.
 * 사용법:  node src/importResearch.js <research.json>
 *   research.json 형식: { universities: [...] }  또는  [ ... ]  (대학 객체 배열)
 */
const fs = require("fs");
const path = require("path");
const store = require("./store");
const base = require("./universities.base");

function main() {
  const src = process.argv[2];
  if (!src) {
    console.error("사용법: node src/importResearch.js <research.json>");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(path.resolve(src), "utf8"));
  const universities = Array.isArray(raw) ? raw : raw.universities || [];
  if (!universities.length) {
    console.error("대학 데이터가 비어 있습니다.");
    process.exit(1);
  }

  // base 순서(rank)로 정렬 + base 메타 보강
  const bySlug = {};
  universities.forEach((u) => (bySlug[u.slug] = u));
  const ordered = base
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((b) => {
      const u = bySlug[b.slug];
      if (!u) return null;
      return {
        ...u,
        name: u.name || b.name,
        region: u.region || b.region,
        campus: u.campus || b.campus,
        rank: b.rank,
        women: b.women,
        homepage: u.homepage || b.homepage,
        cutlines: (u.cutlines || []).filter(
          (c) => c && typeof c.percentile === "number" && c.percentile >= 0 && c.percentile <= 100
        ),
      };
    })
    .filter(Boolean);

  const out = {
    generatedAt: new Date().toISOString(),
    count: ordered.length,
    universities: ordered,
  };
  store.writeAdmissions(out);

  const cuts = ordered.reduce((n, u) => n + (u.cutlines ? u.cutlines.length : 0), 0);
  const nonsul = ordered.filter((u) => u.nonsul && u.nonsul.offered).length;
  const verified = ordered.filter((u) => u.urlVerified).length;
  console.log(`✅ data/admissions.json 저장: ${ordered.length}교`);
  console.log(`   · 정시 입결 총 ${cuts}건`);
  console.log(`   · 논술 시행 ${nonsul}교 · 입학처 URL 검증 ${verified}교`);
  console.log(`   · generatedAt = ${out.generatedAt}`);
}

main();
