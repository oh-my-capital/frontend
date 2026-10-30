import { useId, useState } from "react";

interface Props {
  label: string;
  /** 연 %, 소수 둘째 자리까지. 비어 있으면 null. */
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}

/** 비율 입력: 소수 둘째 자리까지, 단위 % 뒤에, inputmode="decimal". */
export default function RateInput({ label, value, onChange, hint, error, min = 0, max = 20, step = 0.01, required, disabled, name }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <div className="field-affix">
        <input
          id={id}
          name={name}
          className="field-input num"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          onChange={event => {
            const cleaned = event.target.value.replace(/[^\d.]/g, "").replace(/^(\d*\.\d{0,2}).*$/, "$1");
            setText(cleaned);
            const parsed = cleaned === "" || cleaned.endsWith(".") ? null : Number(cleaned);
            onChange(parsed === null || Number.isNaN(parsed) ? null : parsed);
          }}
          onBlur={() => { if (value !== null) setText(value.toFixed(2)); }}
        />
        <span aria-hidden="true">%</span>
      </div>
      {hint && <p id={hintId} className="field-hint">{hint} {min}~{max}%, {step} 단위</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
