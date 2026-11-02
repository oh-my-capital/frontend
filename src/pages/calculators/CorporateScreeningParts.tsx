import type { CSSProperties } from "react";
import {
  CORPORATE_REASON_LABEL,
  CUSTOMER_TYPE_LABEL,
  type CorporateAuthority,
  type CorporateReason,
  type CorporateScreeningResult,
  type CorporateScore,
} from "../../api/corporate";
import DataTable, { type Column } from "../../components/DataTable";
import Money from "../../components/Money";
import MoneyInput from "../../components/MoneyInput";
import StatusChip, { statusLabel } from "../../components/StatusChip";
import { formatNumber } from "../../lib/format";
import { CheckField } from "./parts/fields";
import { won } from "./parts/labels";

/**
 * 기업 심사 시뮬레이터(S-320) 조각: 음수 금액 입력, 결정 요약, 재무비율 표, 등급 사다리, 전결 권한 표, 근거표.
 * 금리 구성·한도 사다리는 개인 심사(S-07)의 공용 그림(RateWaterfall·LimitLadder)을 그대로 쓴다. WP32 소유.
 */

/** 영업이익·자기자본처럼 음수가 될 수 있는 금액: 크기는 MoneyInput, 부호는 체크로 받는다(MoneyInput 은 숫자만 받는다). */
export function SignedMoneyField({ label, value, onChange, negativeLabel, hint, error }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  negativeLabel: string;
  hint?: string;
  error?: string;
}) {
  const negative = value !== null && value < 0;
  return (
    <div className="corp-signed">
      <MoneyInput label={label} value={value === null ? null : Math.abs(value)} onChange={v => onChange(v === null ? null : negative ? -v : v)} required hint={hint} error={error} />
      <CheckField label={negativeLabel} checked={negative} onChange={checked => onChange(value === null ? null : checked ? -Math.abs(value) : Math.abs(value))} />
    </div>
  );
}

function decisionSentence(r: CorporateScreeningResult, requested: number): string {
  const who = `${CUSTOMER_TYPE_LABEL[r.customerType]} · ${r.industry.label} · 내부등급 ${r.score.grade}(총점 ${r.score.total})`;
  if (r.decision === "APPROVED") return `${who}. 신청 ${won(requested)}이 최종 한도 ${won(r.limits?.finalLimit ?? 0)} 안이라 승인해요. 전결 권한은 ${r.authority.label ?? "—"}이에요.`;
  if (r.decision === "CONDITIONAL") {
    const binding = r.limits?.candidates.find(c => c.binding);
    return `${who}. 신청 ${won(requested)}이 ${binding?.name ?? "한도"} ${won(r.limits?.finalLimit ?? 0)}을 넘어 한도로 줄여 조건부 승인해요. 전결 권한은 ${r.authority.label ?? "—"}이에요.`;
  }
  const codes = r.reasonCodes.map(c => CORPORATE_REASON_LABEL[c] ?? c).join(" · ");
  return `${who}. ${codes} 때문에 거절해요.${r.rate ? "" : " 금리·한도·전결은 계산하지 않았어요."}`;
}

/** 결정 배지 + 한 문장 + 지표 줄(내부등급·적용 금리·최종/제안 한도·전결 권한). */
export function CorporateDecisionSummary({ result, requested }: { result: CorporateScreeningResult; requested: number }) {
  const { label, tone } = statusLabel(result.decision);
  const conditional = result.decision === "CONDITIONAL";
  return (
    <section className="decision" aria-labelledby="corp-decision-heading">
      <div className="decision-head">
        <h2 id="corp-decision-heading">기업 심사 결과</h2>
        <StatusChip label={label} tone={tone} />
        <StatusChip label={CUSTOMER_TYPE_LABEL[result.customerType]} tone="info" />
      </div>
      <p className="decision-sentence" tabIndex={-1}>{decisionSentence(result, requested)}</p>
      <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
        <div>
          <dt>내부등급</dt>
          <dd className={result.score.grade > result.score.maxApprovableGrade ? "danger" : undefined}>{result.score.grade}<span className="money-unit">등급</span><small>총점 {result.score.total} / {result.score.maxTotal}</small></dd>
        </div>
        <div>
          <dt>적용 금리</dt>
          <dd>{result.rate ? <>{result.rate.applied.toFixed(2)}<span className="money-unit">%</span>{result.rate.capped && <small>상한 적용</small>}</> : "—"}</dd>
        </div>
        <div>
          <dt>{conditional ? "제안 한도" : "최종 한도"}</dt>
          <dd><Money value={result.limits?.finalLimit ?? null} />{conditional ? <small>신청 {formatNumber(requested)}원</small> : result.monthlyPayment !== null && <small>월 {formatNumber(result.monthlyPayment)}원</small>}</dd>
        </div>
        <div>
          <dt>전결 권한</dt>
          <dd className="corp-authority-figure">{result.authority.label ?? "—"}{result.authority.escalated && <small>등급 때문에 한 단계 위</small>}</dd>
        </div>
      </dl>
    </section>
  );
}

