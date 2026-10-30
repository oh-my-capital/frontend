import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** 숫자 열이면 true: 오른쪽 정렬·tabular-nums. */
  numeric?: boolean;
  /** 이 열이 행의 머리(th scope="row")면 true. 첫 열에 주로 쓴다. */
  rowHeader?: boolean;
  render: (row: Row, index: number) => ReactNode;
  width?: string;
}

interface Props<Row> {
  caption: ReactNode;
  captionNote?: ReactNode;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string | number;
  /** 열이 많으면 true: 표만 가로 스크롤(페이지는 스크롤 없음). */
  scroll?: boolean;
  compact?: boolean;
  footer?: ReactNode;
  emptyMessage?: string;
}

/** 표: caption·th scope 필수, 숫자 열 오른쪽 정렬(ui-guidelines §5). */
export default function DataTable<Row>({ caption, captionNote, columns, rows, rowKey, scroll = false, compact = false, footer, emptyMessage = "표시할 내용이 없어요." }: Props<Row>) {
  const table = (
    <table className={`table${compact ? " table-compact" : ""}`}>
      <caption>{caption}{captionNote && <span className="table-caption-note">{captionNote}</span>}</caption>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} scope="col" className={col.numeric ? "num" : undefined} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={columns.length} className="muted">{emptyMessage}</td></tr>
        )}
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map(col => {
              const className = col.numeric ? "num" : undefined;
              return col.rowHeader
                ? <th key={col.key} scope="row" className={className}>{col.render(row, index)}</th>
                : <td key={col.key} className={className}>{col.render(row, index)}</td>;
            })}
          </tr>
        ))}
      </tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );
  return scroll ? <div className="table-scroll">{table}</div> : table;
}
