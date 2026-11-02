import { Link, useSearchParams } from "react-router-dom";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import SubPageHeader from "../../../components/SubPageHeader";
import Tabs from "../../../components/Tabs";
import { isForbidden, requestIdOf } from "../parts/adminLabels";
import JournalsTab from "./JournalsTab";
import ReconciliationsTab from "./ReconciliationsTab";
import TrialBalanceTab from "./TrialBalanceTab";
import "../../../styles/admin-analytics.css";
import "../../../styles/ledger.css";

const TAB_IDS = ["journals", "trial-balance", "reconciliations"] as const;
type TabId = (typeof TAB_IDS)[number];

/**
 * 회계 원장·대사(S-300~S-302, FR-49·50): 분개 목록 · 합계잔액시산표 · 일일 대사 세 탭. 주소의 ?tab= 과 각 탭의 거르개로 상태를 남긴다.
 * 분개는 시계 진행(일마감 묶음)이 끝난 뒤 회계 마감이 원천에서 전기한 것이다(business-rules WP30, ADR-027).
 */
export default function AdminLedgerPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "journals";
  const tab: TabId = (TAB_IDS as readonly string[]).includes(raw) ? (raw as TabId) : "journals";

  const update = (changes: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) copy.set(key, value); else copy.delete(key);
    }
    setParams(copy);
  };
  const changeTab = (id: string) => setParams(id === "journals" ? {} : { tab: id });
  const onError = (error: unknown) => (isForbidden(error) ? <ForbiddenPage requestId={requestIdOf(error)} /> : null);

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/ledger"
        title="회계 원장·대사"
        description="대출 실행·상환·연체이자 수납·기한이익상실·월마감 충당금이 회사 장부에 어떻게 찍히는지 복식부기 분개로 보여요. 시계를 진행하면 일마감 묶음이 끝난 뒤 그날까지의 사건을 전기하고, 계약 잔액과 장부 잔액을 대사해요."
      />
      <main className="page-main admin-main ledger-main">
        <p className="ledger-notice">
          교육용 단순화 계정과목이며 이자는 <strong>받은 날 수익으로 인식(현금주의)</strong>한다. 실제 회계(K-IFRS 1109 유효이자율법·발생주의, 기대신용손실 충당금)와 다르다.
          {" "}<Link to="/methodology">방법론</Link>
        </p>
        <Tabs
          label="회계 원장 보기"
          current={tab}
          onChange={changeTab}
          items={[
            { id: "journals", label: "분개", content: <JournalsTab params={params} update={update} onError={onError} /> },
            { id: "trial-balance", label: "시산표", content: <TrialBalanceTab params={params} update={update} onError={onError} /> },
            { id: "reconciliations", label: "일일 대사", content: <ReconciliationsTab params={params} update={update} onError={onError} /> },
          ]}
        />
        <div className="next-actions">
          <Link to="/admin/portfolio">포트폴리오 →</Link>
          <Link to="/admin/batch">배치 →</Link>
          <Link to="/admin/collections">연체 관리 →</Link>
        </div>
      </main>
    </>
  );
}
