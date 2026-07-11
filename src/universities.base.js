/**
 * 서울·수도권 4년제 대학 — "유명한 순" 상위 20교
 * 제외: 서울대학교, 연세대학교, 고려대학교
 *
 * 대상 사용자: 재수생 · 정시 준비생 → 이 사이트는 [논술전형] + [수능 정시] 위주로 정리한다.
 *
 * rank      : 대략적 선호도/인지도 순위(참고용)
 * ipsiUrl   : 후보 입학처 URL. 리서치 워크플로우 검증단계에서 실접속 확인 후 교정됨.
 * nonsul    : 논술전형 시행 여부(초기 추정, 리서치로 확정)
 */
module.exports = [
  { slug: "skku",      rank: 1,  name: "성균관대학교",     region: "서울", campus: "서울 종로/수원", homepage: "https://www.skku.edu",       ipsiUrl: "https://admission.skku.edu",        women: false, nonsul: true },
  { slug: "hanyang",   rank: 2,  name: "한양대학교",       region: "서울", campus: "서울 성동",     homepage: "https://www.hanyang.ac.kr",  ipsiUrl: "https://go.hanyang.ac.kr",          women: false, nonsul: true },
  { slug: "sogang",    rank: 3,  name: "서강대학교",       region: "서울", campus: "서울 마포",     homepage: "https://www.sogang.ac.kr",   ipsiUrl: "https://admission.sogang.ac.kr",    women: false, nonsul: true },
  { slug: "cau",       rank: 4,  name: "중앙대학교",       region: "서울", campus: "서울 동작",     homepage: "https://www.cau.ac.kr",      ipsiUrl: "https://admission.cau.ac.kr",       women: false, nonsul: true },
  { slug: "khu",       rank: 5,  name: "경희대학교",       region: "서울", campus: "서울/용인",     homepage: "https://www.khu.ac.kr",      ipsiUrl: "https://iphak.khu.ac.kr",           women: false, nonsul: true },
  { slug: "hufs",      rank: 6,  name: "한국외국어대학교", region: "서울", campus: "서울/용인",     homepage: "https://www.hufs.ac.kr",     ipsiUrl: "https://admission.hufs.ac.kr",      women: false, nonsul: true },
  { slug: "uos",       rank: 7,  name: "서울시립대학교",   region: "서울", campus: "서울 동대문",   homepage: "https://www.uos.ac.kr",      ipsiUrl: "https://enter.uos.ac.kr",           women: false, nonsul: true },
  { slug: "konkuk",    rank: 8,  name: "건국대학교",       region: "서울", campus: "서울 광진",     homepage: "https://www.konkuk.ac.kr",   ipsiUrl: "https://enter.konkuk.ac.kr",        women: false, nonsul: true },
  { slug: "dongguk",   rank: 9,  name: "동국대학교",       region: "서울", campus: "서울 중구",     homepage: "https://www.dongguk.edu",    ipsiUrl: "https://ipsi.dongguk.edu",          women: false, nonsul: true },
  { slug: "hongik",    rank: 10, name: "홍익대학교",       region: "서울", campus: "서울 마포",     homepage: "https://www.hongik.ac.kr",   ipsiUrl: "https://iphak.hongik.ac.kr",        women: false, nonsul: true },
  { slug: "ewha",      rank: 11, name: "이화여자대학교",   region: "서울", campus: "서울 서대문",   homepage: "https://www.ewha.ac.kr",     ipsiUrl: "https://admission.ewha.ac.kr",      women: true,  nonsul: true },
  { slug: "sookmyung", rank: 12, name: "숙명여자대학교",   region: "서울", campus: "서울 용산",     homepage: "https://www.sookmyung.ac.kr", ipsiUrl: "https://admission.sookmyung.ac.kr", women: true,  nonsul: true },
  { slug: "kookmin",   rank: 13, name: "국민대학교",       region: "서울", campus: "서울 성북",     homepage: "https://www.kookmin.ac.kr",  ipsiUrl: "https://iphak.kookmin.ac.kr",       women: false, nonsul: true },
  { slug: "ssu",       rank: 14, name: "숭실대학교",       region: "서울", campus: "서울 동작",     homepage: "https://www.ssu.ac.kr",      ipsiUrl: "https://ipsi.ssu.ac.kr",            women: false, nonsul: true },
  { slug: "sejong",    rank: 15, name: "세종대학교",       region: "서울", campus: "서울 광진",     homepage: "https://www.sejong.ac.kr",   ipsiUrl: "https://ipsi.sejong.ac.kr",         women: false, nonsul: true },
  { slug: "kw",        rank: 16, name: "광운대학교",       region: "서울", campus: "서울 노원",     homepage: "https://www.kw.ac.kr",       ipsiUrl: "https://iphak.kw.ac.kr",            women: false, nonsul: true },
  { slug: "ajou",      rank: 17, name: "아주대학교",       region: "경기", campus: "수원",         homepage: "https://www.ajou.ac.kr",     ipsiUrl: "https://ipsi.ajou.ac.kr",           women: false, nonsul: true },
  { slug: "inha",      rank: 18, name: "인하대학교",       region: "인천", campus: "인천 미추홀",   homepage: "https://www.inha.ac.kr",     ipsiUrl: "https://ipsi.inha.ac.kr",           women: false, nonsul: true },
  { slug: "dankook",   rank: 19, name: "단국대학교",       region: "경기", campus: "용인 죽전",     homepage: "https://www.dankook.ac.kr",  ipsiUrl: "https://ipsi.dankook.ac.kr",        women: false, nonsul: true },
  { slug: "gachon",    rank: 20, name: "가천대학교",       region: "경기", campus: "성남",         homepage: "https://www.gachon.ac.kr",   ipsiUrl: "https://ipsi.gachon.ac.kr",         women: false, nonsul: true },
];
