import { useState, type FormEvent } from "react";
import { sandboxApi } from "../../../api/sandbox";
import { errorMessage } from "../../../api/client";
import type { LedgerEntry } from "../../../api/types";
import MoneyInput from "../../../components/MoneyInput";
import { won } from "../../calculators/parts/labels";

/** 가상 결제계좌 입금 폼(S-11). 자동이체·상환은 이 계좌에서 빠져나간다. 1원~1억 원. */
export default function DepositForm({ balance, onDeposited, suggested = null }: { balance: number; onDeposited: (entry: LedgerEntry) => void; suggested?: number | null }) {
  const [amount, setAmount] = useState<number | null>(suggested);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount < 1 || amount > 100_000_000) { setError("입금액은 1원 이상 1억 원 이하로 넣어요."); return; }
    setBusy(true); setError(""); setDone("");
    try {
      const entry = await sandboxApi.deposit({ amount });
      setDone(`${won(entry.amount)}을 입금했어요. 잔액 ${won(entry.balanceAfter)}.`);
      setAmount(null);
      onDeposited(entry);
    } catch (err) {
      setError(errorMessage(err, "입금하지 못했어요. 잠시 뒤 다시 시도해요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel deposit" onSubmit={submit} aria-labelledby="deposit-title" noValidate>
      <h3 id="deposit-title">결제계좌 입금</h3>
      <p className="muted">현재 잔액 {won(balance)}. 자동이체·수동 상환·중도상환은 이 가상 계좌에서 빠져나가요. 실제 계좌가 아니에요.</p>
      <MoneyInput label="입금액" value={amount} onChange={setAmount} required error={error || undefined} hint="1원~100,000,000원" />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "입금하고 있어요…" : "입금하기"}</button>
        {suggested !== null && suggested > 0 && <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => setAmount(suggested)}>부족분 {won(suggested)} 채우기</button>}
      </div>
      {done && <p className="form-done" role="status">{done}</p>}
    </form>
  );
}
