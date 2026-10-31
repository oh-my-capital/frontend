/**
 * 사이트 메뉴 정의(디자인 v3, docs/design/rea-capital-sites.md §4.1).
 * 머리 메가 메뉴·모바일 드로어·바닥 바로가기·하위 화면 머리의 위치 표시와 탭이 모두 이 파일 하나를 읽는다.
 * 새 화면을 메뉴에 넣을 때는 여기만 고친다. 아직 없는 화면도 경로를 미리 둔다(다른 WP가 만드는 중).
 *
 * 구조: 1단(NavMenu) → 2단 분류(NavGroup, 링크가 아닌 소제목) → 링크(NavLinkItem).
 */
export type NavLinkItem = {
  to: string;
  label: string;
  /** 메가 메뉴에 보조 설명 한 줄(선택). */
  hint?: string;
  /** 로그인해야 쓰는 화면. 메뉴에 자물쇠 대신 "로그인" 꼬리표를 단다. */
  login?: boolean;
  /** 하위 화면 머리 탭에서 뺀다(상위 화면과 같은 탭을 쓰는 화면 등). */
  noTab?: boolean;
};

export type NavGroup = { label: string; links: NavLinkItem[] };

export type NavMenuKey = "products" | "calculators" | "learn" | "sandbox" | "support" | "admin";

export type NavMenu = {
  key: NavMenuKey;
  label: string;
  /** 1단 메뉴를 눌렀을 때 가는 화면. */
  to: string;
  /** 메가 메뉴 왼쪽 칸 설명. 기능을 설명하는 한 문장. */
  description: string;
  /** 현재 메뉴 판단에 쓰는 경로 앞부분. */
  match: string[];
  groups: NavGroup[];
  /** 메가 메뉴 아래쪽 안내(선택). */
  note?: string;
  adminOnly?: boolean;
};

export const NAV_MENUS: NavMenu[] = [
  {
    key: "products",
    label: "상품안내",
    to: "/products",
    description: "교육용 모의 상품의 대상·금리 범위·한도·기간과 규칙 세트로 계산한 대표 예시를 봐요.",
    match: ["/products"],
    groups: [
      { label: "상품", links: [{ to: "/products", label: "상품 목록·대표 예시" }] },
      {
        label: "바로 해 보기",
        links: [
          { to: "/sandbox/apply", label: "모의 대출 신청", login: true, noTab: true },
          { to: "/calculators/auto-finance", label: "할부·리스·렌트 비교", noTab: true },
        ],
      },
    ],
  },
  {
    key: "calculators",
    label: "계산기",
    to: "/calculators/schedule",
    description: "로그인 없이 써요. 모든 결과 아래에 규칙·계산 버전과 교육용 고지를 붙여요.",
    match: ["/calculators"],
    groups: [
      {
        label: "상환·이자",
        links: [
          { to: "/calculators/schedule", label: "상환 스케줄" },
          { to: "/calculators/prepayment", label: "중도상환 견적" },
          { to: "/calculators/refinance", label: "대환 비교" },
        ],
      },
      {
        label: "심사·한도",
        links: [
          { to: "/calculators/screening", label: "심사 시뮬레이터" },
          { to: "/calculators/dsr", label: "DSR 계산기" },
        ],
      },
      { label: "자동차 금융", links: [{ to: "/calculators/auto-finance", label: "할부·리스·렌트 비교" }] },
    ],
  },
  {
    key: "learn",
    label: "배우기",
    to: "/course",
    description: "개념 카드와 확인 문제로 대출 한 건의 생애를 처음부터 끝까지 따라가요.",
    match: ["/course", "/learn", "/glossary", "/methodology", "/missions", "/me/learning"],
    groups: [
      {
        label: "과정",
        links: [
          { to: "/course", label: "입문 과정" },
          { to: "/missions", label: "학습 미션" },
        ],
      },
      {
        label: "찾아보기",
        links: [
          { to: "/glossary", label: "용어 사전" },
          { to: "/methodology", label: "방법론" },
        ],
      },
      { label: "내 기록", links: [{ to: "/me/learning", label: "내 학습", login: true }] },
    ],
  },
  {
    key: "sandbox",
    label: "모의 여신",
    to: "/sandbox",
    description: "가상 고객으로 신청·실행하고 가상 시계를 넘기며 납입·연체·건전성을 겪어 봐요.",
    match: ["/sandbox"],
    note: "청약철회·금리인하요구·상환 유예·증명서는 현황에서 계약을 고른 뒤 계약 상세에서 해요.",
    groups: [
      {
        label: "내 현황",
        links: [
          { to: "/sandbox", label: "현황", login: true },
          { to: "/sandbox/calendar", label: "납입 캘린더", login: true },
          { to: "/sandbox/certificates", label: "증명서 발급", login: true },
          { to: "/sandbox/notifications", label: "알림함", login: true },
        ],
      },
      {
        label: "신청",
        links: [
          { to: "/sandbox/profile", label: "가상 고객 프로필", login: true },
          { to: "/sandbox/apply", label: "대출 신청", login: true },
        ],
      },
      { label: "연습 장면", links: [{ to: "/sandbox/scenarios", label: "시나리오 프리셋", login: true }] },
    ],
  },
  {
    key: "support",
    label: "고객센터",
    to: "/support",
    description: "막혔을 때 볼 자주 묻는 질문·공지와 금융소비자가 쓸 수 있는 권리를 모았어요.",
    match: ["/support"],
    groups: [
      {
        label: "도움말",
        links: [
          { to: "/support", label: "고객센터 홈" },
          { to: "/support/faq", label: "자주 묻는 질문" },
          { to: "/support/notices", label: "공지사항" },
          { to: "/support/guide", label: "이용 가이드" },
        ],
      },
      { label: "금융소비자 보호", links: [{ to: "/support/rights", label: "금융소비자 권리 안내" }] },
    ],
  },
  {
    key: "admin",
    label: "운영",
    to: "/admin/applications",
    description: "운영자 전용. 심사 결정 변경, 포트폴리오·리스크 지표, 콘텐츠·배치를 다뤄요.",
    match: ["/admin"],
    adminOnly: true,
    groups: [
      {
        label: "심사·여신",
        links: [
          { to: "/admin/applications", label: "심사 큐" },
          { to: "/admin/collections", label: "연체 관리" },
        ],
      },
      {
        label: "지표",
        links: [
          { to: "/admin/portfolio", label: "포트폴리오" },
          { to: "/admin/analytics", label: "운영 분석" },
        ],
      },
      {
        label: "기록·도구",
        links: [
          { to: "/admin/audit", label: "운영 이력" },
          { to: "/admin/content", label: "콘텐츠" },
          { to: "/admin/batch", label: "배치" },
        ],
      },
    ],
  },
];

