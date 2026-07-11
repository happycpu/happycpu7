export const meta = {
  name: 'research-jeongsi-nonsul',
  description: '상위 20교의 논술전형 + 수능 정시 요강과 정시 입결(백분위)을 리서치·검증',
  phases: [
    { title: 'Research', detail: '대학별 전형조사 + 정시입결조사 2개 에이전트 병렬' },
    { title: 'Verify', detail: '입학처 URL 실접속 확인 및 사실 점검' },
  ],
}

const JH_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    slug: { type: 'string' },
    admissionYear: { type: 'string', description: '기준 학년도 예: 2027학년도' },
    admissionOfficeUrl: { type: 'string' },
    admissionBoardUrl: { type: 'string', description: '모집요강/입학공지 게시판 URL' },
    phone: { type: 'string' },
    nonsul: {
      type: 'object', additionalProperties: true,
      properties: {
        offered: { type: 'boolean' },
        name: { type: 'string', description: '논술전형명' },
        method: { type: 'string', description: '전형방법 예: 논술70+학생부30' },
        suneungMin: { type: 'string', description: '수능최저학력기준 유무/내용' },
        essayType: { type: 'string', description: '논술유형 예: 인문(언어)/자연(수리)' },
        tracks: { type: 'array', items: { type: 'string' }, description: '모집계열' },
        schedule: { type: 'string', description: '원서접수/논술고사 일정' },
        features: { type: 'string' },
      },
      required: ['offered'],
    },
    jeongsi: {
      type: 'object', additionalProperties: true,
      properties: {
        groups: { type: 'string', description: '모집군 예: 가군/나군' },
        reflect: {
          type: 'object', additionalProperties: true,
          properties: {
            humanities: { type: 'string', description: '인문계 수능 영역별 반영비율' },
            natural: { type: 'string', description: '자연계 수능 영역별 반영비율' },
          },
        },
        english: { type: 'string', description: '영어 반영방법(등급별 점수/가감점)' },
        koreanHistory: { type: 'string', description: '한국사 반영' },
        features: { type: 'string' },
      },
    },
    features: { type: 'array', items: { type: 'string' }, description: '대학 대표 특징' },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string' },
  },
  required: ['slug', 'jeongsi', 'confidence'],
}

const CUT_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    slug: { type: 'string' },
    baseYear: { type: 'string', description: '입결 기준 학년도 예: 2026학년도 정시' },
    method: { type: 'string', description: 'percentile 값의 기준 설명 (예: 국·수·탐 백분위 평균 70%컷)' },
    cutlines: {
      type: 'array',
      description: '모집단위별 정시 지원가능선',
      items: {
        type: 'object', additionalProperties: true,
        properties: {
          track: { type: 'string', description: '인문 | 자연 | 의약 | 예체능 | 기타' },
          dept: { type: 'string', description: '학과/모집단위명' },
          percentile: { type: 'number', description: '국·수·탐 백분위 평균 기준 지원가능선(0~100)' },
          note: { type: 'string' },
        },
        required: ['track', 'dept', 'percentile'],
      },
    },
    sourceUrls: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string' },
  },
  required: ['slug', 'cutlines', 'confidence'],
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: true,
  properties: {
    slug: { type: 'string' },
    finalAdmissionOfficeUrl: { type: 'string' },
    urlReachable: { type: 'boolean' },
    isCorrectUniversity: { type: 'boolean' },
    finalBoardUrl: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['slug', 'finalAdmissionOfficeUrl', 'urlReachable', 'isCorrectUniversity'],
}

const universities = Array.isArray(args) ? args : JSON.parse(args)
log(`리서치 대상: ${universities.length}교 (논술 + 정시 + 입결)`)

function lowestConf(a, b) {
  const order = { high: 3, medium: 2, low: 1, '': 0, undefined: 0 }
  const av = order[a] || 0, bv = order[b] || 0
  return av <= bv ? (a || 'low') : (b || 'low')
}

