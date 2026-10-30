import { useId, type ReactNode } from "react";

/** 공통 입력 틀(label 연결·힌트·오류). 금액은 MoneyInput, 비율은 RateInput 을 쓰고, 여기서는 select·date·number 만 만든다. */
interface BaseProps { label: string; hint?: string; error?: string; required?: boolean; disabled?: boolean }

export function SelectField<T extends string | number>({ label, hint, error, required = true, disabled, value, options, onChange }: BaseProps & { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <select id={id} className="field-select" value={String(value)} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} aria-invalid={error ? true : undefined}
        onChange={event => { const found = options.find(o => String(o.value) === event.target.value); if (found) onChange(found.value); }}>
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function DateField({ label, hint, error, required = true, disabled, value, onChange, min, max }: BaseProps & { value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <input id={id} className="field-input" type="date" value={value} min={min} max={max} disabled={disabled} required={required} aria-describedby={hint ? `${id}-hint` : undefined} aria-invalid={error ? true : undefined} onChange={event => onChange(event.target.value)} />
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function NumberField({ label, hint, error, required = true, disabled, value, onChange, min, max, step = 1, unit, affix }: BaseProps & { value: number | null; onChange: (value: number | null) => void; min?: number; max?: number; step?: number; unit?: string; affix?: ReactNode }) {
  const id = useId();
  const input = (
    <input id={id} className="field-input num" type="number" inputMode="numeric" value={value ?? ""} min={min} max={max} step={step} disabled={disabled} required={required} aria-describedby={hint ? `${id}-hint` : undefined} aria-invalid={error ? true : undefined}
      onChange={event => onChange(event.target.value === "" ? null : Number(event.target.value))} />
  );
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      {unit || affix ? <div className="field-affix">{input}{unit && <span aria-hidden="true">{unit}</span>}{affix}</div> : input}
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function CheckField({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={event => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    </div>
  );
}
