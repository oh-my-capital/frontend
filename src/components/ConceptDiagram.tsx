/**
 * 개념 그림: 노드·엣지 JSON → 인라인 SVG(ui-guidelines §7). 선 1.5px, 색은 토큰만, 글자는 SVG text.
 * 콘텐츠의 figure 식별자는 WP6이 DIAGRAMS 에 추가한다. 모르는 식별자는 null 을 돌려 그림 없이 본문만 보이게 한다.
 */
export interface DiagramNode { id: string; label: string; sub?: string; x: number; y: number; w?: number; h?: number; tone?: "plain" | "primary" | "accent" }
export interface DiagramEdge { from: string; to: string; label?: string; dashed?: boolean }
export interface DiagramSpec { title: string; width?: number; height?: number; nodes: DiagramNode[]; edges: DiagramEdge[]; caption?: string }

const NODE_W = 150;
const NODE_H = 54;
const STROKE = { plain: "var(--border-strong)", primary: "var(--primary)", accent: "var(--accent)" } as const;
const FILL = { plain: "var(--surface)", primary: "var(--primary-tint)", accent: "var(--accent-tint)" } as const;

function center(node: DiagramNode) {
  return { cx: node.x + (node.w ?? NODE_W) / 2, cy: node.y + (node.h ?? NODE_H) / 2, w: node.w ?? NODE_W, h: node.h ?? NODE_H };
}

/** 노드 테두리에서 다른 노드 방향으로 선이 시작되게 교점을 구한다. */
function anchor(from: DiagramNode, to: DiagramNode) {
  const a = center(from), b = center(to);
  const dx = b.cx - a.cx, dy = b.cy - a.cy;
  if (dx === 0 && dy === 0) return { x: a.cx, y: a.cy };
  const sx = a.w / 2 / Math.abs(dx || 1e-9), sy = a.h / 2 / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return { x: a.cx + dx * s, y: a.cy + dy * s };
}

export default function ConceptDiagram({ spec }: { spec: DiagramSpec }) {
  const width = spec.width ?? 640;
  const height = spec.height ?? 240;
  const byId = new Map(spec.nodes.map(n => [n.id, n]));
  return (
    <figure className="concept-diagram">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title} fontFamily="inherit" fontSize="14">
        <defs>
          <marker id="cd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--text-muted)" />
          </marker>
        </defs>
        {spec.edges.map((edge, i) => {
          const from = byId.get(edge.from), to = byId.get(edge.to);
          if (!from || !to) return null;
          const p1 = anchor(from, to), p2 = anchor(to, from);
          const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
          return (
            <g key={`${edge.from}-${edge.to}-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray={edge.dashed ? "5 4" : undefined} markerEnd="url(#cd-arrow)" />
              {edge.label && (
                <text x={mx} y={my - 8} textAnchor="middle" fill="var(--accent)" fontSize="13" fontWeight="700">{edge.label}</text>
              )}
            </g>
          );
        })}
        {spec.nodes.map(node => {
          const tone = node.tone ?? "plain";
          const { cx, cy, w, h } = center(node);
          return (
            <g key={node.id}>
              <rect x={node.x} y={node.y} width={w} height={h} fill={FILL[tone]} stroke={STROKE[tone]} strokeWidth="1.5" />
              <text x={cx} y={node.sub ? cy - 4 : cy + 5} textAnchor="middle" fill="var(--text)" fontWeight="700">{node.label}</text>
              {node.sub && <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--text-muted)" fontSize="12">{node.sub}</text>}
            </g>
          );
        })}
      </svg>
      {spec.caption && <figcaption>{spec.caption}</figcaption>}
    </figure>
  );
}

/** 콘텐츠 figure 식별자 → 그림 정의. WP6이 개념별로 채운다. */
export const DIAGRAMS: Record<string, DiagramSpec> = {
  "auto-installment-flow": {
    title: "자동차 할부의 돈의 흐름: 캐피탈이 판매사에 차량 대금을 지급하고 고객이 캐피탈에 나눠 갚는다",
    width: 640,
    height: 230,
    nodes: [
      { id: "customer", label: "고객", sub: "차주", x: 20, y: 88, tone: "plain" },
      { id: "capital", label: "캐피탈", sub: "여신전문금융회사", x: 245, y: 88, tone: "primary" },
      { id: "dealer", label: "판매사", sub: "자동차 대리점", x: 470, y: 88, tone: "plain" },
    ],
    edges: [
      { from: "capital", to: "dealer", label: "차량 대금 일시 지급" },
      { from: "dealer", to: "customer", label: "차량 인도", dashed: true },
      { from: "customer", to: "capital", label: "매월 할부금(원금+이자)" },
    ],
    caption: "할부금융에서는 물건(차량)이 있고, 캐피탈이 먼저 대금을 내고 고객이 나눠 갚는다.",
  },
};

export function diagramFor(figure: string | null | undefined): DiagramSpec | null {
  return figure ? DIAGRAMS[figure] ?? null : null;
}
