import type { LegalBasis } from "../../../api/rights";
import { formatDate } from "../../../lib/format";

/** 근거 조문 한 줄: 법령·조문·확인일 + 국가법령정보센터 원문 링크. */
export default function LegalBasisLine({ basis }: { basis: LegalBasis }) {
  return (
    <p className="rights-basis">
      근거 {basis.law} {basis.article} · 확인 {formatDate(basis.checkedOn)} ·{" "}
      <a href={basis.sourceUrl} target="_blank" rel="noreferrer">법령 원문</a>
    </p>
  );
}
