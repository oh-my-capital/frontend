import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ruleChangesApi, type RuleChange } from "../../../api/ruleChanges";
import DataTable, { type Column } from "../../../components/DataTable";
import Disclosure from "../../../components/Disclosure";
import EmptyState from "../../../components/EmptyState";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { ForbiddenPage } from "../../../components/ProtectedRoute";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../../lib/format";
import { isForbidden, requestIdOf } from "../parts/adminLabels";
import { useLoad } from "../parts/useLoad";
import RuleChangeDetail from "./RuleChangeDetail";
import RuleChangeForm from "./RuleChangeForm";
import { FLOW_STEPS, changeStatus, formatValue } from "./ruleLabels";
import "../../../styles/admin-rules.css";

/**
 * 규칙 변경 결재(S-310~S-312, FR-51·52): 지표 줄 → (고른 기안 상세·백테스트) → 기안 목록 표, 보조 열에 기안 폼·절차·변경 불가 제도 수치.
 * 고른 기안은 `?id=` 와 동기화한다. 규칙은 docs/domain/business-rules.md "WP31".
 */
export default function AdminRulesPage() {
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get("id") ?? "") || null;
  const list = useLoad(() => ruleChangesApi.list(), []);
  const catalog = useLoad(() => ruleChangesApi.keys(), []);
  if (isForbidden(list.error)) return <ForbiddenPage requestId={requestIdOf(list.error)} />;

  const select = (id: number | null) => {
    const copy = new URLSearchParams(params);
    if (id) copy.set("id", String(id)); else copy.delete("id");
    setParams(copy, { replace: true });
  };
  const refresh = () => { list.reload(); catalog.reload(); };
  const pending = list.data?.items.filter(i => i.status === "PENDING").length ?? 0;

  return (
    <>
      <SubPageHeader
        section="admin"
        current="/admin/rules"
        title="규칙 변경 결재"
        description="심사 규칙의 교육용 가정값(가산금리·소득배수·DSR 한도 등)을 바꾸려면 기안하고, 다른 운영자가 결재해야 해요. 결재 전에 지난 신청으로 백테스트해 승인율·금리가 어떻게 바뀌는지 봐요."
      />
      <main className="page-main admin-main">
        <p className="admin-note" role="note">
          교육용 모의 서비스의 규칙 버전이에요. 법정 최고금리 20%·연체가산 3%p 같은 제도 수치는 법령이 정한 값이라 여기서 바꿀 수 없어요. 운영자는 번호로만 보여요.
        </p>
        {list.data && (
          <dl className="figure-row admin-figures" style={{ "--figure-cols": 4 } as CSSProperties}>
            <div><dt>오늘(실제 날짜)</dt><dd className="rules-figure-text">{formatDate(list.data.today)}</dd></div>
            <div><dt>새 신청에 쓰는 버전</dt><dd>{list.data.versionInEffect}</dd></div>
            <div><dt>최신 버전(시행 예정 포함)</dt><dd>{list.data.latestVersion}</dd></div>
            <div><dt>결재 대기</dt><dd>{formatNumber(pending)}<small>건</small></dd></div>
          </dl>
        )}
        <div className="admin-grid rules-grid">
          <div className="stack admin-stack">
            {selected && <RuleChangeDetail id={selected} onChanged={refresh} onClose={() => select(null)} />}
            <section aria-labelledby="rules-list-title">
              <div className="section-head">
                <div>
                  <h2 id="rules-list-title">기안 목록</h2>
                  <p>최신순. 번호를 누르면 전후 비교·결재·백테스트가 열린다.</p>
                </div>
              </div>
              {list.loading && !list.data && <Loading message="기안 목록을 불러오고 있어요" minHeight={200} />}
              {list.error != null && <LoadError error={list.error} onRetry={list.reload} />}
              {list.data && list.data.items.length === 0 && (
                <EmptyState title="아직 기안이 없어요" description="보조 열의 기안 폼에서 첫 변경을 기안해 봐요. 결재 전까지는 규칙이 바뀌지 않아요." />
              )}
              {list.data && list.data.items.length > 0 && <ChangeTable items={list.data.items} selected={selected} onSelect={id => select(id === selected ? null : id)} />}
            </section>
          </div>
          <aside>
            {catalog.error != null && <LoadError error={catalog.error} onRetry={catalog.reload} />}
            {catalog.data && list.data && (
              <RuleChangeForm catalog={catalog.data} today={list.data.today} onCreated={c => { refresh(); select(c.id); }} />
            )}
            <div className="panel panel-soft">
              <div className="panel-head"><h3>결재 절차</h3></div>
              <ol className="rules-flow">
                {FLOW_STEPS.map(s => <li key={s.title}><strong>{s.title}</strong> {s.body}</li>)}
              </ol>
            </div>
            {catalog.data && (
              <div className="panel panel-soft">
                <div className="panel-head">
                  <h3>바꿀 수 없는 제도 수치</h3>
                  <p>출처가 법령인 값. 법이 바뀌면 업무 규칙 문서와 새 규칙 세트 버전으로 반영한다.</p>
                </div>
                <dl className="rules-locked">
                  {catalog.data.locked.map(l => (
                    <div key={l.key}>
                      <dt>{l.label}<code>{l.key}</code></dt>
                      <dd>
                        <span className="num">{l.value || "—"}</span>
                        <a href={l.sourceUrl} target="_blank" rel="noreferrer">법령 보기</a>
                        {l.checkedOn && <span className="faint">확인 {formatDate(l.checkedOn)}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <Disclosure />
          </aside>
        </div>
        <div className="next-actions">
          <Link to="/methodology">지금 규칙 보기(방법론) →</Link>
          <Link to="/admin/analytics">승인 퍼널 보기 →</Link>
          <Link to="/admin/applications">신청·심사 보기 →</Link>
        </div>
      </main>
    </>
  );
}

function ChangeTable({ items, selected, onSelect }: { items: RuleChange[]; selected: number | null; onSelect: (id: number) => void }) {
  const columns: Column<RuleChange>[] = [
    {
      key: "id", header: "번호", rowHeader: true, nowrap: true,
      render: c => <button type="button" className="admin-linklike" aria-pressed={c.id === selected} onClick={() => onSelect(c.id)}>#{c.id}</button>,
    },
    { key: "label", header: "항목", render: c => <>{c.label}<span className="admin-sub faint"><code>{c.key}</code></span></> },
    {
      key: "values", header: "기존 → 새 값", numeric: true, nowrap: true,
      render: c => <>{formatValue(c.oldValue, c.unit, c.scale)} → <strong>{formatValue(c.newValue, c.unit, c.scale)}</strong></>,
    },
    { key: "effective", header: "시행일", nowrap: true, render: c => formatDate(c.effectiveFrom) },
    {
      key: "status", header: "상태", nowrap: true,
      render: c => {
        const s = changeStatus(c);
        return <><StatusChip label={s.label} tone={s.tone} />{c.targetVersion && <span className="admin-sub faint">{c.targetVersion}</span>}</>;
      },
    },
    { key: "drafter", header: "기안", render: c => <>{c.drafter.label}{c.draftedByMe && <span className="admin-sub faint">내 기안</span>}</> },
    { key: "reviewer", header: "결재", render: c => c.reviewer?.label ?? <span className="faint">—</span> },
  ];
  return (
    <DataTable
      caption="규칙 변경 기안"
      captionNote="상태: 작성 중 → 결재 대기 → 결재됨(시행 예정) → 시행 중, 또는 반려. 뒤 버전이 시행되면 앞 버전은 대체됨."
      columns={columns}
      rows={items}
      rowKey={c => c.id}
      selectedKey={selected}
      scroll
      compact
    />
  );
}