/** 재무비율 표: 비율·식·값·걸린 구간·점수/배점, 합계 줄. */
export function CorporateRatioTable({ result }: { result: CorporateScreeningResult }) {
  const rows = result.ratios;
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "name", header: "항목", rowHeader: true, render: r => <><span className="reason-rule">{r.name}</span><code className="reason-code">{r.code}</code></> },
    { key: "formula", header: "식", render: r => r.formula },
    { key: "value", header: "값", numeric: true, nowrap: true, render: r => (r.value === null ? "산출 불가" : `${r.unit === "년" ? r.value : r.value.toFixed(2)}${r.unit}`) },
    { key: "band", header: "걸린 구간", nowrap: true, render: r => r.band },
    {
      key: "points", header: "점수", numeric: true, width: "120px",
      render: r => (
        <span className="bar-cell">
          <span className="bar-track" aria-hidden="true"><i style={{ width: `${(r.points / r.maxPoints) * 100}%` }} /></span>
          <span>{r.points} / {r.maxPoints}</span>
        </span>
      ),
    },
  ];
  return (
    <DataTable
      caption="재무비율과 점수 · 교육용 점수표"
      captionNote="개인 심사의 DSR 대신 재무제표로 갚을 힘과 빚의 무게를 본다. 비율은 소수 둘째 자리로 반올림한 값으로 구간을 판정한다."
      columns={columns}
      rows={rows}
      rowKey={r => r.code}
      scroll
      footer={<tr><th scope="row" colSpan={4}>총점</th><td className="num">{result.score.total} / {result.score.maxTotal}</td></tr>}
    />
  );
}

/** 등급 사다리: 1~10등급 칸, 내 등급 강조, 승인 가능선(최저 등급) 뒤는 거절 칸. 칸마다 최소 점수·스프레드 글자. */
export function CorporateGradeLadder({ score }: { score: CorporateScore }) {
  const summary = `총점 ${score.total}점은 내부등급 ${score.grade}이다. ${score.maxApprovableGrade}등급까지 승인할 수 있고 그보다 낮은 등급은 거절한다.`;
  return (
    <figure className="chart corp-grade" aria-labelledby="corp-grade-title">
      <figcaption id="corp-grade-title" className="corp-grade-title"><strong>내부등급 사다리</strong><span className="faint">숫자가 작을수록 좋다</span></figcaption>
      <ol className="corp-grade-ladder">
        {score.gradeBands.map(b => {
          const current = b.grade === score.grade;
          return (
            <li key={b.grade} className={`corp-grade-step${current ? " is-current" : ""}${b.approvable ? "" : " is-rejected"}`} aria-current={current ? "true" : undefined}>
              <span className="corp-grade-no">{b.grade}<span className="corp-grade-unit">등급</span></span>
              <span className="corp-grade-min">{b.minScore}점 이상</span>
              <span className="corp-grade-spread">{b.spread === null ? "거절" : `+${b.spread.toFixed(2)}%p`}</span>
              {current && <span className="corp-grade-mark">내 등급</span>}
            </li>
          );
        })}
      </ol>
      <p className="ladder-note">{summary}</p>
    </figure>
  );
}

const fmtTier = (max: number | null, prev: number | null) => (max === null ? `${formatNumber(prev ?? 0)}원 초과` : `${formatNumber(max)}원 이하`);

