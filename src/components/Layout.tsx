import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import SiteFooter from "./SiteFooter";

/**
 * 모든 화면이 공유하는 틀: 본문 바로가기 → 공통 머리 → 본문(Outlet) → 공통 바닥.
 * 경로가 바뀌면 맨 위로 올린다(해시 이동은 제외). 본문 바로가기는 키보드 첫 Tab 에서만 보인다.
 */
export default function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }); }, [pathname, hash]);
  return (
    <div className="app-page">
      <a className="skip-link" href="#main-content">본문 바로가기</a>
      <Header />
      <div id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}
