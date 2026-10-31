import { useId, type ReactNode } from "react";

/** 콘텐츠 편집 폼의 입력 묶음. label 연결·hint·오류 문장을 한 곳에서 처리한다. */
interface BaseProps { label: string; hint?: ReactNode; error?: string; required?: boolean }

export function TextField({ label, hint, error, required = true, value, onChange, type = "text", inputMode, placeholder }: BaseProps & { value: string; onChange: (v: string) => void; type?: string; inputMode?: "numeric" | "text" | "url"; placeholder?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <input id={id} className={`field-input${inputMode === "numeric" ? " num" : ""}`} type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={hint ? `${id}-hint` : undefined} placeholder={placeholder} required={required} />
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function TextArea({ label, hint, error, required = true, value, onChange, rows = 4, mono = false }: BaseProps & { value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <textarea id={id} className={`field-textarea${mono ? " admin-mono" : ""}`} rows={rows} value={value} onChange={e => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={hint ? `${id}-hint` : undefined} required={required} spellCheck={!mono} />
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function SelectField({ label, hint, required = true, value, onChange, options }: BaseProps & { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <select id={id} className="field-select" value={value} onChange={e => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    </div>
  );
}

/** 반복 항목(절·출처·문항) 한 묶음: 번호·제목·삭제 버튼 + 본문. */
export function RepeatItem({ index, title, onRemove, removeLabel = "삭제", children }: { index: number; title: string; onRemove?: () => void; removeLabel?: string; children: ReactNode }) {
  return (
    <div className="admin-repeat">
      <div className="admin-repeat-head">
        <strong>{index + 1}. {title}</strong>
        {onRemove && <button type="button" className="btn btn-secondary btn-small" onClick={onRemove}>{removeLabel}</button>}
      </div>
      <div className="admin-repeat-body">{children}</div>
    </div>
  );
}

export function Fieldset({ legend, hint, children, actions }: { legend: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <fieldset className="admin-fieldset">
      <legend>{legend}</legend>
      {hint && <p className="field-hint admin-fieldset-hint">{hint}</p>}
      <div className="admin-fieldset-body">{children}</div>
      {actions && <div className="btn-row">{actions}</div>}
    </fieldset>
  );
}
