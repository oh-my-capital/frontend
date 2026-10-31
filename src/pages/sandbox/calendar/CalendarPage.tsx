import { useEffect, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { certificatesApi, type CalendarDay, type CalendarItem, type CalendarItemStatus, type PaymentCalendar } from "../../../api/certificates";
import Disclosure from "../../../components/Disclosure";
import Icon from "../../../components/Icon";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import Money from "../../../components/Money";
import { setDocumentTitle } from "../../../components/PageTitle";
import StatusChip from "../../../components/StatusChip";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate, formatNumber } from "../../../lib/format";
import { useLoad } from "../../calculators/parts/useLoad";
import { CALENDAR_STATUS, shortContractNo } from "../certificates/labels";
import "../../../styles/calendar.css";

/** 일요일부터(국내 달력 관례). dayOfWeek 는 ISO(1 = 월 … 7 = 일)라 7 → 0 으로 바꿔 칸을 맞춘다. */
const WEEKDAYS = [
  { short: "일", long: "일요일" }, { short: "월", long: "월요일" }, { short: "화", long: "화요일" }, { short: "수", long: "수요일" },
  { short: "목", long: "목요일" }, { short: "금", long: "금요일" }, { short: "토", long: "토요일" },
];
const STATUS_ORDER: CalendarItemStatus[] = ["OVERDUE", "ACCELERATED", "DUE", "SCHEDULED", "PAID"];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/** 7칸씩 끊은 주. 앞뒤 빈 칸은 null. */
function weeks(days: CalendarDay[]): (CalendarDay | null)[][] {
  const lead = days.length > 0 ? days[0].dayOfWeek % 7 : 0;
  const cells: (CalendarDay | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}

/**
 * 납입 캘린더(S-212). 샌드박스의 모든 계약 회차를 실제 납입일에 놓은 월 달력이다(업무 규칙 WP21 §6).
 * 표(`table`)는 요일 머리 + 날짜 칸(날짜·영업일/휴일 표시·회차 줄·날짜 합계), 740px 이하에서는 회차가 있는 날만 목록으로 바꿔 보인다.
 * 상태는 언제나 글자 라벨(납입·납입 임박·예정·연체·상실 청구)과 함께 보인다. 달은 ?month=YYYY-MM, 없으면 영업일의 달.
 */
export default function CalendarPage() {
  const [params] = useSearchParams();
  const raw = params.get("month");
  const requested = raw && MONTH_RE.test(raw) ? raw : undefined;
  const cal = useLoad<PaymentCalendar>(signal => certificatesApi.calendar(requested, signal), [requested]);
  const data = cal.data;
  // 다른 달을 불러오는 동안에도 머리에는 고른 달을 보인다(직전 응답의 달이 아니라).
  const month = requested ?? data?.month;
  const currentMonth = data ? data.businessDate.slice(0, 7) : undefined;
  useEffect(() => { setDocumentTitle(month ? `납입 캘린더 ${monthTitle(month)}` : "납입 캘린더"); }, [month]);

  return (
    <>
      <SubPageHeader
        section="sandbox"
        current="/sandbox/calendar"
        title="납입 캘린더"
        description="내 모든 모의 계약의 회차를 실제 납입일에 놓은 달력이에요. 약정일이 토·일이면 실제 납입일은 다음 월요일이고, 날짜는 모두 샌드박스 영업일(가상 오늘) 기준이에요."
        meta={data ? <>영업일 {formatDate(data.businessDate)} · {monthTitle(data.month)} 회차 {data.count}건</> : "불러오고 있어요"}
      />
      <main className="page-main cal">
        {month && (
          <nav className="cal-nav" aria-label="달 이동">
            <Link className="btn btn-secondary btn-small" to={`/sandbox/calendar?month=${shiftMonth(month, -1)}`}><Icon name="prev" size={16} /> 이전 달</Link>
            <h2 className="cal-title" aria-live="polite">{monthTitle(month)}</h2>
            <Link className="btn btn-secondary btn-small" to={`/sandbox/calendar?month=${shiftMonth(month, 1)}`}>다음 달 <Icon name="next" size={16} /></Link>
            {currentMonth && currentMonth !== month && <Link className="cal-today-link" to={`/sandbox/calendar?month=${currentMonth}`}>영업일이 있는 달로</Link>}
          </nav>
        )}
        {raw && !requested && <p className="form-error" role="alert">달 형식이 올바르지 않아 영업일이 있는 달을 보여 줘요. 주소의 month 는 2026-04처럼 써요.</p>}

        {cal.error ? <LoadError error={cal.error} onRetry={cal.reload} /> : !data || cal.loading ? <Loading message="납입 일정을 모으고 있어요" minHeight={520} /> : (
          <>
            <dl className="figure-row" style={{ "--figure-cols": 4 } as CSSProperties}>
              <div><dt>그 달 납입액</dt><dd><Money value={data.payment} /><small>회차 {data.count}건</small></dd></div>
              <div><dt>납입한 금액</dt><dd><Money value={data.paid} /><small>납입 {data.statusCounts.paid}건</small></dd></div>
              <div><dt>남은 금액</dt><dd className={data.statusCounts.overdue + data.statusCounts.accelerated > 0 ? "danger" : undefined}><Money value={data.remaining} /></dd></div>
              <div><dt>상태</dt><dd className="cal-counts">{STATUS_ORDER.filter(s => countOf(data, s) > 0).map(s => `${CALENDAR_STATUS[s].label} ${countOf(data, s)}`).join(" · ") || "회차 없음"}</dd></div>
            </dl>

            {data.count === 0 && <p className="cal-empty-note">{monthTitle(data.month)}에는 실제 납입일이 오는 회차가 없어요. 계약이 없다면 <Link to="/sandbox/apply">대출을 신청</Link>하고, 있다면 이전·다음 달로 옮겨 봐요.</p>}

            <div className="cal-grid">
              <table className="table cal-table">
                <caption>{monthTitle(data.month)} 납입 일정<span className="table-caption-note">칸마다 실제 납입일이 그날인 회차: 계약번호 끝 6자리·회차·납입액·상태. 오늘(영업일)은 강조, 토·일은 휴일이다.</span></caption>
                <thead><tr>{WEEKDAYS.map(w => <th key={w.short} scope="col" abbr={w.long}>{w.short}</th>)}</tr></thead>
                <tbody>
                  {weeks(data.days).map((week, i) => (
                    <tr key={i}>
                      {week.map((day, j) => day === null ? <td key={`e${j}`} className="cal-cell is-blank" /> : <DayCell key={day.date} day={day} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ol className="cal-list" aria-label={`${monthTitle(data.month)} 회차 목록`}>
              {data.days.filter(d => d.items.length > 0 || d.today).map(d => (
                <li key={d.date} className={d.today ? "is-today" : undefined}>
                  <h3>{formatDate(d.date)} ({WEEKDAYS[d.dayOfWeek % 7].short}){d.today && <span className="cal-tag is-today">영업일</span>}</h3>
                  {d.items.length === 0 ? <p className="muted">이 날 납입할 회차가 없어요.</p> : (
                    <ul>
                      {d.items.map(item => (
                        <li key={`${item.contractId}-${item.installmentNo}`}>
                          <Link to={`/sandbox/contracts/${item.contractId}`}>{item.contractNo}</Link>
                          <span className="cal-list-meta">{item.productName} · {item.installmentNo}회 · 약정일 {formatDate(item.dueDate)}{item.paidOn && ` · 납입 ${formatDate(item.paidOn)}`}</span>
                          <span className="cal-list-amount"><Money value={item.payment} /> <ItemStatus item={item} /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            <section className="cal-legend" aria-labelledby="cal-legend-title">
              <h3 id="cal-legend-title">상태와 표시</h3>
              <dl>
                {STATUS_ORDER.map(s => <div key={s}><dt><StatusChip label={CALENDAR_STATUS[s].label} tone={CALENDAR_STATUS[s].tone} /></dt><dd>{CALENDAR_STATUS[s].description}</dd></div>)}
                <div><dt><span className="cal-tag is-today">영업일</span></dt><dd>샌드박스의 가상 오늘. 일마감을 돌리면 하루씩 넘어간다</dd></div>
                <div><dt><span className="cal-tag">휴일</span></dt><dd>토·일. 약정일이 이날이면 실제 납입일은 다음 월요일이다(공휴일은 다루지 않는다)</dd></div>
              </dl>
            </section>
            <Disclosure />
          </>
        )}

        <nav className="next-actions" aria-label="다음 행동">
          <Link to="/sandbox">내 모의 여신(시간 진행) <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/certificates">증명서 발급 <Icon name="next" size={16} /></Link>
          <Link to="/sandbox/notifications">알림함 <Icon name="next" size={16} /></Link>
        </nav>
      </main>
    </>
  );
}

function countOf(data: PaymentCalendar, status: CalendarItemStatus): number {
  const key = { PAID: "paid", DUE: "due", SCHEDULED: "scheduled", OVERDUE: "overdue", ACCELERATED: "accelerated" } as const;
  return data.statusCounts[key[status]];
}

function ItemStatus({ item }: { item: CalendarItem }) {
  const s = CALENDAR_STATUS[item.status];
  const detail = item.status !== "PAID" && item.paid > 0 ? ` 남은 ${formatNumber(item.remaining)}원` : undefined;
  return <StatusChip label={s.label} tone={s.tone} detail={detail} />;
}

function DayCell({ day }: { day: CalendarDay }) {
  const classes = ["cal-cell", day.today && "is-today", day.weekend && "is-weekend", day.past && "is-past"].filter(Boolean).join(" ");
  return (
    <td className={classes} aria-current={day.today ? "date" : undefined}>
      <div className="cal-date">
        <span className="cal-day">{dayNumber(day.date)}</span>
        {day.today && <span className="cal-tag is-today">영업일</span>}
        {day.weekend && <span className="cal-tag">휴일</span>}
      </div>
      {day.items.length > 0 && (
        <ul className="cal-items">
          {day.items.map(item => (
            <li key={`${item.contractId}-${item.installmentNo}`} className={`cal-item is-${CALENDAR_STATUS[item.status].tone}`}>
              <Link to={`/sandbox/contracts/${item.contractId}`} title={`${item.contractNo} · ${item.productName} · 약정일 ${formatDate(item.dueDate)}`}>
                <span className="cal-item-name">{shortContractNo(item.contractNo)} · {item.installmentNo}회</span>
                <Money value={item.payment} />
                <span className="cal-item-status">{CALENDAR_STATUS[item.status].label}{item.status !== "PAID" && item.paid > 0 ? " · 일부 납입" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {day.items.length > 1 && <p className="cal-total">합계 <Money value={day.payment} /></p>}
    </td>
  );
}
