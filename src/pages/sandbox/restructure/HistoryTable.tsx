import { RESTRUCTURE_LABEL, type ContractModification } from "../../../api/restructure";
import Money from "../../../components/Money";
import { formatDate } from "../../../lib/format";

/** 적용 이력(S-182): 영업일·종류·개월·사유·전→후 월 납입액·만기일. 최신순. */
export default function HistoryTable({ items }: { items: ContractModification[] }) {
  return (
    <div className="table-scroll">
      <table className="table table-compact restructure-history restructure-stack restructure-stack-2">
        <caption>적용 이력 {items.length}건<span className="table-caption-note">적용할 때마다 이전·이후 조건을 남기고 사건 타임라인에도 기록한다.</span></caption>
        <thead>
          <tr>
            <th scope="col">적용 영업일</th><th scope="col">종류</th><th scope="col" className="num">개월</th><th scope="col">사유</th>
            <th scope="col" className="num">월 납입액 전 → 후</th><th scope="col" className="num">만기일 전 → 후</th>
          </tr>
        </thead>
        <tbody>
          {items.map(m => (
            <tr key={m.id}>
              <td data-label="적용 영업일">{formatDate(m.businessDate)}</td>
              <th scope="row">{RESTRUCTURE_LABEL[m.type]}</th>
              <td data-label="개월" className="num">{m.months}개월</td>
              <td data-label="사유">{m.reasonLabel}</td>
              <td data-label="월 납입액 전 → 후" className="num"><Money value={m.before.monthlyPayment} /> → <Money value={m.after.monthlyPayment} strong /></td>
              <td data-label="만기일 전 → 후" className="num">{formatDate(m.before.maturityDate)} → {formatDate(m.after.maturityDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
