import { Link } from "react-router-dom";
import { learningApi } from "../../api/learning";
import type { Methodology, RepaymentMethod } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatRate } from "../../lib/format";
import { useLoad } from "./useLoad";

const METHOD_LABEL: Record<RepaymentMethod, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };
const ROUNDING_LABEL: Record<string, string> = { interest: "회차 이자·일할 이자·연체이자·수수료·충당금", monthlyPayment: "월 납입액(원리금균등)", limit: "한도" };

const TOC = [
  { id: "rule-set", label: "규칙 세트와 반올림" },
  { id: "rate", label: "신용 밴드·스프레드·소득배수" },
  { id: "limit", label: "한도: DSR·LTV" },
  { id: "overdue", label: "연체·기한이익상실" },
  { id: "asset", label: "건전성 분류·적립률" },
  { id: "products", label: "상품" },
  { id: "regulatory", label: "제도 수치(출처·확인일)" },
  { id: "assumptions", label: "교육용 가정값" },
];

/**
 * 방법론(S-09). 활성 규칙 세트의 수치를 표로 공개한다. 어미는 "~이다/~한다".
 * 제도 수치(법·감독규정에서 온 값, 출처·확인일 있음)와 교육용 가정값(이 서비스가 정한 값)은 두 표로 분리한다.
 */
