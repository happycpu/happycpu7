"use strict";

const BANDS = {
  안정: "#1a7f37", 적정: "#0969da", 소신: "#9a6700", 도전: "#cf222e", 어려움: "#6e7781",
};

const state = { universities: [], filterRegion: "전체", nonsulOnly: false, search: "" };

// ── utils ──
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtRel(iso) {
  if (!iso) return "미점검";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}
async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch (e) {}
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── status bar ──
async function loadStatus() {
  try {
    const s = await api("/api/status");
    const chips = [];
    chips.push(`<span class="status-chip ${s.running ? "live" : ""}">자동점검 <b>${s.running ? "진행중…" : "대기"}</b></span>`);
    chips.push(`<span class="status-chip">마지막 확인 <b>${s.lastFullCheck ? fmtRel(s.lastFullCheck) : "없음"}</b></span>`);
    chips.push(`<span class="status-chip">점검완료 <b>${s.checkedSchools}/${s.totalSchools}</b></span>`);
    if (s.dataGeneratedAt) chips.push(`<span class="status-chip">데이터 <b>${fmtDate(s.dataGeneratedAt).slice(0, 10)}</b></span>`);
    $("#statusChips").innerHTML = chips.join("");
  } catch (e) {
    $("#statusChips").innerHTML = `<span class="status-chip">상태 불러오기 실패</span>`;
  }
}

// ── universities ──
async function loadUniversities() {
  const grid = $("#univGrid");
  grid.innerHTML = `<div class="empty"><span class="spinner"></span> 불러오는 중…</div>`;
  try {
    const data = await api("/api/universities");
    state.universities = data.universities || [];
    renderUniversities();
  } catch (e) {
    grid.innerHTML = `<div class="empty">대학 목록을 불러오지 못했습니다: ${esc(e.message)}</div>`;
  }
}

function renderUniversities() {
  const grid = $("#univGrid");
  let list = state.universities;
  if (state.filterRegion !== "전체") list = list.filter((u) => u.region === state.filterRegion);
  if (state.nonsulOnly) list = list.filter((u) => u.nonsul && u.nonsul.offered);
  if (state.search) list = list.filter((u) => u.name.includes(state.search));

  if (!list.length) { grid.innerHTML = `<div class="empty">조건에 맞는 대학이 없습니다.</div>`; return; }

  grid.innerHTML = list.map((u) => {
    const ns = u.nonsul || {};
    const nsTag = ns.offered
      ? `<span class="tag on">논술 시행</span>`
      : `<span class="tag off">논술 없음</span>`;
    const jgun = u.jeongsi && u.jeongsi.groups ? `<span class="tag jeongsi">정시 ${esc(u.jeongsi.groups)}</span>` : `<span class="tag jeongsi">정시 모집</span>`;
    const cutTag = (u.cutlines && u.cutlines.length) ? `<span class="tag">입결 ${u.cutlines.length}</span>` : "";
    const chk = u.check || {};
    const dotCls = chk.status === "ok" ? "ok" : chk.status === "error" ? "err" : "none";
    const conf = u.confidence ? `신뢰도 ${u.confidence === "high" ? "높음" : u.confidence === "medium" ? "보통" : "낮음"}` : (u.researched ? "" : "조사 대기");
    const edge = u.region === "서울" ? "#3355e6" : u.region === "경기" ? "#8250df" : "#0aa2a2";
    return `
      <article class="univ-card" data-slug="${u.slug}" style="--edge:${edge}">
        <div class="univ-card-top">
          <span class="rank-badge${u.rank <= 3 ? " medal" : ""}">${u.rank}</span>
          ${u.women ? '<span class="tag">여대</span>' : ""}
        </div>
        <div class="univ-name">${esc(u.name)}</div>
        <div class="univ-meta">${esc(u.region)} · ${esc(u.campus)}${u.admissionYear ? " · " + esc(u.admissionYear) : ""}</div>
        <div class="univ-tags">${nsTag}${jgun}${cutTag}</div>
        <div class="univ-foot">
          <span><span class="dot ${dotCls}"></span>${chk.lastChecked ? fmtRel(chk.lastChecked) + " 확인" : "미점검"}</span>
          <span class="confidence">${esc(conf)}</span>
        </div>
      </article>`;
  }).join("");

  $$(".univ-card", grid).forEach((c) => c.addEventListener("click", () => openDetail(c.dataset.slug)));
}

