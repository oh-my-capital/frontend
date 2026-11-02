import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DIRECTION_LABEL,
  industryApi,
  SOURCE_KIND_LABEL,
  type IndustryBenchmark,
  type IndustryCompany,
  type IndustryMetric,
  type MetricId,
} from "../../api/industry";
import MixBar from "../../components/charts/MixBar";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import { setDocumentTitle } from "../../components/PageTitle";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import Tabs from "../../components/Tabs";
import { formatDate } from "../../lib/format";
import { useLoad } from "../learn/useLoad";
import IndustryQuiz from "./IndustryQuiz";
import MetricBars from "./MetricBars";
import { COMPARE_ROWS, bestCompanyIds, formatPercent, type CompareRow } from "./rows";
import "../../styles/industry.css";

/** 자산 분류별 색(토큰). 범례·요약 문장이 같은 정보를 글로 말한다. */
const ASSET_COLORS: Record<string, string> = {
  auto: "var(--series-principal)",
  "personal-credit": "var(--series-interest)",
  corporate: "var(--series-balance)",
  "real-estate": "var(--series-overdue)",
  other: "var(--border-strong)",
};

const SECTIONS = [
  { id: "types", label: "회사 유형" },
  { id: "compare", label: "지표 비교" },
  { id: "reading", label: "이 숫자를 어떻게 읽나" },
  { id: "sources", label: "실제 공시를 보는 곳" },
];

/**
 * 업권 비교·공시 읽기(S-340~344, FR-56). 가상 회사 3곳의 공시 형식 지표를 유형 소개 → 지표 비교(표·막대·구간 금리·자산 구성·정의)
 * → 해석 문항(서버 채점) → 실제 공시를 보는 공식 위치 → 교육용 고지 순서로 보인다. 로그인이 필요 없다.
 * 세 회사는 가상 회사이고 수치는 교육용 가정값이다 — 제목 띠·표 머리·고지에 "가상 데이터" 라벨을 단다.
 */