/** 역할에 맞는 메뉴만. 운영은 ADMIN에게만 보인다. */
export function visibleMenus(isAdmin: boolean): NavMenu[] {
  return NAV_MENUS.filter(menu => !menu.adminOnly || isAdmin);
}

export function menuByKey(key: NavMenuKey): NavMenu {
  return NAV_MENUS.find(menu => menu.key === key)!;
}

/** 경로가 메뉴 안에 있는가. "/sandbox"는 "/sandbox/…"도 포함한다. */
export function pathMatches(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 현재 경로가 속한 1단 메뉴. 없으면 null(홈·로그인 등). */
export function activeMenu(pathname: string): NavMenu | null {
  return NAV_MENUS.find(menu => menu.match.some(prefix => pathMatches(prefix, pathname))) ?? null;
}

/** 메뉴 안의 링크를 한 줄로(중복 경로 제거, 순서 유지). 탭에는 noTab을 뺀다. */
export function menuLinks(menu: NavMenu, forTabs = false): NavLinkItem[] {
  const seen = new Set<string>();
  const result: NavLinkItem[] = [];
  for (const group of menu.groups) {
    for (const link of group.links) {
      if (seen.has(link.to) || (forTabs && link.noTab)) continue;
      seen.add(link.to);
      result.push(link);
    }
  }
  return result;
}

/** 하위 화면 머리(SubPageHeader)의 묶음: 위치 표시의 1단 이름·주소와 같은 묶음 탭. 키는 v2와 같고 products·support 를 더했다. */
export type SubPageSection = { label: string; to: string; links: { to: string; label: string }[] };

const sectionOf = (key: NavMenuKey): SubPageSection => {
  const menu = menuByKey(key);
  return { label: menu.label, to: menu.to, links: menuLinks(menu, true).map(({ to, label }) => ({ to, label })) };
};

export const SUBPAGE_SECTIONS = {
  products: sectionOf("products"),
  calculators: sectionOf("calculators"),
  learn: sectionOf("learn"),
  sandbox: sectionOf("sandbox"),
  support: sectionOf("support"),
  admin: sectionOf("admin"),
  account: { label: "계정", to: "/settings", links: [{ to: "/settings", label: "계정 설정" }] },
} satisfies Record<string, SubPageSection>;

export type SubPageSectionKey = keyof typeof SUBPAGE_SECTIONS;

/** 바닥 정책 링크 줄(rea §4.5). 권리 안내를 맨 앞에 굵게 둔다. */
export const FOOTER_POLICY_LINKS: { to: string; label: string; strong?: boolean }[] = [
  { to: "/support/rights", label: "금융소비자 권리 안내", strong: true },
  { to: "/methodology", label: "계산 규칙(방법론)" },
  { to: "/support/faq", label: "자주 묻는 질문" },
  { to: "/support/notices", label: "공지사항" },
  { to: "/support", label: "고객센터" },
];
