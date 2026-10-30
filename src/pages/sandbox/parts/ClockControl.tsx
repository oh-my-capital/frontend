import { useRef, useState } from "react";
import { sandboxApi } from "../../../api/sandbox";
import { errorMessage } from "../../../api/client";
import type { ClockAdvanceRequest, ClockAdvanceResult } from "../../../api/types";
import { formatDate } from "../../../lib/format";
import { summarizeAdvance } from "../../calculators/parts/labels";

interface Props {
  businessDate: string;
  nextDueDate: string | null;
  /** 진행 뒤 화면이 다시 불러오도록 부모에게 알린다. */
  onAdvanced: (result: ClockAdvanceResult) => void;
  /** "이 계약의 다음 납입일까지"처럼 화면이 정한 추가 버튼. */
  extra?: { label: string; request: ClockAdvanceRequest } | null;
  compact?: boolean;
}

/**
 * 시간 진행 컨트롤(S-11): 하루 / 다음 납입일까지 / N일. 진행 중에는 모두 비활성화하고, 결과는 aria-live 영역에 한 줄로 요약한다.
 * 예: "33일 진행했어요. 1회차 자동이체 868,498원 완료. 영업일 2026-02-17". 날짜마다 일마감이 돌므로 N일이 크면 시간이 걸린다.
 */
export default function ClockControl({ businessDate, nextDueDate, onAdvanced, extra = null, compact = false }: Props) {
  const [days, setDays] = useState(30);
  const [running, setRunning] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLParagraphElement>(null);

  const run = async (name: string, request: ClockAdvanceRequest) => {
    setRunning(name); setError("");
    try {
      const result = await sandboxApi.advance(request);
      setSummary(summarizeAdvance(result));
      onAdvanced(result);
    } catch (err) {
      setError(errorMessage(err, "시간을 진행하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setRunning(null);
      // 진행 중 버튼이 비활성화되면서 키보드 초점이 문서로 빠지므로, 끝나면 결과 문장으로 초점을 옮긴다.
      resultRef.current?.focus();
    }
  };
  const busy = running !== null;

  return (
    <section className={`clock${compact ? " clock-compact" : ""}`} aria-labelledby="clock-title">
      <div className="clock-head">
        <h2 id="clock-title">{compact ? "시간 진행" : "가상 시계"}</h2>
        <p>영업일 <strong>{formatDate(businessDate)}</strong>{nextDueDate ? <> · 다음 납입일 {formatDate(nextDueDate)}</> : " · 예정된 납입 없음"}</p>
      </div>
      <div className="clock-actions">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run("one", { mode: "ONE_DAY" })}>{running === "one" ? "진행 중…" : "하루 진행"}</button>
        <button type="button" className="btn btn-primary" disabled={busy || !nextDueDate} onClick={() => run("next", { mode: "NEXT_DUE_DATE" })}>{running === "next" ? "진행 중…" : "다음 납입일까지"}</button>
        {extra && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run("extra", extra.request)}>{running === "extra" ? "진행 중…" : extra.label}</button>}
        <form className="clock-days" onSubmit={event => { event.preventDefault(); if (days >= 1 && days <= 400) run("days", { mode: "DAYS", days }); }}>
          <label htmlFor="clock-days-input">N일</label>
          <div className="field-affix">
            <input id="clock-days-input" className="field-input num" type="number" inputMode="numeric" min={1} max={400} value={days} disabled={busy} onChange={event => setDays(Number(event.target.value))} />
            <span aria-hidden="true">일</span>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={busy || days < 1 || days > 400}>{running === "days" ? "진행 중…" : "진행"}</button>
        </form>
      </div>
      <p className="clock-result" role="status" aria-live="polite" tabIndex={-1} ref={resultRef}>{busy ? "날짜마다 일마감을 돌리고 있어요…" : summary}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!compact && <p className="faint">하루 진행은 오늘 날짜의 일마감(알림 → 자동이체 → 연체 → 건전성 → 상실 → 월마감)을 돌리고 영업일을 하루 넘겨요. "다음 납입일까지"는 납입일 당일 마감까지 포함해요.</p>}
    </section>
  );
}