/** 전결 권한 표: 금액 구간 × (기본 권한 / 등급 n 이상이면). 해당 칸은 행 강조 + "이 결정" 라벨. */
export function CorporateAuthorityTable({ authority, grade }: { authority: CorporateAuthority; grade: number }) {
  const tiers = authority.tiers;
  const nextLabel = (i: number) => tiers[Math.min(i + 1, tiers.length - 1)].label;
  const currentIndex = authority.amount === null ? -1 : tiers.findIndex(t => t.maxAmount === null || authority.amount! <= t.maxAmount);
  const escalatedColumn = grade >= authority.escalationFromGrade;
  return (
    <div className="table-scroll">
      <table className="table table-compact">
        <caption>
          전결 권한 · 교육용 가정값
          <span className="table-caption-note">
            결정 금액이 속한 구간으로 기본 권한을 정하고, 내부등급이 {authority.escalationFromGrade} 이상이면 한 단계 위가 승인한다.
            {authority.amount === null ? " 거절은 전결 대상 금액이 없다." : ` 이 결정은 ${won(authority.amount)} · ${grade}등급이라 ${authority.label}이 승인한다.`}
          </span>
        </caption>
        <thead>
          <tr><th scope="col">결정 금액</th><th scope="col">기본 권한(1~{authority.escalationFromGrade - 1}등급)</th><th scope="col">{authority.escalationFromGrade}등급 이상</th></tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => {
            const current = i === currentIndex;
            return (
              <tr key={t.level} className={current ? "is-current" : undefined} aria-current={current ? "true" : undefined}>
                <th scope="row">{fmtTier(t.maxAmount, i > 0 ? tiers[i - 1].maxAmount : null)}{current && <StatusChip label="이 결정" tone="info" />}</th>
                <td className={current && !escalatedColumn ? "corp-cell-hit" : undefined}>{t.label}</td>
                <td className={current && escalatedColumn ? "corp-cell-hit" : undefined}>{nextLabel(i)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 근거표(ADR-008). 개인 심사의 ScreeningReasons 와 같은 모양이며 규칙 이름은 서버가 준 ruleName 을 쓴다. */
export function CorporateReasons({ reasons }: { reasons: CorporateReason[] }) {
  const blocking = reasons.filter(r => r.reasonCode !== null);
  const hasFail = blocking.some(r => r.outcome === "FAIL");
  const columns: Column<CorporateReason>[] = [
    { key: "no", header: "순서", numeric: true, width: "56px", render: r => r.orderNo },
    { key: "rule", header: "규칙", rowHeader: true, render: r => <><span className="reason-rule">{r.ruleName}</span><code className="reason-code">{r.ruleCode}</code></> },
    { key: "input", header: "입력", render: r => r.input },
    { key: "threshold", header: "기준", render: r => r.threshold },
    { key: "outcome", header: "결과", nowrap: true, render: r => { const { label, tone } = statusLabel(r.outcome); return <StatusChip label={label} tone={tone} />; } },
    { key: "message", header: "설명", render: r => <>{r.message}{r.reasonCode && <span className="reason-reason">사유 {CORPORATE_REASON_LABEL[r.reasonCode] ?? r.reasonCode} <code className="reason-code">{r.reasonCode}</code></span>}</> },
  ];
  const unique = blocking.filter((r, i) => blocking.findIndex(x => x.reasonCode === r.reasonCode) === i);
  return (
    <div className="reason-block">
      {unique.length > 0 && (
        <section className={`reason-summary${hasFail ? "" : " is-warn"}`} aria-labelledby="corp-reason-summary-title">
          <h3 id="corp-reason-summary-title">{hasFail ? `결정을 막은 사유 ${unique.length}개` : `결정을 바꾼 사유 ${unique.length}개`}</h3>
          <ul>
            {unique.map(r => (
              <li key={r.orderNo}>
                <span className="rule">
                  {r.ruleName}
                  <StatusChip label={CORPORATE_REASON_LABEL[r.reasonCode!] ?? r.reasonCode!} tone={hasFail ? "danger" : "warn"} />
                  <code className="reason-code">{r.reasonCode}</code>
                </span>
                <span className="msg">{r.message}</span>
                <span className="basis">입력 {r.input} · 기준 {r.threshold}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <DataTable
        caption="기업 심사 근거"
        captionNote="자격 → 재무비율·점수 → 내부등급 → 금리 → 한도 → 결정 → 전결 순서로 평가한 규칙별 입력·기준·결과이다. 자격이 실패해도 비율·등급은 계산해 보여 준다."
        columns={columns}
        rows={reasons}
        rowKey={r => r.orderNo}
        compact
        scroll
      />
    </div>
  );
}

