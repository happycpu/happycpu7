/**
 * 매일 1회 백그라운드로 입학처 페이지 변경 여부를 점검한다. (node-cron)
 * 기본 04:10 KST. 서버 시작 직후 baseline 이 없으면 1회 즉시 점검한다.
 */
const cron = require("node-cron");
const crawler = require("./crawler");
const store = require("./store");

const DAILY_CRON = process.env.DAILY_CRON || "10 4 * * *"; // 매일 04:10
const TZ = process.env.TZ || "Asia/Seoul";

function start() {
  // 1) 매일 정기 점검
  const task = cron.schedule(
    DAILY_CRON,
    async () => {
      console.log(`[scheduler] 정기 점검 시작 (${new Date().toISOString()})`);
      try {
        const r = await crawler.runCheck({ trigger: "scheduled" });
        if (r.started) {
          console.log(
            `[scheduler] 완료 — 확인 ${r.summary.checked}, 변경 ${r.summary.changed}, 오류 ${r.summary.errors}`
          );
        } else {
          console.log(`[scheduler] 건너뜀 — ${r.reason}`);
        }
      } catch (err) {
        console.error("[scheduler] 점검 오류:", err.message);
      }
    },
    { timezone: TZ }
  );

  // 2) 서버 부팅 시 아직 스냅샷이 없으면 최초 1회 baseline 점검
  const state = store.readState();
  const hasAnySnapshot = Object.values(state.schools || {}).some((s) => s.contentHash);
  if (!hasAnySnapshot) {
    console.log("[scheduler] 최초 baseline 점검 예약(20초 후)");
    setTimeout(() => {
      crawler
        .runCheck({ trigger: "scheduled" })
        .then((r) => r.started && console.log(`[scheduler] baseline 완료 — 확인 ${r.summary.checked}`))
        .catch((e) => console.error("[scheduler] baseline 오류:", e.message));
    }, 20000);
  }

  console.log(`[scheduler] 매일 점검 등록됨: "${DAILY_CRON}" (${TZ})`);
  return task;
}

module.exports = { start, DAILY_CRON, TZ };
