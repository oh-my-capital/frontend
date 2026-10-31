import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productsApi, type ProductCatalog, type ProductGuideSummary } from "../../api/products";
import Disclosure from "../../components/Disclosure";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import { setDocumentTitle } from "../../components/PageTitle";
import Tabs from "../../components/Tabs";
import { formatNumber } from "../../lib/format";
import { METHOD_LABEL, pct } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";
import { ProductsHead, ProductsNotice } from "./parts";
import { employmentText, methodsText, rateRangeText, termRangeText } from "./text";
import "../../styles/products.css";

const ALL = "ALL";

/** 상품 요약표 한 묶음(유형 탭 하나의 내용). 금리 범위·대표 예시는 서버 계산값 그대로. */
function SummaryTable({ products, caption }: { products: ProductGuideSummary[]; caption: string }) {
  return (
    <div className="table-scroll">
      <table className="table products-table">
        <caption>{caption}<span className="table-caption-note">금리는 연이율, 대표 예시 월 납입은 아래 산정 기준의 조건으로 계산한 원리금균등 월 납입액이다.</span></caption>
        <thead>
          <tr>
            <th scope="col">상품</th>
            <th scope="col" className="num">금리(연)</th>
            <th scope="col">한도</th>
            <th scope="col">기간</th>
            <th scope="col">상환 방식</th>
            <th scope="col" className="num">대표 예시 월 납입</th>
            <th scope="col"><span className="sr-only">상세</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.code}>
              <th scope="row">
                <Link to={`/products/${p.code}`} className="products-name">{p.name}</Link>
                <span className="products-sub">{p.target}</span>
                {p.eligibleEmployment.length > 0 && <span className="products-sub">고용 조건: {employmentText(p.eligibleEmployment)}</span>}
              </th>
              <td className="num products-nowrap">{rateRangeText(p.rateRange.min, p.rateRange.max)}</td>
              <td className="products-amount">
                <span>{formatNumber(p.amountRange.min)}원 ~</span>{" "}
                <span>{p.amountRange.max !== null ? `${formatNumber(p.amountRange.max)}원` : `차량가의 ${formatNumber(p.amountRange.ltvRate ?? 0)}%`}</span>
              </td>
              <td className="products-nowrap">{termRangeText(p.allowedTerms)}</td>
              <td>{methodsText(p.allowedMethods)}</td>
              <td className="num">
                <Money value={p.representative.monthlyPayment ?? p.representative.firstPayment} strong />
                <span className="products-sub">{formatNumber(p.representative.amount)}원 · {p.representative.termMonths}회 · 연 {pct(p.representative.rate)}</span>
              </td>
              <td><Link to={`/products/${p.code}`} className="products-more" aria-label={`${p.name} 상세 보기`}>상세 <Icon name="next" size={16} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 상품 안내 목록(S-230): 머리 → 교육용 모의 상품 고지 → 유형 탭(전체·신용대출·자동차 금융, ?type= 쿼리와 동기) → 상품 요약표
 * → 대표 예시 산정 기준 → Disclosure. 숫자는 GET /products 응답(규칙 세트 밴드·상환 스케줄 엔진 계산)을 그대로 쓴다.
 */
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const catalog = useLoad<ProductCatalog>(signal => productsApi.list(undefined, signal), []);
  const data = catalog.data;
  const requested = params.get("type") ?? ALL;
  const type = data && requested !== ALL && !data.categories.some(c => c.code === requested) ? ALL : requested;

  useEffect(() => { setDocumentTitle("상품 안내"); }, []);

  const tabs = data ? [
    { id: ALL, label: `전체 ${data.products.length}`, content: <SummaryTable products={data.products} caption={`상품 ${data.products.length}개 · 전체`} /> },
    ...data.categories.map(c => {
      const items = data.products.filter(p => p.category === c.code);
      return {
        id: c.code,
        label: `${c.label} ${c.count}`,
        content: (
          <>
            <p className="products-category-note">{c.description}</p>
            <SummaryTable products={items} caption={`${c.label} 상품 ${items.length}개`} />
          </>
        ),
      };
    }),
  ] : [];

  return (
    <>
      <ProductsHead
        title="상품 안내"
        description="교육용 모의 상품의 대상·금리 범위·한도·기간·상환 방식을 한 표에서 비교해요. 금리 범위는 규칙 세트의 신용점수 밴드로, 대표 예시는 같은 규칙과 상환 스케줄 엔진으로 서버가 계산한 값이에요."
        meta={data ? <>규칙 세트 {data.disclosure.ruleSetVersion} · 상품 {data.products.length}개 · 유형 {data.categories.length}개</> : undefined}
      />
      <main className="page-main products">
        {catalog.error ? <LoadError error={catalog.error} onRetry={catalog.reload} /> : !data ? <Loading message="상품 목록과 대표 예시를 불러오고 있어요" minHeight={320} /> : (
          <>
            <ProductsNotice notice={data.notice} />
            <div className="page-grid">
              <div className="products-main">
                <section aria-labelledby="products-list-title">
                  <div className="section-head">
                    <div>
                      <h2 id="products-list-title">상품 요약</h2>
                      <p>유형 탭을 고르면 그 유형의 상품만 보여요. 상품 이름을 누르면 요약 조건표·대표 예시·유의사항이 있는 상세 화면으로 가요.</p>
                    </div>
                  </div>
                  <Tabs label="상품 유형" current={type} onChange={id => setParams(id === ALL ? {} : { type: id }, { replace: true })} items={tabs} />
                </section>
                <section aria-labelledby="products-basis-title" className="products-basis">
                  <h2 id="products-basis-title">대표 예시 산정 기준</h2>
                  <p>{data.representativeBasis}</p>
                  <dl className="def-list">
                    {data.products.map(p => (
                      <div key={p.code}>
                        <dt>{p.name}</dt>
                        <dd>{p.representative.conditions} → 연 {pct(p.representative.rate)}, {METHOD_LABEL[p.representative.repaymentMethod]} 총이자 {formatNumber(p.representative.totalInterest)}원 · 총상환액 {formatNumber(p.representative.totalPayment)}원</dd>
                      </div>
                    ))}
                  </dl>
                  <Disclosure data={data.disclosure} />
                </section>
              </div>
              <aside aria-label="읽는 법">
                <div className="panel">
                  <h3>표 읽는 법</h3>
                  <dl className="def-list products-howto">
                    <div><dt>금리(연)</dt><dd>가장 낮은 값은 최상위 밴드에 받을 수 있는 우대를 모두 더한 금리, 가장 높은 값은 최하위 밴드의 금리다. 법정 최고금리 연 20%를 넘지 않는다.</dd></div>
                    <div><dt>한도</dt><dd>상품 최대 금액(담보 상품은 차량가 × LTV)이다. 실제 한도는 심사에서 소득배수·DSR 역산과 비교해 가장 작은 값으로 정해진다.</dd></div>
                    <div><dt>대표 예시</dt><dd>한 가지 가정 조건의 계산 결과다. 신용점수·우대 조건이 다르면 금리와 월 납입액이 달라진다.</dd></div>
                  </dl>
                </div>
                <div className="panel panel-soft">
                  <h3>이어서</h3>
                  <ul className="products-links">
                    <li><Link to="/calculators/screening">심사 시뮬레이터로 내 조건의 금리·한도 보기</Link></li>
                    <li><Link to="/calculators/schedule">상환 스케줄 계산기</Link></li>
                    <li><Link to="/methodology">방법론 · 규칙 세트 수치와 가정값</Link></li>
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox/apply">모의 여신에서 상품 골라 신청해 보기 <Icon name="next" size={16} /></Link>
          <Link to="/course">입문 과정 · 여신의 기본 개념 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
