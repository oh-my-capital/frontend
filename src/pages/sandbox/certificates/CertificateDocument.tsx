import type { Certificate, TransactionsSection, BalanceSection, PayoffSection } from "../../../api/certificates";
import Disclosure from "../../../components/Disclosure";
import Money from "../../../components/Money";
import { ContractStatusChip } from "../../../components/StatusChip";
import { formatDate } from "../../../lib/format";
import { ASSET_CLASS_LABEL, METHOD_LABEL, pct, TX_TYPE_LABEL } from "../../calculators/parts/labels";
import { EDU_NOTICE } from "./labels";

/**
 * 증명서 본문(S-210 미리보기·S-211 인쇄용 공용). 문서 머리(종류·발급번호·발급 영업일·명의) → 계약 정보 → 종류별 본문 → 고지.
 * 워터마크와 위·아래 고지가 "교육용 모의 문서 — 법적 효력 없음"을 세 번 반복한다(색이 아니라 글자로). 실명·주민번호·주소 칸은 없다.
 */
export default function CertificateDocument({ data, headingId }: { data: Certificate; headingId: string }) {
  const { issue, holder, contract: c } = data;
  return (
    <article className="cert-doc" aria-labelledby={headingId}>
      <div className="cert-watermark" aria-hidden="true"><span>{EDU_NOTICE}</span><span>{EDU_NOTICE}</span><span>{EDU_NOTICE}</span></div>
      <p className="cert-flag">{EDU_NOTICE}</p>
      <header className="cert-head">
        <h2 id={headingId}>{issue.typeName}</h2>
        <dl className="cert-meta">
          <div><dt>발급번호</dt><dd className="num">{issue.issueNo}</dd></div>
          <div><dt>발급 영업일</dt><dd>{formatDate(issue.issuedOn)}</dd></div>
          <div><dt>명의</dt><dd>{holder.label} ({holder.maskedEmail})</dd></div>
        </dl>
      </header>

      <section className="cert-section" aria-label="계약 정보">
        <h3>계약 정보</h3>
        <dl className="def-list cert-contract">
          <div><dt>계약번호</dt><dd>{c.contractNo}</dd></div>
          <div><dt>상품</dt><dd>{c.productName}</dd></div>
          <div><dt>실행일</dt><dd>{formatDate(c.startDate)}</dd></div>
          <div><dt>실행 원금</dt><dd><Money value={c.principal} /></dd></div>
          <div><dt>약정 조건</dt><dd>연 {pct(c.contractRate)} · {c.termMonths}회 · {METHOD_LABEL[c.repaymentMethod] ?? c.repaymentMethod} · 만기 {formatDate(c.maturityDate)}</dd></div>
          <div><dt>상태</dt><dd className="cert-status"><ContractStatusChip status={c.status} /><span>건전성 {ASSET_CLASS_LABEL[c.assetClass] ?? c.assetClass}</span></dd></div>
        </dl>
      </section>

      {data.balance && <BalanceBody b={data.balance} />}
      {data.payoff && <PayoffBody p={data.payoff} principal={c.principal} />}
      {data.transactions && <TransactionsBody t={data.transactions} />}

      <p className="cert-notice">{data.notice}</p>
      <p className="cert-issuer">CapiMATE 교육용 모의 여신 샌드박스에서 만든 예시 문서예요. 금액은 이 샌드박스의 가상 원장에서 다시 계산한 값이고, 발급 영업일은 샌드박스의 가상 오늘이에요.</p>
      <Disclosure data={data.disclosure} />
    </article>
  );
}

function BalanceBody({ b }: { b: BalanceSection }) {
  return (
    <section className="cert-section" aria-label="잔액 내역">
      <h3>{formatDate(b.asOf)} 기준 잔액</h3>
      <table className="table table-compact cert-table">
        <caption>부채 잔액<span className="table-caption-note">미납은 실제 납입일이 지났는데 내지 않은 회차 {b.unpaidInstallments}개의 합이다{b.acceleratedOn ? `(기한이익상실 ${formatDate(b.acceleratedOn)} 이후 청구 이자는 고정)` : ""}.</span></caption>
        <tbody>
          <tr><th scope="row">잔여 원금</th><td className="num"><Money value={b.outstandingPrincipal} /></td></tr>
          <tr><th scope="row">미납 원금</th><td className="num"><Money value={b.unpaidPrincipal} /></td></tr>
          <tr><th scope="row">미납 이자</th><td className="num"><Money value={b.unpaidInterest} /></td></tr>
          {b.acceleratedPrincipal > 0 && <tr><th scope="row">기한이익상실 청구 원금</th><td className="num"><Money value={b.acceleratedPrincipal} /></td></tr>}
          <tr><th scope="row">연체이자</th><td className="num"><Money value={b.overdueInterest} /></td></tr>
          <tr><th scope="row">연체일수</th><td className="num">{b.overdueDays}일</td></tr>
        </tbody>
        <tfoot><tr><th scope="row">지금 갚을 금액</th><td className="num"><Money value={b.amountDueNow} strong /></td></tr></tfoot>
      </table>
      <p className="cert-note">잔여 원금은 오늘 전부 갚을 때의 금액이 아니에요. 전액 중도상환에는 경과이자와 중도상환수수료가 더해지며, 그 금액은 계약 상세의 중도상환 견적에서 확인해요.</p>
    </section>
  );
}

