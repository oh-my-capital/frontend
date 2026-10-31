import { useEffect, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { applyLink, productsApi, scheduleLink, type ProductGuideDetail } from "../../api/products";
import Disclosure from "../../components/Disclosure";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import { setDocumentTitle } from "../../components/PageTitle";
import { formatNumber } from "../../lib/format";
import { EMPLOYMENT_LABEL, METHOD_LABEL, pct } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";
import { ProductsHead, ProductsNotice } from "./parts";
import { employmentText, methodsText, rateRangeText, termRangeText } from "./text";
import "../../styles/products.css";

/** 요약 조건표(시중 상품 페이지의 "상품 개요" 자리). 숫자는 서버 응답 그대로. */
function ConditionTable({ p }: { p: ProductGuideDetail }) {
  return (
    <table className="table products-conditions">
      <caption>요약 조건<span className="table-caption-note">규칙 세트 {p.disclosure.ruleSetVersion}의 교육용 가정값이다. 실제 금리·한도는 심사 결과로 정해진다.</span></caption>
      <tbody>
        <tr><th scope="row">대상</th><td>{p.target}</td></tr>
        <tr><th scope="row">상품 유형</th><td>{p.categoryLabel} — {p.categoryDescription}</td></tr>
        <tr><th scope="row">금리(연)</th><td><strong className="products-figure">{rateRangeText(p.rateRange.min, p.rateRange.max)}</strong><span className="products-sub">{p.rateRange.basis}</span></td></tr>
        <tr><th scope="row">한도</th><td>{p.amountRange.label}<span className="products-sub">실제 한도 = min(상품 최대{p.requiresCollateral ? "(차량가 × LTV)" : ""}, 소득배수, DSR 역산), 만 원 절사</span></td></tr>
        <tr><th scope="row">기간</th><td>{p.allowedTerms.join("·")}회 <span className="faint">({termRangeText(p.allowedTerms)})</span></td></tr>
        <tr><th scope="row">상환 방식</th><td>{methodsText(p.allowedMethods)}</td></tr>
        <tr><th scope="row">중도상환수수료</th><td>상환 원금 × {pct(p.prepaymentFeeRate)} × 잔존일수 ÷ 대출기간 일수<span className="products-sub">실행 후 {p.prepaymentFeeWaiverYears}년이 지나면 받지 않는다(금융소비자보호법).</span></td></tr>
        <tr><th scope="row">담보·LTV</th><td>{p.requiresCollateral ? `차량 담보 · LTV ${pct(p.amountRange.ltvRate ?? 0)}` : "담보 없음"}</td></tr>
        <tr><th scope="row">고용 조건</th><td>{employmentText(p.eligibleEmployment)}</td></tr>
      </tbody>
    </table>
  );
}

/** 대표 예시 표: 조건 → 대표 금리 구성 → 월 납입·첫/마지막 회·총이자·총상환액. */
function RepresentativeTable({ p }: { p: ProductGuideDetail }) {
  const r = p.representative;
  return (
    <table className="table products-example">
      <caption>대표 예시<span className="table-caption-note">{r.conditions}. 서버가 상환 스케줄 엔진으로 계산했다.</span></caption>
      <tbody>
        <tr><th scope="row">대출 금액</th><td className="num"><Money value={r.amount} /></td></tr>
        {r.vehicleValue !== null && <tr><th scope="row">차량가(대표)</th><td className="num"><Money value={r.vehicleValue} /></td></tr>}
        <tr><th scope="row">기간 · 상환 방식</th><td className="num">{r.termMonths}회 · {METHOD_LABEL[r.repaymentMethod]}</td></tr>
        <tr><th scope="row">가정한 고객</th><td className="num">신용점수 {r.scoreRange}(밴드 {r.creditBand}){r.employmentType ? ` · ${EMPLOYMENT_LABEL[r.employmentType]}` : ""} · {r.autoDebit ? "자동이체 우대 적용" : "자동이체 우대 없음"}</td></tr>
        <tr>
          <th scope="row">대표 금리(연)</th>
          <td className="num"><strong className="products-figure">{pct(r.rate)}</strong><span className="products-sub">기준 {pct(r.baseRate)} + 밴드 {r.creditBand} 가산 {pct(r.spread)}p − 우대 {pct(r.discount)}p{r.rateCapped ? " · 법정 최고금리로 상한 적용" : ""}</span></td>
        </tr>
        {r.monthlyPayment !== null
          ? <tr><th scope="row">월 납입액</th><td className="num"><Money value={r.monthlyPayment} strong /></td></tr>
          : <tr><th scope="row">첫 회 납입액</th><td className="num"><Money value={r.firstPayment} strong /></td></tr>}
        <tr><th scope="row">마지막 회 납입액</th><td className="num"><Money value={r.lastPayment} /><span className="products-sub">절사 누적 보정으로 몇 원 다를 수 있다</span></td></tr>
        <tr><th scope="row">총이자</th><td className="num"><Money value={r.totalInterest} strong /></td></tr>
        <tr><th scope="row">총상환액</th><td className="num"><Money value={r.totalPayment} strong /><span className="products-sub">원금 {formatNumber(r.amount)}원 + 총이자</span></td></tr>
        <tr><th scope="row">규칙 버전</th><td className="num">규칙 세트 {r.ruleSetVersion}</td></tr>
      </tbody>
    </table>
  );
}

/**
 * 상품 상세(S-231): 머리 → 교육용 모의 상품 고지 → 핵심 수치 줄 → 요약 조건표 → 대표 예시 표 + Disclosure + "이 조건으로 계산"·"모의 신청"
 * → 신용점수별 금리 표 → 우대 표 → 필요 조건(교육용) → 유의사항. 시중 캐피탈 상품 페이지의 순서를 따르되 광고·권유 문구를 쓰지 않는다.
 */
export default function ProductDetailPage() {
  const { code = "" } = useParams();
  const detail = useLoad<ProductGuideDetail>(signal => productsApi.detail(code, signal), [code]);
  const p = detail.data;

  useEffect(() => { setDocumentTitle(p ? `${p.name} · 상품 안내` : "상품 상세"); }, [p]);

  const notFound = detail.error instanceof ApiError && detail.error.status === 404;

  return (
    <>
      <ProductsHead
        title={p?.name ?? "상품 상세"}
        detail={p?.name ?? code}
        description={p?.description}
        meta={p ? <>{p.categoryLabel} · 규칙 세트 {p.disclosure.ruleSetVersion} · 상품 코드 {p.code}</> : undefined}
      />
      <main className="page-main products">
        {notFound ? (
          <EmptyState title="이 상품을 찾을 수 없어요" description={`상품 코드 ${code}는 교육용 모의 상품 목록에 없어요. 목록에서 다시 골라요.`} action={{ to: "/products", label: "상품 목록으로" }} />
        ) : detail.error ? <LoadError error={detail.error} onRetry={detail.reload} /> : !p || detail.loading ? <Loading message="상품 조건과 대표 예시를 불러오고 있어요" minHeight={360} /> : (
          <>
            <ProductsNotice notice={p.notice} />
            <dl className="figure-row products-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
              <div><dt>금리(연)</dt><dd>{pct(p.rateRange.min)}<small>~ {pct(p.rateRange.max)}</small></dd></div>
              {p.amountRange.max !== null
                ? <div><dt>최대 한도</dt><dd className="products-figure-text"><Money value={p.amountRange.max} /><small>{formatNumber(p.amountRange.min)}원부터</small></dd></div>
                : <div><dt>한도(차량가 대비 LTV)</dt><dd>{formatNumber(p.amountRange.ltvRate ?? 0)}<span className="money-unit">%</span><small>{formatNumber(p.amountRange.min)}원부터</small></dd></div>}
              <div><dt>최대 기간</dt><dd>{p.allowedTerms[p.allowedTerms.length - 1]}<span className="money-unit">회</span></dd></div>
              <div><dt>대표 예시 월 납입</dt><dd className="accent"><Money value={p.representative.monthlyPayment ?? p.representative.firstPayment} /><small>연 {pct(p.representative.rate)}</small></dd></div>
            </dl>

            <div className="page-grid">
              <div className="products-main">
                <section aria-labelledby="products-conditions-title">
                  <div className="section-head"><div><h2 id="products-conditions-title">요약 조건표</h2><p>대상·금리·한도·기간·상환 방식·수수료를 한 표에 모았어요.</p></div></div>
                  <div className="table-scroll"><ConditionTable p={p} /></div>
                </section>

                <section aria-labelledby="products-example-title">
                  <div className="section-head"><div><h2 id="products-example-title">대표 예시</h2><p>한 가지 가정 조건으로 계산한 상환 예시예요. 조건이 다르면 금리와 납입액이 달라져요.</p></div></div>
                  <div className="table-scroll"><RepresentativeTable p={p} /></div>
                  <Disclosure data={p.disclosure} />
                  <div className="products-actions">
                    <Link to={scheduleLink(p.representative)} className="btn btn-secondary"><Icon name="calculator" size={16} /> 이 조건으로 계산</Link>
                    <Link to={applyLink(p.code)} className="btn btn-primary">모의 신청 <Icon name="next" size={16} /></Link>
                    <span className="faint">모의 신청은 로그인 후 내 샌드박스에서 해요. 실제 대출 신청이 아니에요.</span>
                  </div>
                </section>

                <section aria-labelledby="products-bands-title">
                  <div className="section-head"><div><h2 id="products-bands-title">신용점수별 금리</h2><p>기준금리 {pct(p.baseRate)}에 밴드별 가산금리를 더한 금리예요(우대 전). 600점 미만은 자격 규칙에서 거절돼요.</p></div></div>
                  <div className="table-scroll">
                    <table className="table products-bands">
                      <caption>밴드별 가산금리와 금리<span className="table-caption-note">금리 = min(기준금리 + 가산, 20.00%). 소득배수는 한도 계산(연소득 × 배수)에 쓴다.</span></caption>
                      <thead><tr><th scope="col">밴드</th><th scope="col">신용점수</th><th scope="col" className="num">가산금리</th><th scope="col" className="num">금리(우대 전)</th><th scope="col" className="num">소득배수</th></tr></thead>
                      <tbody>
                        {p.bandRates.map(b => (
                          <tr key={b.band} className={b.band === p.representative.creditBand ? "is-current" : undefined}>
                            <th scope="row">{b.band}{b.band === p.representative.creditBand && <span className="products-sub">대표 예시 밴드</span>}</th>
                            <td>{b.minScore}~{b.maxScore}점</td>
                            <td className="num">+{pct(b.spread)}p</td>
                            <td className="num">{pct(b.rate)}</td>
                            <td className="num">{b.incomeMultiple.toFixed(1)}배</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section aria-labelledby="products-discounts-title">
                  <div className="section-head"><div><h2 id="products-discounts-title">우대 금리</h2><p>조건을 만족하면 적용 금리에서 빼요. 여러 우대를 함께 받을 수 있어요.</p></div></div>
                  <div className="table-scroll">
                    <table className="table products-discounts">
                      <caption>우대 항목 {p.discounts.length}개</caption>
                      <thead><tr><th scope="col">우대</th><th scope="col" className="num">금리 차감</th><th scope="col">조건</th></tr></thead>
                      <tbody>
                        {p.discounts.map(d => (
                          <tr key={d.code}><th scope="row">{d.label}</th><td className="num">−{pct(d.rate)}p</td><td>{d.condition}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section aria-labelledby="products-requirements-title">
                  <div className="section-head"><div><h2 id="products-requirements-title">필요 조건(교육용)</h2><p>모의 신청에 필요한 것이에요. 실제 서류 제출·신용조회는 없어요.</p></div></div>
                  <ol className="products-list">{p.requirements.map(item => <li key={item}>{item}</li>)}</ol>
                </section>

                <section aria-labelledby="products-notes-title">
                  <div className="section-head"><div><h2 id="products-notes-title">유의사항</h2></div></div>
                  <ul className="products-list products-notes">{p.notes.map(item => <li key={item}>{item}</li>)}</ul>
                </section>
              </div>

              <aside aria-label="안내">
                <div className="panel">
                  <h3>이 화면의 숫자</h3>
                  <p className="muted products-aside-text">금리 범위·밴드별 금리·대표 예시는 모두 규칙 세트 {p.disclosure.ruleSetVersion}의 수치로 서버가 계산한 결과예요. 화면에 고정해 둔 숫자는 없어요.</p>
                  <Link to="/methodology" className="panel-link">방법론에서 규칙 세트 보기 <Icon name="next" size={16} /></Link>
                </div>
                <div className="panel panel-soft">
                  <h3>내 조건이면?</h3>
                  <p className="muted products-aside-text">신용점수·소득·기존 부채를 넣으면 이 상품의 적용 금리와 한도를 규칙별 근거와 함께 볼 수 있어요.</p>
                  <Link to="/calculators/screening" className="panel-link">심사 시뮬레이터 <Icon name="next" size={16} /></Link>
                </div>
              </aside>
            </div>
          </>
        )}
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/products"><Icon name="prev" size={16} /> 상품 목록으로</Link>
          {p && <Link to={scheduleLink(p.representative)}>이 조건으로 상환 스케줄 계산 <Icon name="next" size={16} /></Link>}
          {p && <Link to={applyLink(p.code)}>모의 여신에서 {p.name} 신청해 보기 <Icon name="next" size={16} /></Link>}
        </nav>
      </main>
    </>
  );
}
