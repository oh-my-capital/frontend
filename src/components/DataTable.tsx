import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** 숫자 열이면 true: 오른쪽 정렬·tabular-nums. */
  numeric?: boolean;
  /** 이 열이 행의 머리(th scope="row")면 true. 첫 열에 주로 쓴다. */
  rowHeader?: boolean;
  /** 셀 안에서 줄을 바꾸지 않는다(날짜·코드·상태 chip 열). 열이 많아지면 scroll 과 함께 쓴다. */
  nowrap?: boolean;
  render: (row: Row, index: number) => ReactNode;
  width?: string;
}

interface Props<Row> {
  caption: ReactNode;
  captionNote?: ReactNode;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string | number;
  /** 이 키의 행을 "선택됨"으로 표시한다(배경 tint + aria-current). 목록·상세를 나눠 보일 때 쓴다. */
  selectedKey?: string | number | null;
  /** 열이 많으면 true: 표만 가로 스크롤(페이지는 스크롤 없음). */
  scroll?: boolean;
  compact?: boolean;
  footer?: ReactNode;
  emptyMessage?: string;
}

function cellClass(col: { numeric?: boolean; nowrap?: boolean }): string | undefined {
  const classes = [col.numeric && "num", col.nowrap && "nowrap"].filter(Boolean);
  return classes.length ? classes.join(" ") : undefined;
}

/** 표: caption·th scope 필수, 숫자 열 오른쪽 정렬(ui-guidelines §5). */
export default function DataTable<Row>({ caption, captionNote, columns, rows, rowKey, selectedKey, scroll = false, compact = false, footer, emptyMessage = "표시할 내용이 없어요." }: Props<Row>) {
  const table = (
    <table className={`table${compact ? " table-compact" : ""}`}>
      <caption>{caption}{captionNote && <span className="table-caption-note">{captionNote}</span>}</caption>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} scope="col" className={cellClass(col)} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={columns.length} className="muted">{emptyMessage}</td></tr>
        )}
        {rows.map((row, index) => {
          const key = rowKey(row, index);
          const selected = selectedKey !== undefined && selectedKey !== null && key === selectedKey;
          return (
            <tr key={key} className={selected ? "is-selected" : undefined} aria-current={selected ? "true" : undefined}>
              {columns.map(col => {
                const className = cellClass(col);
                return col.rowHeader
                  ? <th key={col.key} scope="row" className={className}>{col.render(row, index)}</th>
                  : <td key={col.key} className={className}>{col.render(row, index)}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );
  return scroll ? <div className="table-scroll">{table}</div> : table;
}
