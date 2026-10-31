import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import type { RelatedTerm } from "../../api/support";
import Icon from "../../components/Icon";

/** 고객센터 묶음 탭(screens.md WP25). 공용 SubPageHeader 의 SECTIONS 에는 고객센터가 없어 같은 클래스로 여기서 그린다. */
const SUPPORT_LINKS = [
  { to: "/support", label: "고객센터 홈" },
  { to: "/support/faq", label: "자주 묻는 질문" },
  { to: "/support/notices", label: "공지사항" },
  { to: "/support/rights", label: "권리 안내" },
  { to: "/support/guide", label: "이용 가이드" },
] as const;

type Props = {
  /** 탭 중 현재 화면의 경로. 상세 화면이면 상위 목록의 경로. */
  current: (typeof SUPPORT_LINKS)[number]["to"];
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  /** 상세 화면 이름(예: 공지 제목). 있으면 현재 위치 줄에 한 단계 더 붙인다. */
  detail?: string;
};

/**
 * 고객센터 하위 화면 머리: 현재 위치 · 큰 제목 + 설명 · 고객센터 탭. 모양은 brand.css 의 subpage-* 를 그대로 쓴다.
 * 모든 고객센터 화면의 제목 아래에 "실제 상담·민원 접수는 없다" 고지를 한 줄 둔다(FR-45, ADR-001).
 */
export default function SupportHeader({ current, title, description, meta, detail }: Props) {
  const currentLabel = SUPPORT_LINKS.find(link => link.to === current)?.label ?? title;
  return (
    <div className="subpage-head">
      <div className="subpage-inner">
        <nav className="crumbs" aria-label="현재 위치">
          <ol>
            <li><Link to="/">홈</Link></li>
            {current === "/support"
              ? <li aria-current="page">고객센터</li>
              : <li><Link to="/support">고객센터</Link></li>}
            {current !== "/support" && (detail
              ? <><li><Link to={current}>{currentLabel}</Link></li><li aria-current="page">{detail}</li></>
              : <li aria-current="page">{currentLabel}</li>)}
          </ol>
        </nav>
        <div className="subpage-title">
          <div>
            <h1>{title}</h1>
            {description && <p className="subpage-description">{description}</p>}
            {meta && <p className="subpage-meta">{meta}</p>}
            <p className="support-no-counsel"><Icon name="info" size={16} />교육용 모의 서비스라 실제 상담·민원 접수는 없어요. 전화번호·상담 시간도 두지 않아요.</p>
          </div>
        </div>
      </div>
      <nav className="subpage-tabs" aria-label="고객센터 메뉴">
        <div className="subpage-inner">
          {SUPPORT_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === "/support"} className={({ isActive }) => (isActive ? "is-active" : undefined)}>{link.label}</NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** 관련 용어 링크 줄. 용어 상세(S-05)로 간다. 비어 있으면 아무것도 그리지 않는다. */
export function TermLinks({ terms, label = "관련 용어" }: { terms: RelatedTerm[]; label?: string }) {
  if (terms.length === 0) return null;
  return (
    <p className="support-terms">
      <span className="support-terms-label">{label}</span>
      {terms.map(t => <Link key={t.slug} to={`/glossary/${t.slug}`}>{t.term}</Link>)}
    </p>
  );
}

/** 외부 공식 출처 링크(국가법령정보센터 등). 새 창으로 열고 그 사실을 글자로 알린다. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="support-external">
      {children}<span className="sr-only"> (새 창)</span>
    </a>
  );
}
