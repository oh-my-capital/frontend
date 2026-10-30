/** 보호 화면에서 넘어왔으면 그 주소로 돌려보낸다. 외부 주소(//host)로는 보내지 않는다. */
export function safeReturnPath(from: unknown, fallback = "/"): string {
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}
