/**
 * 개념 그림: 노드·엣지 JSON → 인라인 SVG(ui-guidelines §7). 선 1.5px, 색은 토큰만, 글자는 SVG text.
 * 콘텐츠의 figure 식별자는 DIAGRAMS 에 둔다(WP5). 모르는 식별자는 null 을 돌려 그림 없이 본문만 보이게 한다.
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

/**
 * 콘텐츠 figure 식별자 → 그림 정의(개념 12편의 그림 12종). 식별자는 콘텐츠 sections[].figure 와 같다.
 * 숫자는 docs/domain/business-rules.md·calculation-examples.md 의 값만 쓴다. 색은 tone(토큰)만 지정한다.
 * 양방향 흐름(할부·리스)은 가로 한 줄이 아니라 삼각형 배치로 두어 엣지 라벨이 노드와 겹치지 않게 한다.
 */
export const DIAGRAMS: Record<string, DiagramSpec> = {
  "auto-installment-flow": {
    title: "자동차 할부의 돈의 흐름: 캐피탈이 판매사에 차량 대금을 지급하고 고객이 캐피탈에 나눠 갚는다",
    width: 640, height: 250,
    nodes: [
      { id: "dealer", label: "판매사", sub: "자동차 대리점", x: 20, y: 20 },
      { id: "customer", label: "고객", sub: "차주", x: 470, y: 20 },
      { id: "capital", label: "캐피탈", sub: "여신전문금융회사", x: 245, y: 170, tone: "primary" },
    ],
    edges: [
      { from: "capital", to: "dealer", label: "차량 대금 일시 지급" },
      { from: "dealer", to: "customer", label: "차량 인도", dashed: true },
      { from: "customer", to: "capital", label: "매월 할부금(원금+이자)" },
    ],
    caption: "할부금융에서는 물건(차량)이 있고, 캐피탈이 먼저 대금을 내고 고객이 나눠 갚는다.",
  },
  "credit-finance-four-businesses": {
    title: "여신전문금융업 네 업무: 신용카드·할부금융·시설대여·신기술사업금융이 각각 누구에게 돈을 내보내는가",
    width: 700, height: 300,
    nodes: [
      { id: "co", label: "여신전문금융회사", sub: "수신 없음 · 여신만", x: 275, y: 123, tone: "primary" },
      { id: "card", label: "신용카드업", sub: "가맹점에 대금 선지급", x: 20, y: 20 },
      { id: "inst", label: "할부금융업", sub: "판매자에 물건값 지급", x: 530, y: 20 },
      { id: "lease", label: "시설대여업(리스)", sub: "물건 사서 빌려줌", x: 20, y: 226 },
      { id: "tech", label: "신기술사업금융업", sub: "기술 기업 투자·융자", x: 530, y: 226 },
    ],
    edges: [
      { from: "co", to: "card" }, { from: "co", to: "inst" }, { from: "co", to: "lease" }, { from: "co", to: "tech" },
    ],
    caption: "네 업무 모두 회사가 먼저 돈을 내보내고 뒤에 회원·고객·이용자에게서 회수한다. 이 서비스는 할부금융과 신용대출을 다룬다.",
  },
  "funding-structure": {
    title: "자금 조달 구조: 은행은 예금자의 돈으로, 캐피탈은 회사채 투자자의 돈으로 대출한다",
    width: 720, height: 250,
    nodes: [
      { id: "saver", label: "예금자", sub: "예금", x: 20, y: 20 },
      { id: "bank", label: "은행·저축은행", sub: "수신 + 여신", x: 285, y: 20, tone: "primary" },
      { id: "b1", label: "차주", sub: "대출 고객", x: 550, y: 20 },
      { id: "investor", label: "투자자", sub: "회사채 매입", x: 20, y: 160 },
      { id: "capital", label: "캐피탈", sub: "여신만", x: 285, y: 160, tone: "accent" },
      { id: "b2", label: "차주", sub: "대출 고객", x: 550, y: 160 },
    ],
    edges: [
      { from: "saver", to: "bank", label: "예금" }, { from: "bank", to: "b1", label: "대출" },
      { from: "investor", to: "capital", label: "회사채·차입" }, { from: "capital", to: "b2", label: "대출" },
    ],
    caption: "회사채 금리는 보통 예금 금리보다 높아 캐피탈의 조달 비용이 더 들고, 그 차이가 대출 금리에 반영된다.",
  },
  "lease-flow": {
    title: "리스의 돈의 흐름: 리스사가 물건을 사서 이용자에게 빌려주고 매월 리스료를 받는다. 소유권은 리스사에 있다",
    width: 640, height: 250,
    nodes: [
      { id: "seller", label: "판매자", sub: "물건 공급", x: 20, y: 20 },
      { id: "lessee", label: "이용자", sub: "사용권만", x: 470, y: 20 },
      { id: "lessor", label: "캐피탈(리스사)", sub: "소유권 보유", x: 245, y: 170, tone: "primary" },
    ],
    edges: [
      { from: "lessor", to: "seller", label: "물건 대금" },
      { from: "seller", to: "lessee", label: "물건 인도", dashed: true },
      { from: "lessee", to: "lessor", label: "매월 리스료" },
    ],
    caption: "할부는 고객 명의에 담보만 잡지만, 리스는 리스사 명의이고 이용자는 사용권만 가진다.",
  },
  "rate-structure": {
    title: "적용 금리의 구성: 기준금리에 신용 스프레드를 더하고 우대금리를 뺀 뒤 20.00% 상한을 적용한다",
    width: 700, height: 120,
    nodes: [
      { id: "base", label: "기준금리", sub: "신용대출 5.90 · 할부 4.50", x: 20, y: 33 },
      { id: "spread", label: "+ 신용 스프레드", sub: "밴드별 0.0~9.0%p", x: 190, y: 33 },
      { id: "disc", label: "− 우대금리", sub: "자동이체 0.20%p", x: 360, y: 33 },
      { id: "applied", label: "적용 금리", sub: "상한 20.00%", x: 530, y: 33, tone: "accent" },
    ],
    edges: [{ from: "base", to: "spread" }, { from: "spread", to: "disc" }, { from: "disc", to: "applied" }],
    caption: "예: 신용대출·820점(B밴드)·자동이체 없음 → 5.90 + 2.00 = 7.90%(계산 예시 6).",
  },
  "repayment-compare": {
    title: "같은 조건(1,000만 원·12회·연 12%)에서 세 상환 방식의 월 납입액과 총이자 비교",
    width: 700, height: 250,
    nodes: [
      { id: "cond", label: "같은 조건", sub: "1,000만 원 · 12회 · 연 12%", x: 240, y: 20, w: 220, tone: "primary" },
      { id: "ep", label: "원리금균등", sub: "매월 888,488 · 총이자 661,851", x: 10, y: 160, w: 220 },
      { id: "epr", label: "원금균등", sub: "933,333→841,670 · 총이자 649,996", x: 240, y: 160, w: 220, tone: "accent" },
      { id: "bullet", label: "만기일시", sub: "100,000→10,100,000 · 총이자 1,200,000", x: 470, y: 160, w: 220 },
    ],
    edges: [{ from: "cond", to: "ep" }, { from: "cond", to: "epr" }, { from: "cond", to: "bullet" }],
    caption: "잔액이 빨리 줄수록 총이자가 적다. 월 부담이 가장 작은 만기일시가 총이자는 가장 크다(계산 예시 1~3).",
  },
  "limit-three-caps": {
    title: "한도를 정하는 세 기준(상품 최대·소득배수·DSR 역산) 중 가장 작은 값이 최종 한도가 된다",
    width: 640, height: 250,
    nodes: [
      { id: "product", label: "상품 최대", sub: "5,000만 / 차량가×90%", x: 20, y: 20 },
      { id: "income", label: "소득배수", sub: "연소득 × 밴드 배수", x: 245, y: 20 },
      { id: "dsr", label: "DSR 역산", sub: "월 여유로 갚을 최대 원금", x: 470, y: 20 },
      { id: "final", label: "최종 한도", sub: "셋 중 최소 · 만 원 절사", x: 245, y: 160, tone: "accent" },
    ],
    edges: [{ from: "product", to: "final" }, { from: "income", to: "final", label: "가장 작은 값" }, { from: "dsr", to: "final" }],
    caption: "계산 예시 6: min(50,000,000, 57,600,000, 47,938,249) → 47,930,000원. 한도를 결정한 규칙은 DSR 역산이다.",
  },
  "screening-pipeline": {
    title: "심사 네 단계: 자격 → 금리 → 한도 → 결정",
    width: 700, height: 120,
    nodes: [
      { id: "elig", label: "① 자격", sub: "나이·소득·점수·상품", x: 20, y: 33 },
      { id: "rate", label: "② 금리", sub: "기준 + 스프레드 − 우대", x: 190, y: 33 },
      { id: "limit", label: "③ 한도", sub: "min(상품·소득배수·DSR)", x: 360, y: 33 },
      { id: "decision", label: "④ 결정", sub: "승인·조건부·거절", x: 530, y: 33, tone: "accent" },
    ],
    edges: [{ from: "elig", to: "rate" }, { from: "rate", to: "limit" }, { from: "limit", to: "decision" }],
    caption: "자격에서 하나라도 실패하면 거절이지만 나머지 자격 규칙도 평가해 사유를 모두 보여 준다.",
  },
  "overdue-timeline": {
    title: "연체 타임라인: 납입일 미납 → 다음 날 연체 1일 → 30일 요주의 → 45일 통지 → 60일 기한이익상실",
    width: 770, height: 120,
    nodes: [
      { id: "due", label: "납입일", sub: "자동이체 실패·미납", x: 20, y: 33, w: 130 },
      { id: "d1", label: "다음 날", sub: "연체일수 1 · 이자 시작", x: 170, y: 33, w: 130 },
      { id: "d30", label: "연체 30일", sub: "분류 요주의", x: 320, y: 33, w: 130 },
      { id: "d45", label: "연체 45일", sub: "상실 예정 통지", x: 470, y: 33, w: 130 },
      { id: "d60", label: "연체 60일", sub: "기한이익상실", x: 620, y: 33, w: 130, tone: "accent" },
    ],
    edges: [{ from: "due", to: "d1" }, { from: "d1", to: "d30" }, { from: "d30", to: "d45" }, { from: "d45", to: "d60" }],
    caption: "상실 전에는 미납 회차 납입액에만, 상실 후에는 잔액 전체에 연체이자가 붙는다.",
  },
  "acceleration-steps": {
    title: "기한이익상실 절차: 연체 45일 통지 → 60일 상실 → 잔액 전체 청구",
    width: 800, height: 150,
    nodes: [
      { id: "notice", label: "연체 45일", sub: "상실 예정 통지", x: 20, y: 48 },
      { id: "default", label: "연체 60일", sub: "계약 DEFAULTED", x: 325, y: 48, tone: "primary" },
      { id: "claim", label: "전액 청구", sub: "잔액 전체 + 연체이자", x: 630, y: 48, tone: "accent" },
    ],
    edges: [{ from: "notice", to: "default", label: "15일 안에 정리 없으면" }, { from: "default", to: "claim", label: "분할 상환 권리 상실" }],
    caption: "상실 후 자동이체는 전액 기준으로만 시도하고, 전액을 갚으면 계약은 완제로 끝난다.",
  },
  "asset-class-ladder": {
    title: "건전성 분류 5단계와 적립률: 정상 1% → 요주의 10% → 고정 20% → 회수의문 75% → 추정손실 100%",
    width: 770, height: 120,
    nodes: [
      { id: "normal", label: "정상", sub: "0~29일 · 1%", x: 20, y: 33, w: 130 },
      { id: "prec", label: "요주의", sub: "30~89일 · 10%", x: 170, y: 33, w: 130 },
      { id: "sub", label: "고정", sub: "90~179일 · 20%", x: 320, y: 33, w: 130 },
      { id: "doubt", label: "회수의문", sub: "180~364일 · 75%", x: 470, y: 33, w: 130 },
      { id: "loss", label: "추정손실", sub: "365일+ · 100%", x: 620, y: 33, w: 130, tone: "accent" },
    ],
    edges: [{ from: "normal", to: "prec" }, { from: "prec", to: "sub" }, { from: "sub", to: "doubt" }, { from: "doubt", to: "loss" }],
    caption: "일수 경계와 적립률은 교육용 가정값이다. 충당금 = floor(잔여 원금 × 적립률).",
  },
  "prepayment-flow": {
    title: "전액 중도상환액의 구성: 잔액 + 경과이자 + 수수료(계산 예시 5)",
    width: 640, height: 250,
    nodes: [
      { id: "balance", label: "잔액", sub: "5,149,209", x: 20, y: 20, tone: "primary" },
      { id: "accrued", label: "경과이자", sub: "10일 · 16,928", x: 245, y: 20 },
      { id: "fee", label: "수수료", sub: "174/365일 · 17,182", x: 470, y: 20 },
      { id: "total", label: "총 상환액", sub: "5,183,319", x: 245, y: 160, tone: "accent" },
    ],
    edges: [{ from: "balance", to: "total" }, { from: "accrued", to: "total" }, { from: "fee", to: "total" }],
    caption: "수수료는 상환 원금 × 0.7% × 잔존일수 ÷ 대출기간 일수이며 만기에 가까울수록 줄어든다.",
  },
};

export function diagramFor(figure: string | null | undefined): DiagramSpec | null {
  return figure ? DIAGRAMS[figure] ?? null : null;
}
