import type { Contract, Sandbox } from "../../../api/types";
import "../../../styles/rights.css";
import RateCutPanel from "./RateCutPanel";
import WithdrawalPanel from "./WithdrawalPanel";

/**
 * 계약 상세(S-15) 보조 열에 붙는 금융소비자 권리 패널(WP19): 청약철회(S-190) + 금리인하요구(S-192).
 * ContractPage 에는 이 컴포넌트를 렌더하는 한 줄만 둔다.
 */
export default function RightsPanel({ contract, sandbox, onDone }: { contract: Contract; sandbox: Sandbox; onDone: () => void }) {
  return (
    <>
      <WithdrawalPanel contract={contract} businessDate={sandbox.businessDate} balance={sandbox.settlementBalance} onDone={onDone} />
      <RateCutPanel contract={contract} businessDate={sandbox.businessDate} profile={sandbox.profile} onDone={onDone} />
    </>
  );
}
