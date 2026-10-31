import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import { SUBPAGE_SECTIONS, type SubPageSection, type SubPageSectionKey } from "./nav";

type Props = {
  /** 묶음 키(learn·calculators·sandbox·admin·account, v3에서 products·support 추가). 목록은 nav.ts SUBPAGE_SECTIONS. */
  section: SubPageSectionKey;
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

/**
 * 하위 화면 머리(디자인 v3, rea-capital-sites.md §4.4): 흰 위치 표시 띠(홈 > 1단 메뉴 > 화면) → 제목 띠(큰 제목 + 설명 + 행동) → 같은 묶음 탭.
 * 탭·위치 표시는 nav.ts 에서 만든다 — 메뉴에 화면을 더하면 여기에 저절로 생긴다. 탭이 하나뿐인 묶음은 탭 줄을 그리지 않는다.
 * props 는 v2와 같다(하위 호환).
 */
export default function SubPageHeader({ section, current, title, description, meta, actions, detail, tabs = true }: Props) {
  const group: SubPageSection = SUBPAGE_SECTIONS[section];
  const currentLabel = group.links.find(link => link.to === current)?.label ?? title;
  const showTabs = tabs && group.links.length > 1;
  const showGroupCrumb = group.to !== current || !!detail;
  return (
    <div className="subpage-head">
      <div className="subpage-crumbs">
        <nav className="subpage-inner crumbs" aria-label="현재 위치">
          <ol>
            <li><Link to="/" className="crumbs-home"><Icon name="home" size={16} /><span>홈</span></Link></li>
            {showGroupCrumb ? <li><Link to={group.to}>{group.label}</Link></li> : <li>{group.label}</li>}
            {detail
              ? <><li><Link to={current}>{currentLabel}</Link></li><li aria-current="page">{detail}</li></>
              : <li aria-current="page">{currentLabel}</li>}
          </ol>
        </nav>
      </div>
      <div className="subpage-inner subpage-band">
        <div className="subpage-title">
          <div>
            <h1>{title}</h1>
            {description && <p className="subpage-description">{description}</p>}
            {meta && <p className="subpage-meta">{meta}</p>}
          </div>
          {actions && <div className="subpage-actions">{actions}</div>}
        </div>
      </div>
      {showTabs && (
        <nav className="subpage-tabs" aria-label={`${group.label} 메뉴`}>
          <div className="subpage-inner">
            {group.links.map(link => (
              // 상세 화면(계약 상세 등)에서는 current 로 넘긴 상위 목록 탭을 켠다.
              <NavLink key={link.to} to={link.to} end={link.to === "/sandbox" || link.to === "/support"} className={({ isActive }) => (isActive || link.to === current ? "is-active" : undefined)}>{link.label}</NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
