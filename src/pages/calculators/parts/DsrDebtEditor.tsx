import type { RepaymentMethod } from "../../../api/types";
import { DEBT_TYPE_LABEL, DEBT_TYPES, type DebtType } from "../../../api/refinance";
import Icon from "../../../components/Icon";
import MoneyInput from "../../../components/MoneyInput";
import RateInput from "../../../components/RateInput";
import { NumberField, SelectField } from "./fields";
import { METHOD_LABEL, METHODS } from "./labels";

/** 화면에서 편집 중인 부채 한 줄. key 는 행을 지워도 입력 상태가 섞이지 않도록 고정 번호를 쓴다. */
export interface DebtDraft { key: number; type: DebtType; balance: number | null; annualRate: number | null; remainingMonths: number | null; repaymentMethod: RepaymentMethod }

const typeOptions = DEBT_TYPES.map(t => ({ value: t, label: DEBT_TYPE_LABEL[t] }));
const methodOptions = METHODS.map(m => ({ value: m, label: METHOD_LABEL[m] }));

/**
 * 기존 대출 행 추가·삭제 편집기(S-171). 행마다 fieldset + legend("대출 n · 종류"), 삭제 버튼은 어느 행인지 글로 말한다.
 * 최대 건수(규칙 세트 dsrCalculator.max_debts)에 닿으면 추가 버튼을 막고 이유를 글로 보여 준다.
 */
export default function DsrDebtEditor({ debts, max, errors, onChange, onAdd, onRemove }: {
  debts: DebtDraft[];
  max: number;
  errors: Record<string, string>;
  onChange: (key: number, patch: Partial<DebtDraft>) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
}) {
  const full = debts.length >= max;
  return (
    <div className="dsr-debts">
      <div className="dsr-debts-head">
        <h3 id="dsr-debts-title">기존 대출 <span className="dsr-count">{debts.length}건 / 최대 {max}건</span></h3>
        <p className="faint">신용대출·자동차 금융·주택담보대출처럼 지금 갚고 있는 대출을 한 줄에 하나씩 넣어요. 없으면 모두 지우고 계산해요.</p>
      </div>
      {debts.length === 0 && <p className="dsr-empty">기존 대출이 없어요. 합산 DSR은 0%이고 연소득의 상한만큼이 모두 여유예요.</p>}
      <ol className="dsr-debt-list" aria-labelledby="dsr-debts-title">
        {debts.map((d, i) => (
          <li key={d.key}>
            <fieldset className="dsr-debt">
              <legend>대출 {i + 1} · {DEBT_TYPE_LABEL[d.type]}</legend>
              <div className="dsr-debt-fields">
                <SelectField label="종류" value={d.type} options={typeOptions} onChange={type => onChange(d.key, { type })} />
                <MoneyInput label="잔액" value={d.balance} onChange={balance => onChange(d.key, { balance })} required error={errors[`${d.key}.balance`]} />
                <RateInput label="연이율" value={d.annualRate} onChange={annualRate => onChange(d.key, { annualRate })} required error={errors[`${d.key}.annualRate`]} />
                <NumberField label="잔존 개월" value={d.remainingMonths} onChange={remainingMonths => onChange(d.key, { remainingMonths })} min={1} max={480} unit="개월" error={errors[`${d.key}.remainingMonths`]} />
                <SelectField label="상환 방식" value={d.repaymentMethod} options={methodOptions} onChange={repaymentMethod => onChange(d.key, { repaymentMethod })} />
                <div className="dsr-debt-remove">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => onRemove(d.key)} aria-label={`대출 ${i + 1} 삭제`}>
                    <Icon name="close" size={16} /> 삭제
                  </button>
                </div>
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary btn-small" onClick={onAdd} disabled={full}>
          <Icon name="plus" size={16} /> 대출 추가
        </button>
        <span className="faint" aria-live="polite">{full ? `최대 ${max}건까지 넣을 수 있어요.` : `${max - debts.length}건 더 넣을 수 있어요.`}</span>
      </div>
    </div>
  );
}
