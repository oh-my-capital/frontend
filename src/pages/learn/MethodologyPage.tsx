import { Link } from "react-router-dom";
import { learningApi } from "../../api/learning";
import type { Methodology, RepaymentMethod } from "../../api/types";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import Money from "../../components/Money";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { formatDate, formatRate } from "../../lib/format";
import { useLoad } from "./useLoad";

const METHOD_LABEL: Record<RepaymentMethod, string> = { EQUAL_PAYMENT: "원리금균등", EQUAL_PRINCIPAL: "원금균등", BULLET: "만기일시" };
/** 규칙 세트의 rounding 키(계약의 snake_case) → 화면 이름. 모르는 키는 키 그대로 보여 준다. */
const ROUNDING_LABEL: Record<string, string> = {
  monthly_payment: "월 납입액(원리금균등)",
  interest: "회차 이자·일할 이자·연체이자·수수료·충당금",
  equal_principal: "원금균등 회차 원금",
  last_installment: "마지막 회차 원금",
  limit: "한도",
  rate_scale: "이율의 자릿수",
};

/** 구역의 근거: 법·감독규정에서 온 제도 수치인지, 이 서비스가 교육용으로 정한 가정값인지. */
type Basis = "regulatory" | "assumption" | "mixed";
const BASIS: Record<Basis, { label: string; tone: "info" | "warn" | "neutral" }> = {
  regulatory: { label: "제도 수치", tone: "info" },
  assumption: { label: "교육용 가정값", tone: "warn" },
  mixed: { label: "제도 수치 + 가정값", tone: "neutral" },
};

type SectionId = "rule-set" | "rate" | "limit" | "overdue" | "asset" | "products" | "regulatory" | "assumptions";
/** 구역 이름과 근거. 목차와 구역 제목이 같은 말을 쓰도록 한곳에 둔다. */
const SECTIONS: Record<SectionId, { label: string; basis: Basis }> = {
  "rule-set": { label: "규칙 세트와 반올림", basis: "assumption" },
  rate: { label: "신용 밴드·스프레드·소득배수", basis: "mixed" },
  limit: { label: "한도: DSR·LTV·소득배수", basis: "mixed" },
  overdue: { label: "연체·기한이익상실", basis: "mixed" },
  asset: { label: "건전성 분류·적립률", basis: "assumption" },
  products: { label: "상품", basis: "assumption" },
  regulatory: { label: "제도 수치(출처·확인일)", basis: "regulatory" },
  assumptions: { label: "교육용 가정값", basis: "assumption" },
};
const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

/** 구역 머리: 제목 + 근거 구분. 어느 수치가 법에서 왔고 어느 수치를 이 서비스가 정했는지 구역마다 밝힌다. */
function SectionHead({ id }: { id: SectionId }) {
  const section = SECTIONS[id];
  return (
    <div className="methodology-head">
      <h2>{section.label}</h2>
      <StatusChip label={BASIS[section.basis].label} tone={BASIS[section.basis].tone} />
    </div>
  );
}

/** 규칙 세트의 수치는 BigDecimal 문자열이라 "2E+1"처럼 지수 표기로 올 수 있다. 숫자면 십진수로 고쳐 보여 준다. */
function decimal(value: string): string {
  const parsed = Number(value);
  return /e/i.test(value) && Number.isFinite(parsed) ? String(parsed) : value;
}

/** 가정값 한 줄("키 = 값 — 설명" 또는 "키: 설명" 또는 "키")을 항목·값·설명 세 칸으로 나눈다. */
function splitAssumption(line: string): { name: string; value: string | null; note: string | null } {
  const dash = line.indexOf(" — ");
  const head = dash >= 0 ? line.slice(0, dash) : line;
  const tail = dash >= 0 ? line.slice(dash + 3) : null;
  const eq = head.indexOf(" = ");
  if (eq >= 0) return { name: head.slice(0, eq), value: decimal(head.slice(eq + 3)), note: tail };
  const colon = head.indexOf(": ");
  if (colon >= 0) return { name: head.slice(0, colon), value: null, note: tail ? `${head.slice(colon + 2)} — ${tail}` : head.slice(colon + 2) };
  return { name: head, value: null, note: tail };
}

/**
 * 방법론(S-09). 활성 규칙 세트의 수치를 표로 공개한다. 어미는 "~이다/~한다".
 * 제도 수치(법·감독규정에서 온 값, 출처·확인일 있음)와 교육용 가정값(이 서비스가 정한 값)은 두 표로 분리한다.
 */
