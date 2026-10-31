import { Link } from "react-router-dom";
import Icon from "../../../components/Icon";

/** 내 모의 여신(S-11)의 다음 행동 줄에 넣는 셀프서비스 바로가기(WP21): 납입 캘린더 · 증명서 발급. */
export default function SelfServiceLinks() {
  return (
    <>
      <Link to="/sandbox/calendar">납입 캘린더 <Icon name="next" size={16} /></Link>
      <Link to="/sandbox/certificates">증명서 발급 <Icon name="next" size={16} /></Link>
    </>
  );
}