function PayoffBody({ p, principal }: { p: PayoffSection; principal: number }) {
  return (
    <section className="cert-section" aria-label="완납 내역">
      <h3>{formatDate(p.closedOn)} 완제</h3>
      <p className="cert-statement">위 계약의 원금 <Money value={principal} />을 모두 갚아 {formatDate(p.closedOn)}에 완제되었음을 (모의로) 확인해요.
        {p.finalTransactionType && <> 마지막 거래는 {formatDate(p.finalTransactionDate)} {TX_TYPE_LABEL[p.finalTransactionType] ?? p.finalTransactionType}이에요.</>}</p>
      <table className="table table-compact cert-table">
        <caption>총 납입 내역<span className="table-caption-note">상환 거래 {p.transactionCount}건의 합. 총 납입액 = 원금 + 이자 + 연체이자 + 수수료.</span></caption>
        <tbody>
          <tr><th scope="row">총 납입 원금</th><td className="num"><Money value={p.totalPrincipal} /></td></tr>
          <tr><th scope="row">총 납입 이자</th><td className="num"><Money value={p.totalInterest} /></td></tr>
          <tr><th scope="row">총 납입 연체이자</th><td className="num"><Money value={p.totalOverdueInterest} /></td></tr>
          <tr><th scope="row">총 납입 수수료</th><td className="num"><Money value={p.totalFee} /></td></tr>
        </tbody>
        <tfoot><tr><th scope="row">총 납입액</th><td className="num"><Money value={p.totalPaid} strong /></td></tr></tfoot>
      </table>
    </section>
  );
}

function TransactionsBody({ t }: { t: TransactionsSection }) {
  return (
    <section className="cert-section" aria-label="거래 내역">
      <h3>{formatDate(t.from)} ~ {formatDate(t.to)} 거래</h3>
      <dl className="def-list cert-contract">
        <div><dt>기간 시작 잔여 원금</dt><dd><Money value={t.openingPrincipal} /></dd></div>
        <div><dt>기간 끝 잔여 원금</dt><dd><Money value={t.closingPrincipal} /></dd></div>
      </dl>
      {t.rows.length === 0 ? <p className="cert-note">이 기간에는 상환 거래가 없어요. 대출 실행 입금은 상환 거래가 아니라 계약 정보의 실행일·실행 원금으로 보여요.</p> : (
        <div className="table-scroll cert-scroll">
          <table className="table table-compact cert-table">
            <caption>상환 거래 {t.totals.count}건<span className="table-caption-note">변제충당 순서: 수수료 → 연체이자 → 이자 → 원금. 거래 후 잔액은 남은 원금이다.</span></caption>
            <thead>
              <tr>
                <th scope="col">거래일</th><th scope="col">종류 · 충당 회차</th><th scope="col" className="num">총액</th><th scope="col" className="num">수수료</th>
                <th scope="col" className="num">연체이자</th><th scope="col" className="num">이자</th><th scope="col" className="num">원금</th><th scope="col" className="num">거래 후 잔액</th>
              </tr>
            </thead>
            <tbody>
              {t.rows.map(r => (
                <tr key={r.id}>
                  <th scope="row" className="nowrap">{formatDate(r.businessDate)}</th>
                  <td>{TX_TYPE_LABEL[r.type] ?? r.type}{r.allocations.length > 0 && <span className="cert-alloc">{r.allocations.map(a => `${a.installmentNo}회`).join(" · ")}</span>}</td>
                  <td className="num"><Money value={r.totalAmount} /></td>
                  <td className="num"><Money value={r.fee} /></td>
                  <td className="num"><Money value={r.overdueInterest} /></td>
                  <td className="num"><Money value={r.interest} /></td>
                  <td className="num"><Money value={r.principal} /></td>
                  <td className="num"><Money value={r.principalAfter} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>기간 합계</th>
                <td className="num"><Money value={t.totals.totalAmount} strong /></td>
                <td className="num"><Money value={t.totals.fee} /></td>
                <td className="num"><Money value={t.totals.overdueInterest} /></td>
                <td className="num"><Money value={t.totals.interest} /></td>
                <td className="num"><Money value={t.totals.principal} /></td>
                <td className="num"><Money value={t.closingPrincipal} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
