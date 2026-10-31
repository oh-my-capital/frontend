import { Link } from "react-router-dom";
import Icon from "../../../components/Icon";

/** 계약 상세(S-15)의 다음 행동 줄에 넣는 "증명서 발급" 링크(WP21). 발급 화면에서 이 계약을 미리 고른다. */
export default function CertificateLink({ contractId }: { contractId: number }) {
  return <Link to={`/sandbox/certificates?contractId=${contractId}`}>증명서 발급 <Icon name="next" size={16} /></Link>;
}