// ── detail modal ──
async function openDetail(slug) {
  const u = state.universities.find((x) => x.slug === slug);
  if (!u) return;
  const ns = u.nonsul || {};
  const jg = u.jeongsi || {};

  const links = [
    u.admissionOfficeUrl ? `<a href="${esc(u.admissionOfficeUrl)}" target="_blank" rel="noopener">입학처 ↗</a>` : "",
    u.admissionBoardUrl ? `<a href="${esc(u.admissionBoardUrl)}" target="_blank" rel="noopener">모집요강 게시판 ↗</a>` : "",
    u.homepage ? `<a href="${esc(u.homepage)}" target="_blank" rel="noopener">홈페이지 ↗</a>` : "",
  ].filter(Boolean).join("");

  const nonsulSec = ns.offered === false && !ns.name
    ? `<div class="m-section"><h3>논술전형</h3><p class="univ-meta">이 대학은 논술전형을 시행하지 않습니다. (정시 위주 지원 검토)</p></div>`
    : `<div class="m-section">
        <h3>논술전형 ${ns.offered ? "" : '<span class="tag off">미시행</span>'}</h3>
        <dl class="kv">
          ${row("전형명", ns.name)}
          ${row("전형방법", ns.method)}
          ${row("수능최저", ns.suneungMin)}
          ${row("논술유형", ns.essayType)}
          ${row("모집계열", Array.isArray(ns.tracks) ? ns.tracks.join(", ") : ns.tracks)}
          ${row("원서접수", ns.schedule)}
          ${row("특징", ns.features)}
        </dl>
      </div>`;

  const reflect = jg.reflect || {};
  const jeongsiSec = `
    <div class="m-section">
      <h3>수능 정시</h3>
      <dl class="kv">
        ${row("모집군", jg.groups)}
        ${row("인문 반영", reflect.humanities)}
        ${row("자연 반영", reflect.natural)}
        ${row("영어 반영", jg.english)}
        ${row("한국사", jg.koreanHistory)}
        ${row("특징", jg.features)}
      </dl>
    </div>`;

  const cuts = u.cutlines || [];
  const cutSec = cuts.length ? `
    <div class="m-section">
      <h3>정시 입결(지원가능선 · 백분위 추정)</h3>
      <table class="tbl">
        <thead><tr><th>계열</th><th>모집단위</th><th>기준</th><th style="text-align:right">백분위</th></tr></thead>
        <tbody>
          ${cuts.slice().sort((a, b) => (b.percentile || 0) - (a.percentile || 0)).map((c) => `
            <tr><td>${esc(c.track || "-")}</td><td>${esc(c.dept || "-")}${c.note ? ` <span class="univ-meta">(${esc(c.note)})</span>` : ""}</td>
            <td>${esc(c.baseYear || "-")}</td><td class="num">${c.percentile != null ? c.percentile : "-"}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="notice">입결 수치는 전년도 기준 추정치입니다. 실제 지원 시 최신 입시자료로 재확인하세요.</div>
    </div>` : "";

  const feats = (u.features && u.features.length) ? `
    <div class="m-section"><h3>특징</h3><div class="chips-inline">${u.features.map((f) => `<span class="tag">${esc(f)}</span>`).join("")}</div></div>` : "";

  const sources = (u.sourceUrls && u.sourceUrls.length) ? `
    <div class="m-section"><h3>출처</h3>${u.sourceUrls.map((s) => `<div><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a></div>`).join("")}</div>` : "";

  $("#modalBody").innerHTML = `
    <div class="m-head">
      <h2>${esc(u.name)} <span class="rank-badge">${u.rank}위권</span></h2>
      <div class="univ-meta">${esc(u.region)} · ${esc(u.campus)}${u.phone ? " · ☎ " + esc(u.phone) : ""}</div>
      <div class="m-links">${links || '<span class="univ-meta">링크 정보 없음</span>'}</div>
    </div>
    ${nonsulSec}
    ${jeongsiSec}
    ${cutSec}
    ${feats}
    ${sources}
    ${u.check && u.check.lastChecked ? `<div class="m-section"><p class="univ-meta">입학처 페이지 마지막 확인: ${fmtDate(u.check.lastChecked)} · 상태 ${esc(u.check.status || "-")}${u.check.lastChanged ? " · 최근변경 " + fmtDate(u.check.lastChanged) : ""}</p></div>` : ""}
  `;
  $("#modal").hidden = false;
}
function row(k, v) {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
  return `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
}
function closeModal() { $("#modal").hidden = true; }

