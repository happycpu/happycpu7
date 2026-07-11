/**
 * JSON 파일 기반 영속 저장소 (네이티브 의존성 없음)
 *
 *  data/admissions.json  — 리서치로 수집·검증된 대학별 입시전형 상세 데이터
 *  data/state.json       — 크롤링 상태(마지막 확인시각, 콘텐츠 해시, 변경 이력 등)
 *
 * 두 파일 모두 원자적(temp→rename)으로 저장한다.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const ADMISSIONS_PATH = path.join(DATA_DIR, "admissions.json");
const STATE_PATH = path.join(DATA_DIR, "state.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[store] ${path.basename(file)} 읽기 실패:`, err.message);
    return fallback;
  }
}

function writeJson(file, obj) {
  ensureDir();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

// ── admissions.json ────────────────────────────────────
function readAdmissions() {
  return readJson(ADMISSIONS_PATH, { generatedAt: null, count: 0, universities: [] });
}

function writeAdmissions(obj) {
  writeJson(ADMISSIONS_PATH, obj);
}

// ── state.json ─────────────────────────────────────────
function defaultState() {
  return {
    lastFullCheck: null, // 마지막 전체 점검 완료 시각(ISO)
    running: false, // 크롤링 진행중 여부
    schools: {}, // slug -> { lastChecked, status, httpStatus, contentHash, contentLength, lastChanged, error, url }
    changeLog: [], // { at, slug, name, type, message } 최신순
  };
}

function readState() {
  const s = readJson(STATE_PATH, defaultState());
  // 하위호환: 누락 필드 보정
  return { ...defaultState(), ...s, schools: s.schools || {}, changeLog: s.changeLog || [] };
}

function writeState(state) {
  writeJson(STATE_PATH, state);
}

module.exports = {
  DATA_DIR,
  ADMISSIONS_PATH,
  STATE_PATH,
  readAdmissions,
  writeAdmissions,
  readState,
  writeState,
  defaultState,
};
