import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { BRAND_NAME } from "./Brand";

/** 경로별 문서 제목(docs/design/screens.md). 먼저 맞는 항목을 쓴다. 상세 패턴을 목록 패턴보다 앞에 둔다. */
const TITLES: [string, string][] = [
  ["/", "여신을 배우는 모의 캐피탈"],
  ["/course", "입문 과정 목차"],
  ["/learn/:conceptId", "개념 상세"],
  ["/glossary/:slug", "용어 상세"],
  ["/glossary", "용어 사전"],
  ["/calculators/schedule", "상환 스케줄 계산기"],
  ["/calculators/screening", "심사 시뮬레이터"],
  ["/calculators/prepayment", "중도상환 견적"],
  ["/calculators", "계산기"],
  ["/methodology", "방법론"],
  ["/me/learning", "내 학습"],
  ["/sandbox/profile", "가상 고객 프로필"],
  ["/sandbox/apply", "대출 신청"],
  ["/sandbox/applications/:id", "신청·심사 결과"],
  ["/sandbox/contracts/:id", "계약 상세"],
  ["/sandbox/notifications", "알림함"],
  ["/sandbox", "내 모의 여신"],
  ["/admin/applications", "심사 큐"],
  ["/admin/portfolio", "포트폴리오"],
  ["/admin/content", "콘텐츠 운영"],
  ["/admin/batch", "배치"],
  ["/admin", "운영"],
  ["/login", "로그인"],
  ["/signup", "가입"],
  ["/settings", "계정 설정"],
];

/** 라우트가 바뀔 때 document.title을 맞춘다. 화면 안에서 더 구체적인 제목이 필요하면 setDocumentTitle을 부른다. */
export default function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const found = TITLES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname));
    document.title = `${found ? found[1] : "없는 주소"} · ${BRAND_NAME}`;
  }, [pathname]);
  return null;
}

export function setDocumentTitle(title: string) {
  document.title = `${title} · ${BRAND_NAME}`;
}
