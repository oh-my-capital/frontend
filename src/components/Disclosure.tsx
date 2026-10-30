import { Link } from "react-router-dom";
import type { Disclosure as DisclosureData } from "../api/types";

/**
 * 모든 계산 결과 바로 아래 한 줄(ui-guidelines §6):
 * "교육용 모의 계산이며 실제 대출 조건이 아닙니다. 규칙 v1 · 계산 v1 · 365일 기준 · 이자 절사" + 방법론 링크.
 * API 응답의 disclosure 를 그대로 넘긴다. 없으면 기본 문구를 쓴다.
 */
export default function Disclosure({ data }: { data?: DisclosureData | null }) {
  const notice = data?.notice ?? "교육용 모의 계산이며 실제 대출 조건이 아닙니다.";
  const parts = [
    `규칙 ${data?.ruleSetVersion ?? "v1"}`,
    `계산 ${data?.calcVersion ?? "v1"}`,
    `${data?.dayCountBasis ?? 365}일 기준`,
    data?.rounding ?? "이자 절사",
  ];
  return (
    <p className="disclosure">
      <span>{notice}</span>
      <span>{parts.join(" · ")}</span>
      <Link to="/methodology">방법론 보기</Link>
    </p>
  );
}
