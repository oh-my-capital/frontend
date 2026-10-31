import { Link } from "react-router-dom";
import Brand, { BRAND_NAME } from "./Brand";
import Icon from "./Icon";
import { FOOTER_POLICY_LINKS, menuLinks, visibleMenus } from "./nav";

const YEAR = new Date().getFullYear();

/**
 * 공통 바닥(디자인 v3, rea-capital-sites.md §4.5): 정책 링크 줄(권리 안내 강조) → 메뉴별 바로가기 → 교육용 고지 줄 → 서비스 소개·저작권.
 * 시중 캐피탈 바닥의 회사 주소·대표 전화·사업자등록번호·심의필 자리는 만들지 않는다. 실제 회사가 아니므로 흉내 내면 사칭에 가깝다.
 * 바로가기는 nav.ts 에서 만든다(운영 메뉴는 넣지 않는다).
 */
export default function SiteFooter() {
  const sitemap = visibleMenus(false);
  return (
    <footer className="site-footer">
      <nav className="footer-policy" aria-label="권리·안내">
        <div className="site-footer-inner">
          {FOOTER_POLICY_LINKS.map(link => <Link key={link.to} to={link.to} className={link.strong ? "is-strong" : undefined}>{link.label}</Link>)}
        </div>
      </nav>
      <nav className="site-footer-inner footer-sitemap" aria-label="사이트 바로가기">
        <dl>
          {sitemap.map(menu => (
            <div key={menu.key}>
              <dt><Link to={menu.to}>{menu.label}</Link></dt>
              <dd>{menuLinks(menu).map(link => <Link key={link.to} to={link.to}>{link.label}</Link>)}</dd>
            </div>
          ))}
        </dl>
      </nav>
      <div className="site-footer-inner footer-body">
        <Brand compact />
        <div className="footer-info">
          <p className="footer-disclaimer">
            <strong>교육용 모의 서비스 — 실제 대출·중개·광고가 아닙니다.</strong>
            {BRAND_NAME}는 실제 대출을 취급하거나 중개하지 않고, 금융상품을 광고·권유하지 않습니다. 실명·주민등록번호·실계좌·실제 신용조회를 쓰지 않으며 연락·추심을 하지 않습니다.
          </p>
          <p>
            <strong>{BRAND_NAME}</strong>캐피탈(여신전문금융)의 구조와 대출의 생애를 배우는 교육용 모의 여신 서비스입니다.
            계산 결과는 공개된 규칙 세트로 산출한 모의 값이며 실제 금융회사의 조건이 아닙니다. 제도 수치의 출처와 확인일은 <Link to="/methodology">방법론</Link>에,
            금융소비자가 쓸 수 있는 권리와 근거 조문은 <Link to="/support/rights">금융소비자 권리 안내</Link>에 적습니다.
          </p>
          <p className="footer-copy">© {YEAR} {BRAND_NAME}. 교육용 모의 서비스이며 상담 창구·전화번호를 운영하지 않습니다. 궁금한 점은 <Link to="/support/faq">자주 묻는 질문</Link>에서 찾아요.</p>
        </div>
        <button type="button" className="footer-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Icon name="up" size={16} />맨 위로</button>
      </div>
    </footer>
  );
}
