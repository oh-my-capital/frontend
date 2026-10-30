# frontend

CapiMATE 웹. React 19 + Vite + TypeScript, react-router 7, `@remixicon/react`, oxlint. API 클라이언트 `src/api/client.ts`, 타입 `src/api/types.ts`. 포트 5190, `/api` 프록시 → 8090.

## 명령

- Node 버전: `.nvmrc`
- `npm ci` → `npm run dev` (http://localhost:5190). 백엔드 없이: `VITE_MOCK=1 npm run dev`
- 검증: `npm run lint` 그리고 `npm run build`

## 규칙

- **디자인 기준은 docs `design/ui-guidelines.md` 하나다.** 금지 목록 위반은 반려. PR에 검수 체크리스트와 1440·375 스크린샷을 붙인다.
- UI 라이브러리·Tailwind·차트 라이브러리 금지(ADR-015). 그래프는 인라인 SVG, 표는 `table`.
- 디렉터리 소유: `components/`·`styles/tokens.css`·`base.css`·`brand.css`·`context/`·`api/client.ts`·`api/types.ts`는 WP5. `pages/learn`·`pages/glossary`는 WP6, `pages/calculators`·`pages/sandbox`는 WP7, `pages/admin`은 WP8. 각 WP는 자기 `styles/<영역>.css`·`api/<영역>.ts`만 고친다.
- 배포 환경은 같은 origin `/api`를 쓴다. API 주소를 코드에 하드코딩하지 않는다. `VITE_` 변수는 공개되므로 비밀값을 넣지 않는다.
- 백엔드 응답 타입이 바뀌면 `types.ts`와 docs의 API 계약을 함께 맞춘다.
- 모든 계산 결과 아래에 `Disclosure` 컴포넌트. 금액은 tabular-nums·우측 정렬.

## 협업 규칙

- 작업 묶음(WP)과 담당은 docs `project/work-plan.md`를 따른다. 맡지 않은 WP의 파일은 고치지 않는다.
- 브랜치 `wp<번호>-<이름>`에서 작업하고 `main`에는 PR로 합친다. force push 금지.
- API·환경변수·상태 확인 경로를 바꾸면 먼저 docs `contracts/`를 고친다(`runtime.md`). 계산 규칙을 바꾸면 먼저 docs `domain/`을 고친다.
- 커밋 메시지는 `feat(scope): 한국어 요약` 형식. 주석·문서는 한국어. AI 공동 작성자 트레일러·생성 문구 금지.
- 비밀값, `.env`(예시 제외), Terraform state, 실제 `*.tfvars`는 커밋하지 않는다.
- `terraform apply`, 클라우드 리소스 생성, 원격 저장소 설정 변경은 사람의 확인 후에만 한다.
- 교육용 모의 서비스다. 실제 대출·실명·실계좌·주민번호·실제 신용조회·추심 기능은 만들지 않는다.
