import { useId } from "react";
import { digitsOnly, withCommas } from "../lib/format";

interface Props {
  label: string;
  /** 원 단위 정수. 비어 있으면 null. */
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  error?: string;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  unit?: string;
}

/** 금액 입력: 천 단위 자동 쉼표, 숫자 키패드(inputmode="numeric"), label 연결, 단위 "원" 뒤에(ui-guidelines §8). */
export default function MoneyInput({ label, value, onChange, hint, error, min, max, required, disabled, name, unit = "원" }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const text = value === null ? "" : withCommas(String(value));
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}{!required && <span className="optional">(선택)</span>}</label>
      <div className="field-affix">
        <input
          id={id}
          name={name}
          className="field-input num"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          onChange={event => {
            const digits = digitsOnly(event.target.value).slice(0, 15);
            onChange(digits ? Number(digits) : null);
          }}
        />
        <span aria-hidden="true">{unit}</span>
      </div>
      {hint && <p id={hintId} className="field-hint">{hint}{min !== undefined && max !== undefined ? ` ${withCommas(String(min))}~${withCommas(String(max))}${unit}` : ""}</p>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
