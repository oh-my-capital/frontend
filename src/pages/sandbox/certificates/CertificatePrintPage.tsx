import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../api/client";
import { certificatesApi, type Certificate } from "../../../api/certificates";
import LoadError from "../../../components/LoadError";
import Loading from "../../../components/Loading";
import { setDocumentTitle } from "../../../components/PageTitle";
import SubPageHeader from "../../../components/SubPageHeader";
import { formatDate } from "../../../lib/format";
import { useLoad } from "../../calculators/parts/useLoad";
import CertificateDocument from "./CertificateDocument";
import { CERTIFICATE_TYPES, isCertificatePath } from "./labels";
import "../../../styles/certificates.css";

/**
 * 인쇄용 증명서(S-211, `/sandbox/contracts/:id/certificates/:type`, 거래내역은 `?from=&to=`).
 * 화면을 열면 발급으로 기록되지만 같은 영업일·같은 내용이면 같은 발급번호다(새로 고침·인쇄는 재발급이 아니다).
 * "인쇄"는 브라우저 인쇄(window.print)이고, certificates.css 의 @media print 가 공통 머리·바닥·도구 줄을 숨기고 A4 여백과 워터마크만 남긴다.
 */
export default function CertificatePrintPage() {
  const { id, type } = useParams();
  const [params] = useSearchParams();
  const contractId = Number(id);
  const valid = Number.isInteger(contractId) && contractId > 0 && isCertificatePath(type);
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const meta = CERTIFICATE_TYPES.find(t => t.path === type);
  const cert = useLoad<Certificate>(
    signal => certificatesApi.issue(contractId, isCertificatePath(type) ? type : "balance", { from, to }, signal),
    [contractId, type, from, to],
    valid,
  );
  const backTo = valid ? `/sandbox/certificates?contractId=${contractId}` : "/sandbox/certificates";
  const title = meta?.name ?? "증명서";
  const issueNo = cert.data?.issue.issueNo;
  // 인쇄 머리글·PDF 파일 이름에 쓰이므로 발급번호까지 넣는다.
  useEffect(() => { setDocumentTitle(issueNo ? `${title} ${issueNo}` : title); }, [title, issueNo]);

  return (
    <>
      <SubPageHeader section="sandbox" current="/sandbox/certificates" title={title}
        description="교육용 모의 문서예요. 법적 효력이 없고 실제 금융회사가 발급한 증명서가 아니에요. 인쇄하면 화면 머리·바닥과 버튼은 빠지고 문서만 A4 한 장 기준으로 나와요." />
      <main className="page-main cert-print">
        <div className="cert-toolbar" role="toolbar" aria-label="증명서 도구">
          <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!cert.data}>
            인쇄
          </button>
          <Link className="btn btn-secondary" to={backTo}>발급 화면으로</Link>
          {valid && <Link className="btn btn-secondary" to={`/sandbox/contracts/${contractId}`}>계약 상세</Link>}
          {cert.data && (
            <p className="cert-toolbar-note" aria-live="polite">
              {cert.data.issue.reused
                ? `같은 영업일(${formatDate(cert.data.issue.issuedOn)})에 같은 내용으로 발급한 번호 ${cert.data.issue.issueNo}를 다시 보여 줘요.`
                : `발급번호 ${cert.data.issue.issueNo}로 새로 발급했어요.`}
            </p>
          )}
        </div>

        {!valid ? (
          <LoadError message="주소가 올바르지 않아요. 증명서 종류는 부채잔액증명서·완납증명서·거래내역확인서 중 하나예요. 발급 화면에서 다시 골라요." />
        ) : cert.error ? (
          <>
            <LoadError error={cert.error} onRetry={cert.reload} />
            {cert.error instanceof ApiError && cert.error.code === "NOT_PAID_OFF" && (
              <p className="cert-hint">완제 전에는 <Link to={`/sandbox/contracts/${contractId}/certificates/balance`}>부채잔액증명서</Link>로 지금 남은 금액을 확인할 수 있어요.</p>
            )}
          </>
        ) : !cert.data ? (
          <Loading message="증명서를 만들고 있어요" minHeight={480} />
        ) : (
          <CertificateDocument data={cert.data} headingId="cert-print-title" />
        )}
      </main>
    </>
  );
}

