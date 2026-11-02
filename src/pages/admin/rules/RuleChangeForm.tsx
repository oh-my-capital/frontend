import { useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "../../../api/client";
import { REASON_MAX, REASON_MIN, ruleChangesApi, type RuleChange, type RuleKey, type RuleKeyCatalog } from "../../../api/ruleChanges";
import { UNIT_TEXT, formatValue } from "./ruleLabels";

/**
 * 변경 기안 폼(S-312): 항목 고르기 → 현재 값·단위·허용 범위 표시 → 새 값·사유·시행일 → 기안 저장(작성 중).
 * 범위·자릿수는 화면에서 먼저 막고, 서버 오류(제도 수치·같은 값·시행일)는 서버 문장을 그대로 보인다.
 */
export default function RuleChangeForm({ catalog, today, onCreated }: { catalog: RuleKeyCatalog; today: string; onCreated: (c: RuleChange) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = catalog.keys.find(k => k.key === key) ?? null;
  const groups = [...new Set(catalog.keys.map(k => k.group))];
  const reasonLength = [...reason.trim()].length;
  const reasonOk = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;
  const valueProblem = selected ? problemOf(selected, value) : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return setError("바꿀 항목을 골라요.");
    if (valueProblem) return setError(valueProblem);
    if (!reasonOk) return setError(`기안 사유는 ${REASON_MIN}~${REASON_MAX}자로 적어요(지금 ${reasonLength}자).`);
    if (!effectiveFrom || effectiveFrom < today) return setError(`시행일은 오늘(${today}) 이후로 정해요.`);
    setBusy(true);
    setError(null);
    try {
      const created = await ruleChangesApi.create({ key: selected.key, newValue: Number(value), reason: reason.trim(), effectiveFrom });
      setValue("");
      setReason("");
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : errorMessage(err, "기안을 저장하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel admin-form rules-form" onSubmit={submit} aria-busy={busy} noValidate aria-labelledby="rules-form-title">
      <h3 id="rules-form-title">변경 기안</h3>
      <p className="field-hint">기준 버전 {catalog.latestVersion}. 새 신청 심사에 쓰이는 교육용 가정값만 바꿀 수 있고, 법령이 정한 제도 수치는 목록에 없어요.</p>
      <div className="field">
        <label className="field-label" htmlFor="rule-key">바꿀 항목</label>
        <select id="rule-key" className="field-select" value={key} onChange={e => { setKey(e.target.value); setValue(""); setError(null); }}>
          <option value="">항목을 골라요</option>
          {groups.map(g => (
            <optgroup key={g} label={g}>
              {catalog.keys.filter(k => k.group === g).map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {selected && (
        <dl className="def-list admin-def rules-current" aria-live="polite">
          <dt>현재 값</dt><dd className="num">{formatValue(selected.currentValue, selected.unit, selected.scale)}</dd>
          <dt>허용 범위</dt><dd>{formatValue(selected.min, selected.unit, selected.scale)} ~ {formatValue(selected.max, selected.unit, selected.scale)}</dd>
          <dt>규칙 키</dt><dd><code>{selected.key}</code></dd>
        </dl>
      )}
      <div className="field">
        <label className="field-label" htmlFor="rule-value">새 값{selected ? `(${UNIT_TEXT[selected.unit]})` : ""}</label>
        <input
          id="rule-value"
          className="field-input num"
          inputMode="decimal"
          value={value}
          disabled={!selected}
          onChange={e => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          aria-invalid={value !== "" && valueProblem !== null}
          aria-describedby="rule-value-hint"
        />
        <p id="rule-value-hint" className="field-hint">
          {selected ? (selected.scale === 0 ? "정수로 적어요." : `소수 ${selected.scale}자리까지 적어요.`) : "항목을 먼저 골라요."}
          {value !== "" && valueProblem ? ` ${valueProblem}` : ""}
        </p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="rule-reason">기안 사유({REASON_MIN}~{REASON_MAX}자)</label>
        <textarea id="rule-reason" className="field-textarea" rows={3} value={reason} maxLength={REASON_MAX + 20} onChange={e => setReason(e.target.value)} aria-describedby="rule-reason-count" />
        <p id="rule-reason-count" className={`admin-counter${reasonOk ? " is-ok" : ""}`}><span>{REASON_MAX}자 중 {reasonLength}자{reasonLength < REASON_MIN ? ` · ${REASON_MIN - reasonLength}자 더` : ""}</span></p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="rule-effective">시행일</label>
        <input id="rule-effective" type="date" className="field-input rules-date" min={today} value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} aria-describedby="rule-effective-hint" />
        <p id="rule-effective-hint" className="field-hint">실제 날짜(한국 시간) 기준이에요. 그날 0시부터 들어오는 새 신청이 새 버전으로 심사돼요.</p>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "저장하고 있어요…" : "기안 저장"}</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

function problemOf(k: RuleKey, raw: string): string | null {
  if (raw === "") return "새 값을 적어요.";
  if (!/^\d+(\.\d+)?$/.test(raw)) return "숫자로 적어요.";
  const decimals = raw.includes(".") ? raw.split(".")[1].replace(/0+$/, "").length : 0;
  if (decimals > k.scale) return k.scale === 0 ? "정수로 적어요." : `소수 ${k.scale}자리까지 적어요.`;
  const n = Number(raw);
  if (n < k.min || n > k.max) return `${formatValue(k.min, k.unit, k.scale)}~${formatValue(k.max, k.unit, k.scale)} 안에서만 바꿀 수 있어요.`;
  if (Math.abs(n - k.currentValue) < 1e-9) return "현재 값과 같아요. 다른 값을 적어요.";
  return null;
}
