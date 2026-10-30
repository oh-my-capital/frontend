import Icon from "./Icon";

/** 단계 표시(대출 신청 3단계 등). activeIndex 는 0부터. 완료 단계는 체크, 현재는 남색, 남은 단계는 번호. */
export default function Stepper({ steps, activeIndex, label = "진행 단계" }: { steps: string[]; activeIndex: number; label?: string }) {
  return (
    <ol className="stepper" aria-label={label}>
      {steps.map((step, i) => {
        const state = i < activeIndex ? "is-done" : i === activeIndex ? "is-current" : "";
        return (
          <li key={step} className={state} aria-current={i === activeIndex ? "step" : undefined}>
            <span className="step-no" aria-hidden="true">{i < activeIndex ? <Icon name="check" size={14} /> : i + 1}</span>
            <span className="step-label">{i + 1}단계 {step}</span>
          </li>
        );
      })}
    </ol>
  );
}