export default function MethodologyPage() {
  const method = useLoad<Methodology>(signal => learningApi.methodology(signal), []);
  const m = method.data;
  const productCodes = m ? m.products.map(p => p.code) : [];
  // 규칙 세트에 같은 제도 수치가 두 번 들어 있을 수 있다(법정 최고금리). 같은 항목·값·출처는 한 줄로만 보여 준다.
  const figures = (m?.regulatoryFigures ?? []).filter((figure, index, all) => all.findIndex(other => other.name === figure.name && other.value === figure.value && other.sourceUrl === figure.sourceUrl) === index);

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
              <nav className="methodology-index" aria-label="구역 바로가기">
                <h2>이 화면의 구성</h2>
                <ol>
                  {SECTION_IDS.map((id, index) => (
                    <li key={id}>
                      <a href={`#${id}`}>
                        <span className="methodology-index-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                        <span className="methodology-index-label">{SECTIONS[id].label}</span>
                        <span className="methodology-index-basis">{BASIS[SECTIONS[id].basis].label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <section id="rule-set" className="methodology-section">
                <SectionHead id="rule-set" />
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
                    <tr><th scope="row">마지막 회차 납입액</th><td>절사 누적을 마지막 회차에서 보정하므로 앞 회차와 몇 원 다를 수 있다</td></tr>
                  </tbody>
                </table>
              </section>

              <section id="rate" className="methodology-section">
                <SectionHead id="rate" />
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
                <SectionHead id="limit" />
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
                <SectionHead id="overdue" />
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
                <SectionHead id="asset" />
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
                <SectionHead id="products" />
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
                          <th scope="row">{product.name}<span className="faint methodology-code"><code>{product.code}</code></span></th>
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
                <SectionHead id="regulatory" />
                <p>법과 감독규정에서 온 값이다. 출처 주소와 확인일을 함께 적으며, 제도가 바뀌면 확인일과 값을 함께 고친다.</p>
                <table className="table">
                  <caption>제도 수치 {figures.length}건 · 공식 기관 자료에서 확인한 값<span className="table-caption-note">값은 규칙 세트에 저장된 수치 그대로이고, 단위는 항목 이름에 적혀 있다.</span></caption>
                  <thead><tr><th scope="col">항목</th><th scope="col" className="num">값</th><th scope="col">출처</th><th scope="col">확인일</th></tr></thead>
                  <tbody>
                    {figures.map((figure, index) => (
                      <tr key={`${figure.name}-${index}`}>
                        <th scope="row">{figure.name}</th>
                        <td className="num">{decimal(figure.value)}</td>
                        <td className="methodology-url"><a href={figure.sourceUrl} target="_blank" rel="noreferrer noopener">{figure.sourceUrl}</a></td>
                        <td>{formatDate(figure.checkedOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="assumptions" className="methodology-section">
                <SectionHead id="assumptions" />
                <p>이 서비스가 교육 목적으로 정한 값이다. 실제 금융회사의 운영 수치가 아니며, 제도 수치와 달리 출처가 없다.</p>
                <div className="table-scroll">
                  <table className="table">
                    <caption>가정값 {m.assumptions.length}건 · 이 서비스가 정한 값<span className="table-caption-note">항목 이름은 규칙 세트의 키이고, 같은 값이 계산기·샌드박스에 그대로 쓰인다.</span></caption>
                    <thead><tr><th scope="col" className="num">번호</th><th scope="col">항목</th><th scope="col" className="num">값</th><th scope="col">설명</th></tr></thead>
                    <tbody>
                      {m.assumptions.map((assumption, index) => {
                        const parsed = splitAssumption(assumption);
                        return (
                          <tr key={`${index}-${parsed.name}`}>
                            <td className="num">{index + 1}</td>
                            <th scope="row"><code>{parsed.name}</code></th>
                            <td className="num">{parsed.value ?? "—"}</td>
                            <td>{parsed.note ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside aria-label="규칙 세트 요약과 차례">
              <nav className="panel concept-toc" aria-label="이 화면의 차례">
                <h3>차례</h3>
                <ol>{SECTION_IDS.map(id => <li key={id}><a href={`#${id}`}>{SECTIONS[id].label}</a></li>)}</ol>
              </nav>
              <div className="panel">
                <h3>한눈에 보는 수치</h3>
                <dl className="def-list">
                  <div><dt>규칙 · 계산</dt><dd>{m.ruleSetVersion} · {m.calcVersion}</dd></div>
                  <div><dt>일수 기준</dt><dd>연 {m.dayCountBasis}일</dd></div>
                  <div><dt>DSR 한도</dt><dd>{formatRate(m.dsrLimit, 0)}</dd></div>
                  <div><dt>LTV</dt><dd>{formatRate(m.ltvRate, 0)}</dd></div>
                  <div><dt>연체가산</dt><dd>+{formatRate(m.overdueSpread, 1)}p</dd></div>
                  <div><dt>최고금리</dt><dd>{formatRate(m.legalMaxRate)}</dd></div>
                  <div><dt>통지 · 상실</dt><dd>{m.accelerationNoticeDays}일 · {m.accelerationDays}일</dd></div>
                  <div><dt>신용 밴드</dt><dd>{m.creditBands.length}개</dd></div>
                  <div><dt>상품</dt><dd>{m.products.length}개</dd></div>
                </dl>
              </div>
              <div className="panel panel-soft">
                <h3>제도 수치와 가정값</h3>
                <p className="muted">제도 수치는 법·감독규정의 값이라 출처와 확인일이 있다. 가정값은 이 서비스가 교육용으로 정한 값이라 출처가 없고, 같은 표에 섞지 않는다. 구역마다 어느 쪽인지 제목 옆에 적어 둔다.</p>
                <p className="muted methodology-note">계산 결과의 Disclosure 한 줄("규칙 {m.ruleSetVersion} · 계산 {m.calcVersion} · {m.dayCountBasis}일 기준")은 이 화면의 값을 가리킨다.</p>
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