export default function MethodologyPage() {
  const method = useLoad<Methodology>(signal => learningApi.methodology(signal), []);
  const m = method.data;
  const productCodes = m ? m.products.map(p => p.code) : [];

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/methodology"
        title="방법론"
        description="모든 계산기와 모의 여신은 아래 규칙 세트 하나로 계산한다. 결과 화면의 Disclosure 에 적힌 규칙 버전·계산 버전이 이 화면의 값과 같다. 법과 감독규정에서 온 제도 수치는 출처와 확인일을 붙여 따로 적고, 이 서비스가 교육용으로 정한 가정값은 별도 표에 둔다."
        meta={m ? `규칙 세트 ${m.ruleSetVersion} · 계산 ${m.calcVersion} · 연 ${m.dayCountBasis}일 기준` : undefined}
      />
      <main className="page-main methodology">
        {method.error ? (
          <LoadError error={method.error} message="규칙 세트를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={method.retry} />
        ) : !m ? (
          <Loading message="규칙 세트를 불러오고 있어요" minHeight={520} />
        ) : (
          <div className="page-grid">
            <div className="methodology-body">
              <section id="rule-set" className="methodology-section">
                <h2>규칙 세트와 반올림</h2>
                <p>금액은 원 단위 정수이고 비율은 연 % 소수 둘째 자리이다. 월 이율은 연이율 ÷ 100 ÷ 12이며, 일수는 윤년과 관계없이 연 {m.dayCountBasis}일로 나눈다. 규칙 수치는 코드가 아니라 규칙 세트에 두고 모든 결과에 버전을 붙인다.</p>
                <table className="table">
                  <caption>규칙 세트 {m.ruleSetVersion} · 계산 {m.calcVersion}의 수치 표현</caption>
                  <thead><tr><th scope="col">항목</th><th scope="col">규칙</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">규칙 세트 버전</th><td>{m.ruleSetVersion}</td></tr>
                    <tr><th scope="row">계산 버전</th><td>{m.calcVersion}</td></tr>
                    <tr><th scope="row">일수 기준</th><td>연 {m.dayCountBasis}일 고정(윤년도 같다)</td></tr>
                    {Object.entries(m.rounding).map(([key, rule]) => (
                      <tr key={key}><th scope="row">{ROUNDING_LABEL[key] ?? key}</th><td>{rule}</td></tr>
                    ))}
                    <tr><th scope="row">원금균등 회차 원금</th><td>원금 ÷ 회차수 절사, 나머지는 마지막 회차에 더한다</td></tr>
                    <tr><th scope="row">마지막 회차</th><td>원금 = 남은 잔액 전부. 납입액이 앞 회차와 몇 원 다를 수 있다</td></tr>
                  </tbody>
                </table>
              </section>

              <section id="rate" className="methodology-section">
                <h2>신용 밴드·스프레드·소득배수</h2>
                <p>적용 금리 = 기준금리 + 밴드별 스프레드 − 우대금리(자동이체 0.20%p)이다. 결과가 {formatRate(m.legalMaxRate)}를 넘으면 {formatRate(m.legalMaxRate)}로 자르고 rateCapped 를 표시한다. 신용점수가 가장 낮은 밴드의 하한보다 낮으면 자격 단계에서 거절한다.</p>
                <div className="table-scroll">
                  <table className="table">
                    <caption>신용 밴드별 스프레드(%p)와 소득배수</caption>
                    <thead>
                      <tr>
                        <th scope="col">밴드</th><th scope="col">신용점수</th>
                        {productCodes.map(code => <th key={code} scope="col" className="num">{m.products.find(p => p.code === code)?.name ?? code} 스프레드</th>)}
                        <th scope="col" className="num">소득배수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.creditBands.map(band => (
                        <tr key={band.band}>
                          <th scope="row">{band.band}</th>
                          <td className="num">{band.minScore}~{band.maxScore}</td>
                          {productCodes.map(code => <td key={code} className="num">+{(band.spreads[code] ?? 0).toFixed(1)}</td>)}
                          <td className="num">× {band.incomeMultiple.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row">—</th><td className="num">{Math.min(...m.creditBands.map(b => b.minScore))} 미만</td>
                        {productCodes.map(code => <td key={code} className="num">거절</td>)}
                        <td className="num">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="limit" className="methodology-section">
                <h2>한도: DSR·LTV·소득배수</h2>
                <p>최종 한도는 상품 최대·소득배수·DSR 역산 세 값 중 가장 작은 값을 만 원 단위로 절사한 금액이다. 어느 값이 가장 작았는지를 '한도를 결정한 규칙'으로 결과에 남긴다.</p>
                <table className="table">
                  <caption>한도 규칙</caption>
                  <thead><tr><th scope="col">규칙</th><th scope="col">식</th><th scope="col" className="num">기준값</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">상품 최대</th><td>신용대출은 상품 최대 금액, 자동차 할부는 floor(차량가 × LTV)</td><td className="num">LTV {formatRate(m.ltvRate, 0)}</td></tr>
                    <tr><th scope="row">소득배수</th><td>연소득 × 밴드별 배수</td><td className="num">위 표</td></tr>
                    <tr><th scope="row">DSR</th><td>(기존 연 원리금 + 신규 연 원리금) ÷ 연소득. 신규 연 원리금은 첫 12회 납입액 합</td><td className="num">≤ {formatRate(m.dsrLimit, 0)}</td></tr>
                    <tr><th scope="row">DSR 역산</th><td>월 여유 = (연소득 × DSR 한도 − 기존 연 원리금) ÷ 12. 신청 조건으로 월 납입액이 월 여유 이하가 되는 최대 원금. 월 여유 ≤ 0이면 한도 0</td><td className="num">—</td></tr>
                    <tr><th scope="row">최종 한도</th><td>min(상품 최대, 소득배수, DSR 역산), 만 원 절사</td><td className="num">—</td></tr>
                  </tbody>
                </table>
              </section>

              <section id="overdue" className="methodology-section">
                <h2>연체·기한이익상실</h2>
                <p>연체 시작일은 실제 납입일 다음 날이며 그날부터 연체일수 1이다. 연체이자는 매일 floor(대상 금액 × 연체이율 × 연체일수 ÷ {m.dayCountBasis})로 다시 계산해 차액을 더한다.</p>
                <table className="table">
                  <caption>연체와 기한이익상실 규칙</caption>
                  <thead><tr><th scope="col">항목</th><th scope="col">규칙</th><th scope="col" className="num">값</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">연체이율</th><td>min(약정이율 + 가산, 법정 최고금리)</td><td className="num">+{formatRate(m.overdueSpread, 1)}p · 상한 {formatRate(m.legalMaxRate)}</td></tr>
                    <tr><th scope="row">연체 대상(상실 전)</th><td>미납 회차 납입액 합(원금 + 이자)</td><td className="num">—</td></tr>
                    <tr><th scope="row">연체 대상(상실 후)</th><td>잔여 원금 전체 + 미납 이자</td><td className="num">—</td></tr>
                    <tr><th scope="row">상실 예정 통지</th><td>연체일수 도달 시 알림 ACCELERATION_NOTICE</td><td className="num">{m.accelerationNoticeDays}일</td></tr>
                    <tr><th scope="row">기한이익상실</th><td>계약 DEFAULTED, 이후 전액 청구</td><td className="num">{m.accelerationDays}일</td></tr>
                    <tr><th scope="row">변제충당</th><td>비용 → 연체이자 → 미납 이자 → 미납 원금, 오래된 회차부터</td><td className="num">—</td></tr>
                    <tr><th scope="row">자동이체</th><td>잔액이 당회 납입액(미납·연체이자 포함)에 못 미치면 전액 실패(부분 이체 없음)</td><td className="num">—</td></tr>
                  </tbody>
                </table>
              </section>

              <section id="asset" className="methodology-section">
                <h2>건전성 분류·적립률</h2>
                <p>분류는 연체일수로만 정하며 매일 일마감에서 다시 계산한다. 충당금 = floor(잔여 원금 × 적립률)이며 월말 월마감에 저장한다. 아래 일수와 적립률은 교육용 가정값이다.</p>
                <table className="table">
                  <caption>건전성 분류 5단계와 적립률(교육용 가정값)</caption>
                  <thead><tr><th scope="col">코드</th><th scope="col">분류</th><th scope="col" className="num">연체일수</th><th scope="col" className="num">적립률</th></tr></thead>
                  <tbody>
                    {m.assetClasses.map((cls, index) => {
                      const next = m.assetClasses[index + 1];
                      return (
                        <tr key={cls.code}>
                          <th scope="row"><code>{cls.code}</code></th>
                          <td>{cls.label}</td>
                          <td className="num">{next ? `${cls.minOverdueDays}~${next.minOverdueDays - 1}일` : `${cls.minOverdueDays}일 이상`}</td>
                          <td className="num">{formatRate(cls.provisionRate, 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section id="products" className="methodology-section">
                <h2>상품</h2>
                <p>상품 조건은 교육용 시드 값이다. 자동차 할부의 최대 금액은 차량가 × LTV로 신청마다 정해진다.</p>
                <div className="table-scroll">
                  <table className="table">
                    <caption>상품 {m.products.length}개의 조건</caption>
                    <thead>
                      <tr><th scope="col">상품</th><th scope="col" className="num">최소</th><th scope="col" className="num">최대</th><th scope="col">기간(회)</th><th scope="col" className="num">기준금리</th><th scope="col">상환 방식</th><th scope="col" className="num">수수료율</th><th scope="col">담보</th></tr>
                    </thead>
                    <tbody>
                      {m.products.map(product => (
                        <tr key={product.code}>
                          <th scope="row">{product.name}<span className="faint" style={{ display: "block" }}><code>{product.code}</code></span></th>
                          <td className="num"><Money value={product.minAmount} /></td>
                          <td className="num">{product.maxAmount !== null ? <Money value={product.maxAmount} /> : `차량가 × ${formatRate(product.ltvRate ?? m.ltvRate, 0)}`}</td>
                          <td>{product.allowedTerms.join(" · ")}</td>
                          <td className="num">{formatRate(product.baseRate)}</td>
                          <td>{product.allowedMethods.map(code => METHOD_LABEL[code]).join(" · ")}</td>
                          <td className="num">{formatRate(product.prepaymentFeeRate)}</td>
                          <td>{product.requiresCollateral ? `있음 · LTV ${formatRate(product.ltvRate ?? m.ltvRate, 0)}` : "없음"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="regulatory" className="methodology-section">
                <h2>제도 수치(출처·확인일)</h2>
                <p>법과 감독규정에서 온 값이다. 출처 주소와 확인일을 함께 적으며, 제도가 바뀌면 확인일과 값을 함께 고친다.</p>
                <table className="table">
                  <caption>제도 수치 {m.regulatoryFigures.length}건 · 공식 기관 자료에서 확인한 값</caption>
                  <thead><tr><th scope="col">항목</th><th scope="col">값</th><th scope="col">출처</th><th scope="col">확인일</th></tr></thead>
                  <tbody>
                    {m.regulatoryFigures.map(figure => (
                      <tr key={figure.name}>
                        <th scope="row">{figure.name}</th>
                        <td>{figure.value}</td>
                        <td className="methodology-url"><a href={figure.sourceUrl} target="_blank" rel="noreferrer noopener">{figure.sourceUrl}</a></td>
                        <td>{formatDate(figure.checkedOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="assumptions" className="methodology-section">
                <h2>교육용 가정값</h2>
                <p>이 서비스가 교육 목적으로 정한 값이다. 실제 금융회사의 운영 수치가 아니며, 제도 수치와 달리 출처가 없다.</p>
                <table className="table">
                  <caption>가정값 {m.assumptions.length}건 · 이 서비스가 정한 값</caption>
                  <thead><tr><th scope="col">번호</th><th scope="col">가정</th></tr></thead>
                  <tbody>
                    {m.assumptions.map((assumption, index) => (
                      <tr key={assumption}><th scope="row">{index + 1}</th><td>{assumption}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            <aside aria-label="방법론 차례">
              <nav className="panel concept-toc" aria-label="이 화면의 차례">
                <h3>차례</h3>
                <ol>{TOC.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol>
              </nav>
              <div className="panel panel-soft">
                <h3>제도 수치와 가정값</h3>
                <p className="muted">제도 수치는 법·감독규정의 값이라 출처와 확인일이 있다. 가정값은 이 서비스가 교육용으로 정한 값이라 출처가 없고, 같은 표에 섞지 않는다.</p>
                <p className="muted" style={{ marginTop: 10 }}>계산 결과의 Disclosure 한 줄("규칙 {m.ruleSetVersion} · 계산 {m.calcVersion} · {m.dayCountBasis}일 기준")은 이 화면의 값을 가리킨다.</p>
              </div>
            </aside>
          </div>
        )}
        <div className="next-actions">
          <Link to="/calculators/schedule">상환 스케줄 계산기 <Icon name="next" size={16} /></Link>
          <Link to="/calculators/screening">심사 시뮬레이터 <Icon name="next" size={16} /></Link>
          <Link to="/course">입문 과정 목차 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}