const results = await pipeline(
  universities,
  // ── Stage 1: 전형조사 + 입결조사 병렬 ──
  async (u) => {
    const [jh, cut] = await parallel([
      () => agent(
        `당신은 한국 대학 정시·논술 입시 전문 리서처입니다. 대상 사용자는 재수생이며 정시와 논술만 지원합니다. 아래 대학의 **논술전형과 수능 정시** 정보를 정확히 조사하세요.\n\n` +
        `- 대학명: ${u.name} (${u.region}, ${u.campus})\n- 후보 입학처 URL: ${u.ipsiUrl}\n- 홈페이지: ${u.homepage}\n- slug: ${u.slug}\n\n` +
        `오늘은 2026년 7월. 가장 최근 공식 발표된 요강(대개 2027학년도 수시/정시)을 기준으로 하되, admissionYear에 기준 학년도를 명시하세요.\n\n` +
        `WebSearch/WebFetch로 조사할 항목:\n` +
        `1) 정확한 입학처 URL과 모집요강/입학공지 게시판 URL\n` +
        `2) 논술전형: 시행 여부(offered), 전형명, 전형방법(논술+학생부 반영비율), 수능최저학력기준 내용, 논술유형(인문/자연), 모집계열, 일정, 특징. ※ 논술 미시행 대학이면 offered=false로 명확히.\n` +
        `3) 정시(수능위주): 모집군(가/나/다), 인문·자연 계열 수능 영역별 반영비율, 영어 반영방법(등급별 환산/가감점), 한국사 반영, 특징\n` +
        `4) 대학 대표 특징\n\n` +
        `학생부교과/학생부종합 등 수시 정보는 조사하지 마세요(정시생 대상). 실제 확인한 사실만, 불확실하면 confidence를 낮추고 notes에 명시. 지어내지 마세요.`,
        { label: `전형:${u.slug}`, phase: 'Research', agentType: 'general-purpose', schema: JH_SCHEMA }
      ),
      () => agent(
        `당신은 한국 대학 정시 입시결과(입결) 분석 전문가입니다. 아래 대학의 **정시(수능위주) 모집단위별 지원가능선**을 조사하세요.\n\n` +
        `- 대학명: ${u.name} (${u.region}, ${u.campus})\n- 홈페이지: ${u.homepage}\n- slug: ${u.slug}\n\n` +
        `오늘은 2026년 7월. **직전 정시(2026학년도 또는 2025학년도) 최종 입결**을 기준으로, 각 모집단위(학과)의 "국어·수학·탐구 백분위 평균" 기준 정시 지원가능선(대략 70%컷 또는 합격자 평균)을 percentile(0~100)로 추정해 채우세요. baseYear에 기준 연도를 명시.\n\n` +
        `WebSearch/WebFetch 활용: 대학 공개 입결, 진학사/유웨이/메가스터디 등 입시업체 공개 자료, 입시 기사 등.\n\n` +
        `요구사항:\n` +
        `- 계열(인문/자연/의약/예체능)별 대표 학과들을 포함해 가능한 많이(최소 계열별 2~5개). 최상위·중위·하위 학과를 고루.\n` +
        `- 정확한 학과별 수치를 못 찾으면 계열 대표값이라도 넣고 note에 '계열 추정'이라 표기, confidence=low.\n` +
        `- method 필드에 percentile 기준을 설명(예: 국수탐 백분위 평균 70%컷).\n\n` +
        `절대 정밀한 수치를 지어내지 마세요. 근거 없는 값보다 '계열 추정'이 낫습니다. 출처 URL을 sourceUrls에 남기세요.`,
        { label: `입결:${u.slug}`, phase: 'Research', agentType: 'general-purpose', schema: CUT_SCHEMA }
      ),
    ])
    return { u, jh, cut }
  },
  // ── Stage 2: 검증 ──
  (r) => {
    if (!r) return null
    const u = r.u
    const jh = r.jh || {}
    const officeUrl = jh.admissionOfficeUrl || u.ipsiUrl
    const boardUrl = jh.admissionBoardUrl || ''
    return agent(
      `"${u.name}"(slug: ${u.slug})의 입학처 정보를 검증하세요.\n\n` +
      `조사된 입학처 URL: ${officeUrl}\n조사된 게시판 URL: ${boardUrl || '(없음)'}\n홈페이지: ${u.homepage}\n\n` +
      `작업:\n` +
      `1) WebFetch로 입학처 URL에 실제 접속 → urlReachable, ${u.name}의 공식 입학 사이트가 맞는지 isCorrectUniversity 판정.\n` +
      `2) 틀렸거나 접속불가면 WebSearch로 올바른 URL을 찾아 finalAdmissionOfficeUrl에 넣으세요. 맞으면 그대로.\n` +
      `3) 매일 변경감지에 쓸 모집요강/공지 게시판 URL을 finalBoardUrl로 확정(가능하면).\n` +
      `4) 명백한 오류는 issues에 기록.\n실제 접속 결과에만 근거하세요.`,
      { label: `검증:${u.slug}`, phase: 'Verify', agentType: 'general-purpose', schema: VERIFY_SCHEMA }
    ).then((v) => ({ ...r, verify: v }))
  }
)

// ── 병합 ──
function dedupe(arr) { return Array.from(new Set((arr || []).filter(Boolean))) }

const merged = results.filter(Boolean).map((r) => {
  const u = r.u
  const jh = r.jh || {}
  const cut = r.cut || {}
  const v = r.verify || {}
  const officeUrl = (v.isCorrectUniversity && v.finalAdmissionOfficeUrl)
    ? v.finalAdmissionOfficeUrl
    : (jh.admissionOfficeUrl || u.ipsiUrl)
  const cutlines = (cut.cutlines || []).filter((c) => c && typeof c.percentile === 'number' && c.percentile >= 0 && c.percentile <= 100)
  return {
    slug: u.slug,
    name: u.name,
    region: u.region,
    campus: u.campus,
    women: u.women,
    rank: u.rank,
    homepage: u.homepage,
    admissionYear: jh.admissionYear || '',
    admissionOfficeUrl: officeUrl,
    admissionBoardUrl: v.finalBoardUrl || jh.admissionBoardUrl || '',
    phone: jh.phone || '',
    nonsul: jh.nonsul || { offered: !!u.nonsul },
    jeongsi: jh.jeongsi || null,
    cutlines,
    cutlineMethod: cut.method || '',
    cutlineBaseYear: cut.baseYear || '',
    features: jh.features || [],
    sourceUrls: dedupe([...(jh.sourceUrls || []), ...(cut.sourceUrls || [])]),
    confidence: lowestConf(jh.confidence, cut.confidence),
    urlVerified: !!(v.isCorrectUniversity && v.urlReachable),
    verifyIssues: v.issues || [],
    notes: [jh.notes, cut.notes].filter(Boolean).join(' | '),
  }
}).filter(Boolean)

const totalCuts = merged.reduce((n, m) => n + m.cutlines.length, 0)
const nonsulYes = merged.filter((m) => m.nonsul && m.nonsul.offered).length
const verified = merged.filter((m) => m.urlVerified).length
log(`병합 완료: ${merged.length}교 · 입결 ${totalCuts}건 · 논술시행 ${nonsulYes}교 · URL검증 ${verified}교`)

return { count: merged.length, universities: merged }
