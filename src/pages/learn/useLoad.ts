import { useCallback, useEffect, useState } from "react";

/**
 * 화면 하나가 쓰는 단순 불러오기 훅. 경로가 바뀌면 다시 받고, 언마운트·재요청 시 이전 요청을 abort 한다.
 * 반환: data(없으면 null) · error · retry. 로딩 중인지는 data === null && !error 로 본다.
 */
export function useLoad<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    loader(controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const retry = useCallback(() => setTick(t => t + 1), []);
  return { data, error, retry };
}
