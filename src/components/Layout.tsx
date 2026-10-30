import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import SiteFooter from "./SiteFooter";

/** 모든 화면이 공유하는 틀: 공통 머리 + 본문(Outlet) + 공통 푸터. 경로가 바뀌면 맨 위로 올린다(해시 이동은 제외). */
export default function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo({ top: 0 }); }, [pathname, hash]);
  return (
    <div className="app-page">
      <Header />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
