import { ApiError, errorMessage } from "../api/client";

/**
 * 불러오기 실패 안내: 무엇이 잘못됐고 무엇을 하면 되는지 문장으로, 다시 시도 버튼, 요청 ID는 작은 글자.
 * error 를 넘기면 ApiError 메시지·요청 ID를 꺼내고, message 를 넘기면 그 문장을 우선한다.
 */
export default function LoadError({ error, message, onRetry }: { error?: unknown; message?: string; onRetry?: () => void }) {
  const text = message ?? errorMessage(error, "내용을 불러오지 못했어요. 잠시 뒤 다시 시도해요.");
  const requestId = error instanceof ApiError ? error.requestId : "";
  return (
    <div className="state-box is-error" role="alert">
      <p>{text}</p>
      {onRetry && <button type="button" className="btn btn-secondary btn-small" onClick={onRetry}>다시 시도</button>}
      {requestId && <span className="request-id">요청 ID {requestId}</span>}
    </div>
  );
}
