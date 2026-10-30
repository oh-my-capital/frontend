import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

/** 같은 묶음 화면으로 가는 탭(ui-guidelines §5 하위 화면). */
export const SECTIONS = {
  learn: { label: "배우기", links: [{ to: "/course", label: "입문 과정" }, { to: "/glossary", label: "용어 사전" }, { to: "/methodology", label: "방법론" }, { to: "/me/learning", label: "내 학습" }] },
  calculators: { label: "계산기", links: [{ to: "/calculators/schedule", label: "상환 스케줄" }, { to: "/calculators/screening", label: "심사 시뮬레이터" }, { to: "/calculators/prepayment", label: "중도상환 견적" }] },
  sandbox: { label: "모의 여신", links: [{ to: "/sandbox", label: "현황" }, { to: "/sandbox/profile", label: "가상 고객 프로필" }, { to: "/sandbox/apply", label: "대출 신청" }, { to: "/sandbox/notifications", label: "알림함" }] },
  admin: { label: "운영", links: [{ to: "/admin/applications", label: "심사 큐" }, { to: "/admin/portfolio", label: "포트폴리오" }, { to: "/admin/content", label: "콘텐츠" }, { to: "/admin/batch", label: "배치" }] },
  account: { label: "계정", links: [{ to: "/settings", label: "계정 설정" }] },
} as const;

type Props = {
  section: keyof typeof SECTIONS;
  /** 탭 중 현재 화면의 경로. 상세 화면이면 상위 목록의 경로. */
  current: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** 상세 화면 이름(예: 계약번호). 있으면 현재 위치 줄에 한 단계 더 붙인다. */
  detail?: string;
  /** false 면 탭 줄을 숨긴다(계정 화면 등). */
  tabs?: boolean;
};

/** 하위 화면 머리: 현재 위치, 큰 제목 + 한 줄 설명, 같은 묶음 탭. */
export default function SubPageHeader({ section, current, title, description, meta, actions, detail, tabs = true }: Props) {
  const group = SECTIONS[section];
  const currentLabel = group.links.find(link => link.to === current)?.label ?? title;
  return (
    <div className="subpage-head">
      <div className="subpage-inner">
        <nav className="crumbs" aria-label="현재 위치">
          <ol>
            <li><Link to="/">홈</Link></li>
            <li>{group.label}</li>
            {detail
              ? <><li><Link to={current}>{currentLabel}</Link></li><li aria-current="page">{detail}</li></>
              : <li aria-current="page">{currentLabel}</li>}
          </ol>
        </nav>
        <div className="subpage-title">
          <div>
            <h1>{title}</h1>
            {description && <p className="subpage-description">{description}</p>}
            {meta && <p className="subpage-meta">{meta}</p>}
          </div>
          {actions && <div className="subpage-actions">{actions}</div>}
        </div>
      </div>
      {tabs && (
        <nav className="subpage-tabs" aria-label={`${group.label} 메뉴`}>
          <div className="subpage-inner">
            {group.links.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === "/sandbox"} className={({ isActive }) => (isActive ? "is-active" : undefined)}>{link.label}</NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