// ── match ──
async function submitMatch(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    track: fd.get("track"),
    korean: fd.get("korean"), math: fd.get("math"), tamgu: fd.get("tamgu"),
    english: fd.get("english"), koreanHistory: fd.get("koreanHistory"),
    includeHard: fd.get("includeHard") === "on",
  };
  const box = $("#matchResult");
  box.innerHTML = `<div class="empty"><span class="spinner"></span> 계산 중…</div>`;
  try {
    const r = await api("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    renderMatch(r);
  } catch (err) {
    box.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

function renderMatch(r) {
  const box = $("#matchResult");
  const order = ["안정", "적정", "소신", "도전", "어려움"];
  const countPills = order.map((b) =>
    r.counts[b] ? `<span class="band-pill" style="background:${BANDS[b]}">${b} ${r.counts[b]}</span>` : ""
  ).join("");
  const total = order.reduce((n, b) => n + (r.counts[b] || 0), 0);
  const distSegs = total
    ? order.map((b) => r.counts[b]
        ? `<span class="dist-seg" style="width:${((r.counts[b] / total) * 100).toFixed(1)}%;background:${BANDS[b]}" title="${b} ${r.counts[b]}개"></span>`
        : "").join("")
    : "";

  let html = `
    <div class="result-summary">
      <div class="summary-top">
        <div class="avg-badge">내 국·수·탐 백분위 평균<b>${r.userAvg}</b></div>
        <div class="band-counts">${countPills || '<span class="univ-meta">해당 없음</span>'}</div>
      </div>
      ${distSegs ? `<div class="dist-bar">${distSegs}</div>` : ""}
      <div class="disclaimer">※ ${esc(r.disclaimer)}</div>
    </div>`;

  if (!r.schools.length) {
    html += `<div class="empty">조건에 맞는 학과가 없습니다. 계열을 '전체'로 바꾸거나 '어려움도 표시'를 켜보세요.<br><span class="univ-meta">※ 해당 대학 입결 데이터가 아직 수집되지 않았을 수 있습니다.</span></div>`;
    box.innerHTML = html; return;
  }

  html += r.schools.map((s) => `
    <div class="result-school" style="--edge:${BANDS[s.bestBand]}">
      <div class="result-school-head">
        <span class="rk">${s.rank}위권</span>
        <h3>${esc(s.name)}</h3>
        <span class="tag">${esc(s.region)}</span>
        ${s.nonsulOffered ? '<span class="tag on">논술 시행</span>' : ""}
        <span class="band-pill" style="background:${BANDS[s.bestBand]};margin-left:auto">${s.bestBand}</span>
      </div>
      <div class="dept-list">
        ${s.depts.map((d) => `
          <span class="dept-chip" title="${esc(d.note || "")}"
            style="--chip-bg:var(--band-${d.band}-bg);--chip-border:color-mix(in srgb, ${BANDS[d.band]} 40%, var(--border))">
            <span class="band-dot" style="background:${BANDS[d.band]}"></span>
            <span class="dept-name">${esc(d.dept)}</span>
            <span class="pct">${d.percentile}</span>
            <span class="band-name" style="color:${BANDS[d.band]}">${d.band}</span>
          </span>`).join("")}
      </div>
    </div>`).join("");

  box.innerHTML = html;
}

// ── changelog ──
async function loadChangelog() {
  const box = $("#changeLog");
  box.innerHTML = `<div class="empty"><span class="spinner"></span> 불러오는 중…</div>`;
  try {
    const r = await api("/api/changelog?limit=100");
    if (!r.changes.length) { box.innerHTML = `<div class="empty">아직 감지된 변경이 없습니다. 첫 점검 후 기록이 쌓입니다.</div>`; return; }
    box.innerHTML = r.changes.map((c) => `
      <div class="log-item">
        <span class="log-badge ${c.type}">${c.type === "changed" ? "변경" : "최초"}</span>
        <span class="log-name">${esc(c.name)}</span>
        <span>${esc(c.message)}</span>
        <span class="log-time">${fmtDate(c.at)}</span>
      </div>`).join("");
  } catch (e) {
    box.innerHTML = `<div class="empty">불러오기 실패: ${esc(e.message)}</div>`;
  }
}

// ── recheck ──
async function recheck() {
  const btn = $("#recheckBtn");
  btn.disabled = true; btn.classList.add("spin");
  toast("입학처 페이지를 다시 점검하는 중… (수십 초 소요)");
  try {
    const r = await api("/api/recheck", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!r.started) {
      toast(r.reason === "already-running" ? "이미 점검이 진행 중입니다." : "점검을 시작하지 못했습니다.");
    } else {
      const s = r.summary;
      toast(`점검 완료 · 확인 ${s.checked} · 변경 ${s.changed} · 오류 ${s.errors}`);
      await Promise.all([loadStatus(), loadUniversities(), loadChangelog()]);
    }
  } catch (e) {
    toast("점검 오류: " + e.message);
  } finally {
    btn.disabled = false; btn.classList.remove("spin");
  }
}

// ── tabs ──
function switchTab(name) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "log") loadChangelog();
}

// ── init ──
function init() {
  $$(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  $("#recheckBtn").addEventListener("click", recheck);
  $("#matchForm").addEventListener("submit", submitMatch);

  $$("#regionFilters .chip").forEach((c) => c.addEventListener("click", () => {
    $$("#regionFilters .chip").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    state.filterRegion = c.dataset.region;
    renderUniversities();
  }));
  $("#nonsulOnly").addEventListener("change", (e) => { state.nonsulOnly = e.target.checked; renderUniversities(); });
  $("#searchBox").addEventListener("input", (e) => { state.search = e.target.value.trim(); renderUniversities(); });

  $$("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  loadStatus();
  loadUniversities();
  setInterval(loadStatus, 30000);
}
document.addEventListener("DOMContentLoaded", init);