export default function IndustryPage() {
  const { hash } = useLocation();
  const data = useLoad<IndustryBenchmark>(signal => industryApi.benchmark(signal), []);
  useEffect(() => { setDocumentTitle("업권 비교·공시 읽기 · 배우기"); }, []);
  useEffect(() => {
    if (!hash || !data.data) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [hash, data.data]);

  return (
    <>
      <SubPageHeader
        section="learn"
        current="/industry"
        title="업권 비교·공시 읽기"
        description="캐피탈 회사들을 무엇으로 비교하는지 가상 회사 세 곳의 공시 형식 숫자로 연습해요. 숫자를 어떻게 읽는지 문항으로 확인하고, 실제 공시는 어디서 보는지 공식 위치를 안내해요."
        meta={data.data ? `${data.data.basisLabel} · 공식 출처 위치 확인일 ${formatDate(data.data.sourceCheckedOn)}` : undefined}
        notice={<p className="industry-fictional"><StatusChip label="가상 데이터" tone="warn" />세 회사는 실제 회사가 아니며 수치는 업권 구조를 배우기 위한 교육용 가정값이에요.</p>}
      />
      <main className="page-main industry">
        {data.error ? (
          <LoadError error={data.error} message="업권 비교 자료를 불러오지 못했어요. 잠시 뒤 다시 시도해요." onRetry={data.retry} />
        ) : !data.data ? (
          <Loading message="업권 비교 자료를 불러오고 있어요" minHeight={480} />
        ) : (
          <IndustryBody data={data.data} />
        )}
        <div className="next-actions">
          <Link to="/calculators/unit-economics">대출 한 건의 손익 <Icon name="next" size={16} /></Link>
          <Link to="/learn/asset-classification-and-provision">건전성 분류와 충당금 개념 <Icon name="next" size={16} /></Link>
          <Link to="/glossary">용어 사전 <Icon name="next" size={16} /></Link>
        </div>
      </main>
    </>
  );
}

function IndustryBody({ data }: { data: IndustryBenchmark }) {
  const metrics = new Map(data.metrics.map(m => [m.id, m]));
  const shownMetricCount = data.metrics.filter(m => !m.derived).length;
  return (
    <>
      <dl className="figure-row industry-figures">
        <div><dt>비교하는 가상 회사</dt><dd>{data.companies.length}<small>곳</small></dd></div>
        <div><dt>공시 지표</dt><dd>{shownMetricCount}<small>개 + 계산값 1</small></dd></div>
        <div><dt>공식 출처 위치</dt><dd>{data.sources.length}<small>곳</small></dd></div>
        <div><dt>해석 문항</dt><dd>{data.questions.length}<small>문항</small></dd></div>
      </dl>

      <div className="page-grid industry-grid">
        <div className="industry-main">
          <section id="types" className="industry-section" aria-labelledby="types-title">
            <div className="section-head">
              <div>
                <h2 id="types-title">회사 유형</h2>
                <p>누가 주인인지가 신용등급과 조달 원가를 정하고, 무엇을 빌려주는지가 금리와 연체율을 정한다.</p>
              </div>
            </div>
            <TypesTable companies={data.companies} />
          </section>

          <section id="compare" className="industry-section" aria-labelledby="compare-title">
            <div className="section-head">
              <div>
                <h2 id="compare-title">지표 비교</h2>
                <p>지표마다 해석 방향이 다르다. 가장 좋은 값에는 글자 라벨을 붙였다.</p>
              </div>
            </div>
            <CompareTable companies={data.companies} metrics={metrics} />
            <MetricPicker companies={data.companies} metrics={metrics} />
            <RateByScoreTable data={data} />
            <AssetMixes data={data} />
            <MetricDefinitions metrics={data.metrics} />
          </section>

          <section id="reading" className="industry-section" aria-labelledby="reading-title">
            <div className="section-head">
              <div>
                <h2 id="reading-title">이 숫자를 어떻게 읽나</h2>
                <p>위 표의 숫자만 보고 답을 고른다. 제출하면 서버가 채점하고 문항마다 해설을 보여 준다. 로그인하지 않아도 되며 기록하지 않는다.</p>
              </div>
            </div>
            <IndustryQuiz questions={data.questions} metrics={metrics} />
          </section>

          <section id="sources" className="industry-section" aria-labelledby="sources-title">
            <div className="section-head">
              <div>
                <h2 id="sources-title">실제 공시를 보는 곳</h2>
                <p>실제 회사의 숫자는 아래 공식 위치에서 직접 본다. 이 화면은 내용을 옮기지 않고 메뉴 위치만 안내한다.</p>
              </div>
            </div>
            <SourcesTable data={data} metrics={metrics} />
            <p className="disclosure industry-disclosure">
              <span>{data.notice}</span>
              <span>교육용 모의 서비스이며 투자·대출 판단의 근거가 아닙니다.</span>
              <span>메뉴 위치는 확인일 기준이며 기관 사이트 개편으로 바뀔 수 있습니다.</span>
            </p>
          </section>
        </div>

        <aside aria-label="업권 비교 바로가기">
          <nav className="panel industry-toc" aria-label="이 화면 목차">
            <div className="panel-head"><h3>목차</h3></div>
            <ol>
              {SECTIONS.map((s, i) => <li key={s.id}><a href={`#${s.id}`}><span className="industry-toc-no">{i + 1}</span>{s.label}</a></li>)}
            </ol>
          </nav>
          <div className="panel panel-soft industry-aside-note">
            <h3>읽는 순서</h3>
            <ol className="industry-steps">
              <li>신용등급과 조달금리로 원가를 본다.</li>
              <li>자산 구성으로 위험이 어디에 있는지 본다.</li>
              <li>연체율·고정이하여신비율로 위험이 실제로 났는지 본다.</li>
              <li>충당금 적립률로 손실에 얼마나 대비했는지 본다.</li>
              <li>ROA로 그 모든 것이 이익에 어떻게 남았는지 본다.</li>
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}

function FictionalName({ company }: { company: IndustryCompany }) {
  return <span className="industry-company"><strong>{company.name}</strong><StatusChip label="가상" tone="warn" /></span>;
}

function TypesTable({ companies }: { companies: IndustryCompany[] }) {
  return (
    <div className="table-scroll industry-types">
      <table className="table">
        <caption>가상 회사 세 곳의 유형 · 가상 데이터</caption>
        <thead><tr><th scope="col">회사</th><th scope="col">유형</th><th scope="col">어떤 회사인가</th><th scope="col">숫자에 나타나는 특징</th></tr></thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.id}>
              <th scope="row"><FictionalName company={c} /></th>
              <td className="nowrap">{c.typeLabel}</td>
              <td>{c.summary}</td>
              <td><ul className="industry-bullets">{c.traits.map((t, i) => <li key={i}>{t}</li>)}</ul></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function rowName(row: CompareRow, metrics: Map<MetricId, IndustryMetric>): string {
  return row.label ?? metrics.get(row.metric)?.name ?? row.metric;
}

function CompareTable({ companies, metrics }: { companies: IndustryCompany[]; metrics: Map<MetricId, IndustryMetric> }) {
  return (
    <div className="table-scroll industry-compare">
      <table className="table">
        <caption>지표 비교표 · 가상 데이터(교육용 가정값)</caption>
        <thead>
          <tr>
            <th scope="col">지표</th>
            <th scope="col">해석 방향</th>
            {companies.map(c => <th key={c.id} scope="col" className="num">{c.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map(row => {
            const direction = row.direction ?? metrics.get(row.metric)?.direction ?? "CONTEXT";
            const best = bestCompanyIds(companies, row, direction);
            return (
              <tr key={row.key}>
                <th scope="row">{rowName(row, metrics)}{row.note && <span className="industry-sub">{row.note}</span>}</th>
                <td className="nowrap industry-direction">{DIRECTION_LABEL[direction]}</td>
                {companies.map(c => (
                  <td key={c.id} className={`num${best.has(c.id) ? " is-best" : ""}`}>
                    {row.display(c)}
                    {best.has(c.id) && <span className="industry-best">{direction === "LOWER" ? "가장 낮음" : "가장 높음"}</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MetricPicker({ companies, metrics }: { companies: IndustryCompany[]; metrics: Map<MetricId, IndustryMetric> }) {
  const numeric = COMPARE_ROWS.filter(r => r.value);
  const [current, setCurrent] = useState(numeric[0].key);
  return (
    <div className="industry-bars">
      <h3>지표별 막대 비교</h3>
      <Tabs
        label="막대로 볼 지표"
        current={current}
        onChange={setCurrent}
        items={numeric.map(row => ({
          id: row.key,
          label: row.short ?? rowName(row, metrics),
          content: (
            <MetricBars
              title={rowName(row, metrics)}
              direction={row.direction ?? metrics.get(row.metric)?.direction ?? "CONTEXT"}
              rows={companies.map(c => ({ id: c.id, name: c.name, value: row.value!(c) }))}
              format={formatPercent}
            />
          ),
        }))}
      />
    </div>
  );
}

function RateByScoreTable({ data }: { data: IndustryBenchmark }) {
  const metric = data.metrics.find(m => m.id === "rate-by-score");
  return (
    <div className="industry-block">
      <h3>신용점수 구간별 평균 금리</h3>
      <p className="industry-lead">{metric?.reading}</p>
      <div className="table-scroll">
        <table className="table industry-rates">
          <caption>신용점수 구간별 금리(%)와 취급 비중(%) · 법정 최고금리 연 {data.legalMaxRate}% · 가상 데이터</caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>신용점수 구간</th>
              {data.companies.map(c => <th key={c.id} scope="colgroup" colSpan={2} className="num">{c.name}</th>)}
            </tr>
            <tr>
              {data.companies.map(c => [
                <th key={`${c.id}-r`} scope="col" className="num">금리</th>,
                <th key={`${c.id}-s`} scope="col" className="num">비중</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {data.scoreBands.map((band, i) => (
              <tr key={band.code}>
                <th scope="row" className="nowrap">{band.label}</th>
                {data.companies.map(c => {
                  const row = c.rateByScore[i];
                  return [
                    <td key={`${c.id}-r`} className="num">{row.rate.toFixed(1)}%</td>,
                    <td key={`${c.id}-s`} className="num faint">{row.share}%</td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">회사 평균 금리</th>
              {data.companies.map(c => <td key={c.id} colSpan={2} className="num">{c.averageRate.toFixed(2)}%</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="industry-note">회사 평균 금리 = Σ(구간 금리 × 구간 비중) ÷ 100이다. 같은 구간끼리 비교하면 순서가 평균과 다를 수 있다.</p>
    </div>
  );
}

function AssetMixes({ data }: { data: IndustryBenchmark }) {
  const risky = data.assetCategories.filter(c => c.higherRisk).map(c => c.label).join(" + ");
  return (
    <div className="industry-block">
      <h3>자산 구성 비중</h3>
      <p className="industry-lead">무엇을 빌려줬는지 100으로 놓고 나눈 비중이다. 위험이 큰 자산({risky}) 비중이 클수록 금리와 연체율이 함께 높다.</p>
      <div className="industry-mixes">
        {data.companies.map(c => (
          <MixBar
            key={c.id}
            title={`${c.name} · ${c.typeLabel}`}
            note={`위험 자산 ${c.higherRiskShare}% · 가상 데이터`}
            total={100}
            unit="%"
            slices={c.assetMix.map(m => ({ label: m.label, value: m.share, color: ASSET_COLORS[m.category] ?? "var(--border-strong)" }))}
          />
        ))}
      </div>
    </div>
  );
}

function MetricDefinitions({ metrics }: { metrics: IndustryMetric[] }) {
  return (
    <div className="industry-block">
      <h3>지표 정의</h3>
      <dl className="industry-defs">
        {metrics.map(m => (
          <div key={m.id} id={`metric-${m.id}`} className="industry-def">
            <dt>
              {m.name}
              <span className="industry-def-tags">
                <StatusChip label={DIRECTION_LABEL[m.direction]} tone={m.direction === "CONTEXT" ? "neutral" : "info"} />
                {m.derived && <StatusChip label="계산값" tone="neutral" />}
              </span>
            </dt>
            <dd>
              <p className="industry-formula">{m.formula}</p>
              <p>{m.reading}</p>
              <p className="muted">주의: {m.caution}</p>
              {m.relatedTerms.length > 0 && (
                <p className="industry-terms">
                  관련 용어{" "}
                  {m.relatedTerms.map((t, i) => <span key={t.slug}>{i > 0 && " · "}<Link to={`/glossary/${t.slug}`}>{t.term}</Link></span>)}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SourcesTable({ data, metrics }: { data: IndustryBenchmark; metrics: Map<MetricId, IndustryMetric> }) {
  return (
    <div className="table-scroll industry-sources">
      <table className="table">
        <caption>공식 출처 위치 {data.sources.length}곳 · 확인일 {formatDate(data.sourceCheckedOn)}</caption>
        <thead>
          <tr><th scope="col">기관</th><th scope="col">메뉴 위치</th><th scope="col">무엇을 보나</th><th scope="col">연결 지표</th><th scope="col">확인일</th></tr>
        </thead>
        <tbody>
          {data.sources.map(s => {
            const kind = SOURCE_KIND_LABEL[s.kind];
            return (
              <tr key={s.id}>
                <th scope="row">
                  <span className="industry-org">{s.organization}</span>
                  <StatusChip label={kind.label} tone={kind.tone} />
                </th>
                <td>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="industry-external">{s.title}<span className="sr-only"> (새 창)</span></a>
                  <span className="industry-sub">{s.menuPath}</span>
                </td>
                <td>{s.whatToLook}</td>
                <td>{s.relatedMetrics.map(id => metrics.get(id)?.name ?? id).join(" · ")}</td>
                <td className="nowrap">{formatDate(s.checkedOn)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
