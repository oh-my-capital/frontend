import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Brand from "./Brand";
import Icon from "./Icon";
import { activeMenu, visibleMenus, type NavLinkItem, type NavMenu, type NavMenuKey } from "./nav";

/**
 * 공통 머리(디자인 v3, docs/design/rea-capital-sites.md §4.2).
 * - 유틸리티 줄: 교육용 고지 한 줄 + 금융소비자 권리·고객센터 + 계정 링크.
 * - 메인 줄: 워드마크 + 1단 메뉴(같은 너비 칸). 호버·포커스 시 머리 아래로 화면 너비 전체 메가 메뉴가 열리고,
 *   1단 칸 아래에 그 메뉴의 2단 분류·링크가 같은 격자로 정렬된다. 워드마크 칸에는 가리킨 메뉴의 설명을 쓴다.
 *   키보드: ←/→ 1단 이동, ↓ 그 열의 첫 링크, 열 안에서 ↑/↓, Esc 닫고 1단으로 복귀. 포커스가 메뉴를 떠나면 닫힌다.
 * - 1100px 이하: "전체 메뉴" 버튼 → 전체 화면 드로어(계정 줄 + 1단 아코디언, 현재 메뉴는 펼친 채 시작).
 * 메뉴 정의는 nav.ts 하나. 열림 상태는 연 시점의 경로와 함께 저장해, 경로가 바뀌면 효과 없이 저절로 닫힌다.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === "ADMIN";
  const menus = visibleMenus(isAdmin);
  const current = activeMenu(pathname);

  // 메가 메뉴: 어느 1단을 가리키는지 + 연 시점의 경로
  const [mega, setMega] = useState<{ key: NavMenuKey; path: string } | null>(null);
  const openKey = mega && mega.path === pathname ? mega.key : null;
  const openMega = (key: NavMenuKey) => setMega({ key, path: pathname });
  const closeMega = () => setMega(null);

  // 드로어: 연 시점의 경로 + 펼친 1단 목록
  const [drawer, setDrawer] = useState<{ path: string; expanded: NavMenuKey[] } | null>(null);
  const drawerOpen = !!drawer && drawer.path === pathname;

  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Esc 로 닫으며 1단에 포커스를 돌려줄 때는 onFocus 가 패널을 다시 열지 않게 한 번 막는다.
  const skipFocusOpen = useRef(false);
  const focusItem = (index: number, reopen: boolean) => {
    skipFocusOpen.current = !reopen;
    itemRefs.current[index]?.focus();
    skipFocusOpen.current = false;
  };
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // 드로어가 열려 있는 동안 본문 스크롤을 잠근다.
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.classList.add("is-drawer-open");
    return () => document.body.classList.remove("is-drawer-open");
  }, [drawerOpen]);

  const signOut = async () => {
    setDrawer(null);
    try { await logout(); } catch { /* 로컬 세션은 이미 정리됨 */ }
    navigate("/");
  };

  const toggleDrawer = () => {
    setDrawer(value => (value && value.path === pathname ? null : { path: pathname, expanded: current ? [current.key] : [] }));
  };
  const closeDrawer = (focusToggle = false) => {
    setDrawer(null);
    if (focusToggle) toggleRef.current?.focus();
  };
  const toggleSection = (key: NavMenuKey) => {
    setDrawer(value => {
      if (!value) return value;
      const expanded = value.expanded.includes(key) ? value.expanded.filter(k => k !== key) : [...value.expanded, key];
      return { ...value, expanded };
    });
  };

  // ── 메가 메뉴 키보드 ──
  const columnLinks = (index: number) =>
    Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>(`[data-col="${index}"] a`) ?? []);

  const onItemKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const count = menus.length;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + count) % count;
      // 패널이 닫혀 있었으면(Esc 뒤) 닫힌 채로 옮긴다.
      focusItem(next, openKey !== null);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      openMega(menus[index].key);
      // 패널이 hidden 이었다면 다음 그리기 뒤에 링크가 생긴다.
      window.requestAnimationFrame(() => columnLinks(index)[0]?.focus());
    } else if (event.key === "Escape") {
      closeMega();
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const column = target.closest<HTMLElement>("[data-col]");
    if (!column) return;
    const index = Number(column.dataset.col);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMega();
      focusItem(index, false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const links = columnLinks(index);
    const at = links.indexOf(target as HTMLAnchorElement);
    if (event.key === "ArrowUp" && at <= 0) { focusItem(index, true); return; }
    links[Math.min(links.length - 1, at + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
  };

  const loginTag = (link: NavLinkItem) => (link.login && !user ? <span className="nav-tag">로그인</span> : null);

  const accountLinks = (variant: "utility" | "drawer") => {
    const onNavigate = variant === "drawer" ? () => closeDrawer() : undefined;
    return user ? (
      <>
        <Link to="/settings" className={variant === "drawer" ? "account-email" : "account-email is-strong"} aria-label={`${user.email} 계정 설정`} onClick={onNavigate}>{user.email}</Link>
        <Link to="/sandbox" onClick={onNavigate}>내 샌드박스</Link>
        <Link to="/me/learning" onClick={onNavigate}>내 학습</Link>
        {isAdmin && <Link to="/admin/applications" onClick={onNavigate}>운영</Link>}
        <button type="button" onClick={signOut}>로그아웃</button>
      </>
    ) : (
      <>
        <Link to="/login" className={variant === "drawer" ? "is-primary" : "is-strong"} onClick={onNavigate}>로그인</Link>
        <Link to="/signup" onClick={onNavigate}>가입</Link>
      </>
    );
  };

  const gnbStyle = { "--gnb-cols": menus.length } as CSSProperties;
  const shown: NavMenu | undefined = menus.find(menu => menu.key === openKey);

  return (
    <header className="site-header">
      <div className="site-utility">
        <div className="site-utility-inner">
          <p className="site-utility-note"><strong>교육용 모의 캐피탈</strong>실제 대출을 취급하지 않아요</p>
          <nav className="site-utility-links" aria-label="보조 메뉴">
            <Link to="/support/rights">금융소비자 권리</Link>
            <Link to="/support">고객센터</Link>
            <span className="site-utility-gap" aria-hidden="true" />
            {accountLinks("utility")}
          </nav>
        </div>
      </div>

      <div className="site-header-inner">
        <Brand />
        <nav
          className="gnb"
          aria-label="주요 메뉴"
          style={gnbStyle}
          onMouseLeave={closeMega}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMega(); }}
        >
          <ul className="gnb-list">
            {menus.map((menu, index) => {
              const active = current?.key === menu.key;
              // 1단은 구역 표시라 NavLink 가 아니라 Link 로 aria-current 를 직접 정한다(구역 안이면 "true", 그 화면이면 "page").
              const exact = pathname === menu.to;
              return (
                <li key={menu.key}>
                  <Link
                    ref={element => { itemRefs.current[index] = element; }}
                    to={menu.to}
                    className={`gnb-link${active ? " is-active" : ""}${openKey === menu.key ? " is-open" : ""}`}
                    aria-current={exact ? "page" : active ? "true" : undefined}
                    aria-expanded={openKey !== null}
                    aria-controls="gnb-panel"
                    onMouseEnter={() => openMega(menu.key)}
                    onFocus={() => { if (!skipFocusOpen.current) openMega(menu.key); }}
                    onKeyDown={event => onItemKeyDown(event, index)}
                  >
                    {menu.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div id="gnb-panel" ref={panelRef} className="gnb-panel" hidden={openKey === null} onKeyDown={onPanelKeyDown}>
            <div className="gnb-panel-inner">
              <div className="gnb-intro">
                {shown && (
                  <>
                    <strong>{shown.label}</strong>
                    <p>{shown.description}</p>
                    {shown.note && <p className="gnb-note">{shown.note}</p>}
                  </>
                )}
              </div>
              {menus.map((menu, index) => (
                <div key={menu.key} data-col={index} className={`gnb-col${openKey === menu.key ? " is-current" : ""}`} onMouseEnter={() => openMega(menu.key)}>
                  {menu.groups.map(group => (
                    <div key={group.label} className="gnb-group">
                      <p className="gnb-group-label">{group.label}</p>
                      <ul>
                        {group.links.map(link => (
                          <li key={link.to}>
                            <NavLink to={link.to} end onClick={closeMega}>{link.label}{loginTag(link)}</NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </nav>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={drawerOpen}
          aria-controls="site-drawer"
          onClick={toggleDrawer}
          onKeyDown={event => { if (event.key === "Escape" && drawerOpen) closeDrawer(true); }}
        >
          <Icon name={drawerOpen ? "close" : "menu"} size={20} />
          {drawerOpen ? "메뉴 닫기" : "전체 메뉴"}
        </button>
      </div>

      <div
        id="site-drawer"
        className="site-drawer"
        hidden={!drawerOpen}
        onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeDrawer(true); } }}
      >
        <div className="drawer-inner">
          <nav className="drawer-account" aria-label="계정">{accountLinks("drawer")}</nav>
          <nav aria-label="전체 메뉴">
            <ul className="drawer-menus">
              {menus.map(menu => {
                const expanded = !!drawer?.expanded.includes(menu.key);
                return (
                  <li key={menu.key}>
                    <button type="button" className="drawer-toggle" aria-expanded={expanded} aria-controls={`drawer-${menu.key}`} onClick={() => toggleSection(menu.key)}>
                      <span>{menu.label}{current?.key === menu.key && <span className="drawer-current">현재 메뉴</span>}</span>
                      <Icon name="down" size={20} />
                    </button>
                    <div id={`drawer-${menu.key}`} className="drawer-panel" hidden={!expanded}>
                      <p className="drawer-desc">{menu.description}</p>
                      {menu.groups.map(group => (
                        <div key={group.label} className="drawer-group">
                          <p className="drawer-group-label">{group.label}</p>
                          <ul>
                            {group.links.map(link => (
                              <li key={link.to}>
                                <NavLink to={link.to} end onClick={() => closeDrawer()}>{link.label}{loginTag(link)}</NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {menu.note && <p className="drawer-note">{menu.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="drawer-foot">
            <p>교육용 모의 캐피탈이에요. 실제 대출·중개·광고가 아니고, 실명·실계좌·신용조회·추심을 하지 않아요.</p>
            <nav aria-label="권리·안내">
              <Link to="/support/rights" onClick={() => closeDrawer()}>금융소비자 권리 안내</Link>
              <Link to="/methodology" onClick={() => closeDrawer()}>계산 규칙(방법론)</Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
