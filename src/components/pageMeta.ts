/**
 * 화면별 검색·공유 메타(NFR-21, WP39). PageTitle(브라우저)과 vite.config.ts(빌드 때 sitemap.xml)가 함께 읽는다.
 * 그래서 이 파일은 브라우저·Node 어느 쪽 API 도 쓰지 않고 다른 파일을 import 하지 않는다(값만 둔다).
 *
 * - path: react-router 경로 패턴. 먼저 맞는 항목을 쓰므로 상세 패턴을 목록 패턴보다 앞에 둔다.
 * - index: 검색 노출 여부. 공개 화면만 true. 로그인 필요·운영·가입 흐름 화면은 false → `<meta name="robots" content="noindex">`.
 * - sitemap: sitemap.xml 에 넣을 고정 주소(경로 매개변수 없는 공개 화면만). 상세 화면(:id·:slug)은 넣지 않는다(데이터가 data 저장소에 있다).
 * - description: 기능을 설명하는 한두 문장(ui-guidelines §6, 마케팅 어휘 금지). 없으면 사이트 기본 설명.
 *
 * 새 화면을 더하면 여기에 한 줄을 넣는다. 빠뜨려도 nav.ts 의 메뉴 이름을 제목으로 쓰고 noindex 로 둔다(안전한 쪽).
 */
export type PageMeta = {
  path: string;
  title: string;
  description?: string;
  index: boolean;
  sitemap?: boolean;
};

export const SITE_DESCRIPTION =
  "캐피탈(여신전문금융)의 구조를 개념과 확인 문제로 배우고, 상환 스케줄·심사·중도상환 계산기와 가상 시계로 움직이는 모의 여신으로 대출의 생애를 직접 따라가 보는 교육용 서비스입니다. 실제 대출을 취급하지 않습니다.";

/** 공유 미리보기 그림(public/images, 1200×800, 글자 없는 장면 일러스트). 절대 주소는 사이트 주소를 앞에 붙여 만든다. */
export const OG_IMAGE_PATH = "/images/capital-desk.webp";
export const OG_IMAGE_ALT = "장부와 계산기가 놓인 상담 책상 장면 일러스트";

