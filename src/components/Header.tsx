import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Brand from "./Brand";

/** 아래 줄 굵은 메뉴 5개(ui-guidelines §5). 활성 판단은 하위 경로까지 포함한다. */
const MENU = [
  { to: "/course", label: "배우기", match: ["/course", "/learn", "/me/learning"] },
  { to: "/glossary", label: "용어 사전", match: ["/glossary"] },
  { to: "/calculators/schedule", label: "계산기", match: ["/calculators"] },
  { to: "/sandbox", label: "모의 여신", match: ["/sandbox"] },
  { to: "/methodology", label: "방법론", match: ["/methodology"] },
];

/**
 * 공통 머리. 위 보조 링크 줄(36px: 로그인·내 샌드박스·운영) + 아래 굵은 메뉴(76px). 현재 메뉴는 아래 3px 선.
 * 1380px 이하에서 햄버거로 접고, 접힌 상태에는 보조 링크를 메뉴 안으로 옮긴다. 경로가 바뀌면 닫는다.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const signOut = async () => {
    setOpen(false);
    try { await logout(); } catch { /* 로컬 세션은 이미 정리됨 */ }
    navigate("/");
  };

  const utility = user ? (
    <>
      <Link to="/settings" className="account-email" aria-label={`${user.email} 계정 설정`} onClick={close}>{user.email}</Link>
      <Link to="/sandbox" onClick={close}>내 샌드박스</Link>
      <Link to="/me/learning" onClick={close}>내 학습</Link>
      {user.role === "ADMIN" && <Link to="/admin/applications" onClick={close}>운영</Link>}
      <button type="button" onClick={signOut}>로그아웃</button>
    </>
  ) : (
    <>
      <Link to="/login" onClick={close}>로그인</Link>
      <Link to="/signup" onClick={close}>가입</Link>
    </>
  );

  return (
    <header className="site-header">
      <div className="site-utility">
        <nav className="site-utility-inner" aria-label="계정">
          {utility}
        </nav>
      </div>
      <div className="site-header-inner">
        <Brand />
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(v => !v)}>
          <span className={`menu-lines${open ? " is-open" : ""}`} aria-hidden="true"><i /><i /></span>
          {open ? "메뉴 닫기" : "전체 메뉴"}
        </button>
        <nav id="site-nav" className={`site-nav${open ? " is-open" : ""}`} aria-label="주요 메뉴">
          {MENU.map(item => {
            const active = item.match.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
            return (
              <NavLink key={item.to} to={item.to} className={`site-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={close}>
                {item.label}
              </NavLink>
            );
          })}
          <span className="site-nav-account">{utility}</span>
        </nav>
      </div>
    </header>
  );
}
