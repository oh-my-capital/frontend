import type { Figure } from "../api/types";

/**
 * 손으로 배치한 그림(ConceptDiagram 의 DIAGRAMS)이 없는 콘텐츠 그림을 노드 순서대로 잇는 단계 흐름으로 그린다.
 * 이웃한 두 노드를 잇는 엣지는 화살표 줄에 라벨로, 이웃하지 않는 엣지(허브·되돌아가는 흐름)는 아래 "그 밖의 연결"에 글로 둔다.
 * SVG 를 늘이지 않으므로 375px 에서도 글자 크기가 그대로다. 색은 노드 종류(kind)마다 토큰만 쓰고 종류 이름을 글로도 단다.
 */
const KIND_LABEL: Record<string, string> = { company: "회사", person: "사람", asset: "돈·상태" };

export default function FigureFlow({ figure }: { figure: Figure }) {
  const order = new Map(figure.nodes.map((node, i) => [node.id, i]));
  const label = (id: string) => figure.nodes.find(node => node.id === id)?.label ?? id;
  const between = (a: string, b: string) => figure.edges.find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const others = figure.edges.filter(e => Math.abs((order.get(e.from) ?? -9) - (order.get(e.to) ?? -9)) !== 1);
  return (
    <figure className="figure-frame figure-flow">
      <figcaption>{figure.title}</figcaption>
      <ol className="figure-flow-steps">
        {figure.nodes.map((node, i) => {
          const next = figure.nodes[i + 1];
          const edge = next ? between(node.id, next.id) : undefined;
          return (
            <li key={node.id}>
              <span className={`figure-flow-node kind-${node.kind ?? "asset"}`}>
                <strong>{node.label}</strong>
                {node.kind && KIND_LABEL[node.kind] && <small>{KIND_LABEL[node.kind]}</small>}
              </span>
              {next && (
                <span className="figure-flow-link" aria-label={edge ? `${edge.from === node.id ? "다음으로" : "앞으로"}: ${edge.label ?? ""}` : "다음"}>
                  <i aria-hidden="true">{edge && edge.from !== node.id ? "↑" : "↓"}</i>
                  {edge?.label && <span>{edge.label}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {others.length > 0 && (
        <dl className="figure-flow-others">
          <dt>그 밖의 연결</dt>
          {others.map((e, i) => <dd key={`${e.from}-${e.to}-${i}`}>{label(e.from)} → {label(e.to)}{e.label ? ` · ${e.label}` : ""}</dd>)}
        </dl>
      )}
    </figure>
  );
}