export const PAGE_META: PageMeta[] = [
  { path: "/", title: "여신을 배우는 모의 캐피탈", index: true, sitemap: true },

  // 배우기
  { path: "/course", title: "입문 과정 목차", index: true, sitemap: true, description: "캐피탈 여신의 생애를 순서대로 따라가는 입문 과정 목차예요. 개념마다 요약·확인 문제 수·연결 계산기를 함께 보여 줘요." },
  { path: "/learn/:conceptId", title: "개념 상세", index: true, description: "여신 개념 하나를 그림·흔한 오해 표·체크리스트로 설명하고 확인 문제로 이해를 점검해요." },
  { path: "/glossary/:slug", title: "용어 상세", index: true, description: "여신 용어의 정의·공식·예시·주의점과 관련 용어, 출처를 한 화면에 정리했어요." },
  { path: "/glossary", title: "용어 사전", index: true, sitemap: true, description: "캐피탈·여신 용어를 분류·초성·검색으로 찾고 정의 첫 줄을 표로 훑어봐요." },
  { path: "/methodology", title: "방법론", index: true, sitemap: true, description: "계산기와 모의 여신이 쓰는 규칙 세트 버전, 반올림·일수 규칙, 금리 밴드·DSR·건전성 기준을 출처와 가정값으로 나눠 밝혀요." },
  { path: "/missions/:id", title: "학습 미션", index: true, description: "학습 목표와 단계 힌트를 따라 모의 여신에서 직접 해 보고 판정 조건으로 완료를 확인하는 미션이에요." },
  { path: "/missions", title: "학습 미션", index: true, sitemap: true, description: "모의 여신에서 직접 해 보며 배우는 미션 목록이에요. 난이도별로 거르고 진행률을 확인해요." },
  { path: "/industry", title: "업권 비교·공시 읽기", index: true, sitemap: true, description: "가상 회사 자료로 여신 업권을 비교하고 공시 숫자를 읽는 법을 연습해요." },
  { path: "/me/learning", title: "내 학습", index: false },
  { path: "/org", title: "내 기관", index: false },

  // 계산기
  { path: "/calculators/schedule", title: "상환 스케줄 계산기", index: true, sitemap: true, description: "원금·기간·금리를 넣으면 원리금균등·원금균등·만기일시 세 방식의 월 납입액과 총이자를 한 표에서 비교하고 회차표를 봐요." },
  { path: "/calculators/screening", title: "심사 시뮬레이터", index: true, sitemap: true, description: "소득·기존 원리금·신용점수로 교육용 심사 규칙을 돌려 결정·적용 금리 구성·한도 3요소와 규칙별 근거를 표로 확인해요." },
  { path: "/calculators/prepayment", title: "중도상환 견적", index: true, sitemap: true, description: "남은 잔액·경과이자·중도상환수수료를 계산하고 잔존기간별 수수료 추이와 일부 상환 뒤 재산정 회차표를 봐요." },
  { path: "/calculators/refinance", title: "대환 비교", index: true, sitemap: true, description: "기존 대출을 새 조건으로 갈아탈 때 중도상환수수료·부대비용을 포함한 총비용 차이를 비교해요." },
  { path: "/calculators/dsr", title: "DSR 계산기", index: true, sitemap: true, description: "연소득과 기존 대출 행을 넣어 총부채원리금상환비율(DSR)과 새 대출을 더했을 때의 비율을 계산해요." },
  { path: "/calculators/auto-finance", title: "할부·리스·렌트 비교", index: true, sitemap: true, description: "같은 차량가로 할부·운용리스·장기렌트의 월 납입액·총비용을 한 표에서 비교해요." },
  { path: "/calculators/corporate", title: "기업 심사 시뮬레이터", index: true, sitemap: true, description: "가상의 사업자·법인 재무 수치로 교육용 기업 심사 규칙을 돌려 결정과 근거를 확인해요." },
  { path: "/calculators/unit-economics", title: "대출 한 건의 손익", index: true, sitemap: true, description: "대출 한 건이 회사에 남기는 손익을 조달 비용·운영비·예상 손실로 나눠 계산해요." },
  { path: "/calculators", title: "계산기", index: false },

  // 상품
  { path: "/products/:code", title: "상품 상세", index: true, description: "교육용 모의 상품의 요약 조건표·대표 예시·밴드별 금리·유의사항을 확인해요." },
  { path: "/products", title: "상품 안내", index: true, sitemap: true, description: "교육용 모의 상품의 대상·금리 범위·한도·기간과 규칙 세트로 계산한 대표 예시 월 납입액을 표로 비교해요." },

  // 모의 여신(로그인)
  { path: "/sandbox/profile", title: "가상 고객 프로필", index: false },
  { path: "/sandbox/apply", title: "대출 신청", index: false },
  { path: "/sandbox/applications/:id", title: "신청·심사 결과", index: false },
  { path: "/sandbox/contracts/:id/certificates/:type", title: "인쇄용 증명서", index: false },
  { path: "/sandbox/contracts/:id", title: "계약 상세", index: false },
  { path: "/sandbox/notifications", title: "알림함", index: false },
  { path: "/sandbox/certificates", title: "증명서 발급", index: false },
  { path: "/sandbox/calendar", title: "납입 캘린더", index: false },
  { path: "/sandbox/scenarios", title: "시나리오 프리셋", index: false },
  { path: "/sandbox", title: "내 모의 여신", index: false },

  // 운영(ADMIN)
  { path: "/admin/applications", title: "심사 큐", index: false },
  { path: "/admin/portfolio", title: "포트폴리오", index: false },
  { path: "/admin/content", title: "콘텐츠 운영", index: false },
  { path: "/admin/batch", title: "배치", index: false },
  { path: "/admin/analytics", title: "운영 분석", index: false },
  { path: "/admin/collections", title: "연체 관리", index: false },
  { path: "/admin/audit", title: "운영 이력", index: false },
  { path: "/admin/ledger", title: "회계 원장·대사", index: false },
  { path: "/admin/rules", title: "규칙 변경 결재", index: false },
  { path: "/admin/pnl", title: "손익", index: false },
  { path: "/admin/kpi", title: "서비스 지표", index: false },
  { path: "/admin/organizations", title: "기관", index: false },
  { path: "/admin", title: "운영", index: false },

  // 고객센터
  { path: "/support/faq", title: "자주 묻는 질문", index: true, sitemap: true, description: "자주 묻는 질문을 분류와 검색으로 찾고, 답과 연결 화면을 바로 열어요." },
  { path: "/support/notices/:id", title: "공지 상세", index: true, description: "서비스 공지의 본문, 바뀐 것 목록, 근거 기록과 연결 화면을 확인해요." },
  { path: "/support/notices", title: "공지사항", index: true, sitemap: true, description: "서비스 공지를 번호·분류·게시일 순서로 확인해요." },
  { path: "/support/rights", title: "금융소비자 권리 안내", index: true, sitemap: true, description: "청약철회·금리인하요구 등 금융소비자의 권리를 요건·기한·행사 방법과 근거 조문으로 정리했어요." },
  { path: "/support/guide", title: "이용 가이드", index: true, sitemap: true, description: "계산기·배우기·모의 여신을 처음 쓸 때 따라 할 단계를 번호 순서로 안내해요." },
  { path: "/support", title: "고객센터", index: true, sitemap: true, description: "자주 묻는 질문·공지사항·금융소비자 권리 안내·이용 가이드를 한곳에서 찾아요. 교육용 서비스라 실제 상담·민원 접수는 없어요." },

  // 약관·정책
  { path: "/legal/terms", title: "이용약관", index: true, sitemap: true, description: "교육용 모의 서비스 CapiMATE의 이용약관이에요." },
  { path: "/legal/privacy", title: "개인정보처리방침", index: true, sitemap: true, description: "CapiMATE가 처리하는 개인정보의 항목·목적·보관 기간과 이용자의 권리를 안내해요." },

  // 계정
  { path: "/login", title: "로그인", index: false },
  { path: "/signup", title: "가입", index: false },
  { path: "/settings/data", title: "내 데이터", index: false },
  { path: "/settings", title: "계정 설정", index: false },
];

/** sitemap.xml 에 넣는 고정 공개 경로(빌드 때 vite.config.ts 가 읽는다). */
export function sitemapPaths(): string[] {
  return PAGE_META.filter(meta => meta.index && meta.sitemap).map(meta => meta.path);
}

/** 사이트 주소(VITE_SITE_URL)를 끝 / 없이 맞춘다. http(s) 주소가 아니면 빈 문자열(= 절대 주소를 만들지 않는다). */
export function normalizeSiteUrl(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^/\s]+(\/[^\s]*)?$/.test(trimmed) ? trimmed : "";
}
