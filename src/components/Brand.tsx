import { Link } from "react-router-dom";

/**
 * CapiMATE 워드마크. 심볼은 장부(원장) 모양의 단순 선형 SVG, 황토색(ui-guidelines §4).
 * 브랜드 이름은 가칭이며 사람이 확정한다(ADR-013). 바꿀 때는 이 파일과 PageTitle·SiteFooter의 이름만 고친다.
 */
export const BRAND_NAME = "CapiMATE";

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label={`${BRAND_NAME} 홈`}>
      <svg className="brand-symbol" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="4" width="22" height="24" />
        <path d="M10 4v24" />
        <path d="M14 11h9M14 16h9M14 21h6" />
      </svg>
      <span className="brand-name">capi<span>mate</span><i>.</i></span>
      {!compact && <span className="brand-caption">여신을 배우는 모의 캐피탈</span>}
    </Link>
  );
}
