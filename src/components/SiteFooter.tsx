import { Link } from "react-router-dom";
import Brand, { BRAND_NAME } from "./Brand";

const LINKS = [
  { to: "/course", label: "입문 과정" },
  { to: "/glossary", label: "용어 사전" },
  { to: "/calculators/schedule", label: "상환 스케줄 계산기" },
  { to: "/calculators/screening", label: "심사 시뮬레이터" },
  { to: "/calculators/prepayment", label: "중도상환 견적" },
  { to: "/sandbox", label: "모의 여신" },
  { to: "/methodology", label: "방법론" },
];

const YEAR = new Date().getFullYear();

/** 공통 푸터: 바로가기 줄, 서비스 소개, 교육용 고지(ui-guidelines §5 ⑥). */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="하단 바로가기">
        <div className="site-footer-inner">
          {LINKS.map(link => <Link key={link.to} to={link.to}>{link.label}</Link>)}
        </div>
      </nav>
      <div className="site-footer-inner footer-body">
        <Brand compact />
        <div className="footer-info">
          <p><strong>{BRAND_NAME}</strong>캐피탈(여신전문금융)의 구조와 대출의 생애를 배우는 교육용 모의 여신 서비스</p>
          <p>{BRAND_NAME}는 교육용 서비스입니다. 실제 대출을 취급하지 않고, 실명·실계좌·신용조회·추심을 하지 않습니다. 계산 결과는 공개된 규칙 세트로 산출한 모의 값이며 실제 금융회사의 조건이 아닙니다. 제도 수치의 출처와 확인일은 방법론 화면에 적습니다.</p>
          <p className="footer-copy">© {YEAR} {BRAND_NAME}. 교육용 모의 서비스.</p>
        </div>
        <button type="button" className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>맨 위로 ↑</button>
      </div>
    </footer>
  );
}
