import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../../api/client";
import { sandboxApi } from "../../api/sandbox";
import type { Notification } from "../../api/types";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icon";
import LoadError from "../../components/LoadError";
import Loading from "../../components/Loading";
import StatusChip from "../../components/StatusChip";
import SubPageHeader from "../../components/SubPageHeader";
import { FilterGroup } from "../../components/Tabs";
import { formatDate } from "../../lib/format";
import { NOTIFICATION_TYPE_LABEL } from "../calculators/parts/labels";
import { useLoad } from "../calculators/parts/useLoad";

/** 연체·상실 거르개가 고르는 알림 종류. 연체 흐름(연체 → 상실 예정 → 기한이익상실)만 남긴다. */
const ARREARS_TYPES = ["OVERDUE_STARTED", "ACCELERATION_NOTICE", "ACCELERATED"];
const FILTERS = [
  { id: "all" as const, label: "전체" },
  { id: "unread" as const, label: "읽지 않음" },
  { id: "arrears" as const, label: "연체·상실" },
];
type Filter = (typeof FILTERS)[number]["id"];
const matches = (n: Notification, filter: Filter) => (filter === "all" ? true : filter === "unread" ? !n.read : ARREARS_TYPES.includes(n.type));

/** 알림함(S-16): 영업일별 목록, 거르개(전체·읽지 않음·연체·상실), 읽음 처리(하나·전부), 계약 링크. 알림은 일마감이 만든다(납입 예정 D-3·완료·연체·통지·상실·완제). */
export default function NotificationsPage() {
  const list = useLoad<Notification[]>(signal => sandboxApi.notifications(false, signal), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const markRead = async (ids: number[]) => {
    if (!ids.length || !list.data) return;
    setBusy(true); setError("");
    try {
      await sandboxApi.markRead({ ids });
      list.setData(list.data.map(n => (ids.includes(n.id) ? { ...n, read: true } : n)));
    } catch (err) { setError(errorMessage(err, "읽음 처리하지 못했어요. 잠시 뒤 다시 시도해요.")); } finally { setBusy(false); }
  };

  const all = list.data ?? [];
  const items = all.filter(n => matches(n, filter));
  const unreadIds = all.filter(n => !n.read).map(n => n.id);
  const counts: Record<Filter, number> = { all: all.length, unread: unreadIds.length, arrears: all.filter(n => matches(n, "arrears")).length };
  const groups = items.reduce<{ date: string; items: Notification[] }[]>((acc, n) => {
    const last = acc[acc.length - 1];
    if (last && last.date === n.businessDate) last.items.push(n); else acc.push({ date: n.businessDate, items: [n] });
    return acc;
  }, []);

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox/notifications"
        title="알림함"
        description="시간을 진행할 때 일마감이 만든 알림이에요. 납입일 3일 전 예정 알림, 자동이체 완료, 연체 시작, 연체 45일 통지, 60일 기한이익상실, 완제가 영업일 순서로 쌓여요."
        meta={list.data ? <>전체 {list.data.length}개 · 읽지 않음 {unreadIds.length}개</> : undefined}
        actions={<button type="button" className="btn btn-secondary" disabled={busy || unreadIds.length === 0} onClick={() => markRead(unreadIds)}>모두 읽음</button>}
      />
      <main className="page-main sandbox">
        {list.error ? <LoadError error={list.error} onRetry={list.reload} /> : !list.data ? <Loading message="알림을 불러오고 있어요" minHeight={300} /> : (
          <div className="page-grid">
            <div className="notices">
              <FilterGroup label="알림 필터">
                {FILTERS.map(f => (
                  <button key={f.id} type="button" className={filter === f.id ? "is-active" : undefined} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                    {f.label} {counts[f.id]}
                  </button>
                ))}
              </FilterGroup>
              {error && <p className="form-error" role="alert">{error}</p>}
              {items.length === 0 ? (
                <EmptyState title={filter === "unread" ? "읽지 않은 알림이 없어요" : filter === "arrears" ? "연체·상실 알림이 없어요" : "아직 알림이 없어요"} description="대출을 실행하고 시간을 진행하면 납입 예정·자동이체·연체 알림이 여기에 쌓여요." action={{ to: "/sandbox", label: "시간 진행하러 가기" }} />
              ) : groups.map(group => (
                <section key={group.date} className="notice-day" aria-labelledby={`notice-${group.date}`}>
                  <h2 id={`notice-${group.date}`}><time dateTime={group.date}>{formatDate(group.date)}</time> <span className="faint">영업일 · {group.items.length}건{group.items.filter(n => !n.read).length > 0 && ` · 읽지 않음 ${group.items.filter(n => !n.read).length}건`}</span></h2>
                  <ul className="notice-items">
                    {group.items.map(n => {
                      const t = NOTIFICATION_TYPE_LABEL[n.type] ?? { label: n.type, tone: "neutral" as const };
                      return (
                        <li key={n.id} className={n.read ? "is-read" : "is-unread"}>
                          <div className="notice-head">
                            <StatusChip label={t.label} tone={t.tone} />
                            <h3>{n.title}</h3>
                            {!n.read && <span className="status status-info">읽지 않음</span>}
                          </div>
                          <p>{n.body}</p>
                          <div className="notice-actions">
                            {n.contractId !== null && <Link to={`/sandbox/contracts/${n.contractId}`}>계약 보기 <Icon name="next" size={14} /></Link>}
                            {!n.read && <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => markRead([n.id])}>읽음</button>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
            <aside aria-label="알림 종류">
              <table className="table table-compact">
                <caption>알림 종류와 시점</caption>
                <thead><tr><th scope="col">알림</th><th scope="col">시점</th></tr></thead>
                <tbody>
                  <tr><th scope="row">납입 예정</th><td>실제 납입일 3일 전 일마감. 결제계좌 잔액이 모자라면 부족액을 같이 알려요</td></tr>
                  <tr><th scope="row">납입 완료</th><td>자동이체 성공</td></tr>
                  <tr><th scope="row">연체</th><td>납입일 일마감에 미납이면. 다음 날부터 연체이자</td></tr>
                  <tr><th scope="row">상실 예정</th><td>연체 45일</td></tr>
                  <tr><th scope="row">기한이익상실</th><td>연체 60일. 잔액 전체를 한 번에 청구</td></tr>
                  <tr><th scope="row">완제</th><td>마지막 회차 납입 또는 전액 중도상환</td></tr>
                </tbody>
              </table>
            </aside>
          </div>
        )}
        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}
