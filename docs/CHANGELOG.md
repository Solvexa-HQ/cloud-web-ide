# 버전 이력 관리 (Changelog)

[← 메인 README로 돌아가기](../README.md)

본 문서는 초기 `v1.0` 코드를 기준으로 각 버전에서 해결한 문제점, 수정 전/후 비교 및 인프라·보안 개선 내역을 축약 없이 상세히 기록합니다.

---

## v1.4 (현재 버전)
기존 **v1.3** 기준 **Solvexa-HQ 그룹(Organization) 레포지토리 전환, 가이드 문서 체계화(`docs/`), 협업용 환경 변수 템플릿 추가 및 메인 허브 레포지토리 분리 설계**가 반영되었습니다.

1. **그룹 레포지토리(`Solvexa-HQ/cloud-web-ide`) 전환 및 1단계 문서 집중화**
   - 개인 레포지토리에서 공동작업 및 포트폴리오 관리를 위해 `Solvexa-HQ` Organization 하위로 원격 저장소(`origin`)를 전환.
   - 본 레포지토리는 **1단계(Cloud Web IDE)** 완성에 집중하도록 문서를 구성하고, 전체 플랫폼(1~3단계)을 아우르는 메인 허브 레포지토리용 템플릿(`docs/MAIN_HUB_README_TEMPLATE.md`)을 별도 마련.

2. **상세 가이드 문서 폴더(`docs/`) 분리 및 내용 보강**
   - 메인 `README.md`의 가독성을 높이면서도 기존에 작성된 기술/운영 노하우가 누락되지 않도록 `docs/` 폴더 하위에 5종의 상세 문서(`ARCHITECTURE.md`, `INFRA_AND_DEPLOYMENT.md`, `COLLABORATION_GUIDE.md`, `CHANGELOG.md`, `MAIN_HUB_README_TEMPLATE.md`)로 체계화하고 상호 링크 연결.

3. **공동작업 지원용 `.env.example` 템플릿 및 협업 가이드 추가**
   - 실제 시크릿 값을 노출하지 않고도 새로운 팀원이 클론 직후 `cp .env.example .env`로 필요한 환경 변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`)를 즉시 파악할 수 있도록 템플릿 파일 추가.

---

## v1.3
기존 **v1.2** 기준 **AWS S3 프로덕션 빌드(`dist/`) 생성, GitHub Actions 기반 S3 자동 배포(CI/CD) 구축, CloudFront 캐시 운영 정책 정립 및 과거 Git 커밋 히스토리 보안 초기화**가 반영되었습니다.

1. **AWS S3 정적 배포용 프로덕션 빌드(`dist/`) 구성**
   - `npm run build`를 통해 S3 정적 웹 호스팅에 즉시 업로드 가능한 최적화된 `dist/` 번들 생성.
   - **보안 조치**: 빌드 결과물(`dist/assets/index-*.js`)에는 프론트엔드 통신을 위해 환경 변수가 인라인으로 번들링되므로, `.gitignore`를 통해 Git 저장소에는 절대 업로드되지 않고 로컬 수동 업로드 또는 GitHub Actions에서 직접 S3로만 전송되도록 격리.

2. **GitHub Actions 기반 AWS S3 자동 배포 파이프라인 구축 (`.github/workflows/deploy.yml`)**
   - `main` 브랜치에 Push 시 자동으로 `npm ci` → `npm run build` (`dist/` 생성) → `aws s3 sync dist/ s3://<버킷명> --delete`를 수행하는 CI/CD 워크플로우 추가.
   - **보안 설계**: 워크플로우 파일 내에는 어떠한 AWS 키나 서버 주소도 하드코딩하지 않으며, 모든 민감 정보(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`)는 **GitHub Repository Secrets**(`${{ secrets.* }}`)를 통해서만 안전하게 주입.

3. **AWS CloudFront(HTTPS) 24시간 캐시 정책 및 무효화(Invalidation) 가이드 추가**
   - S3 앞단에 연결된 CloudFront의 기본 24시간 캐시(TTL) 동작 원리와, 즉시 반영이 필요할 때 AWS 콘솔에서 `/*` 경로로 1회성 무효화(Invalidation)를 실행하는 절차 문서화.

4. **과거 Git 커밋 히스토리 보안 클린업 (History Sanitization)**
   - `.env` 분리 이전에 작성되었던 과거 커밋 로그(Diff)에 남아 있던 백엔드 도메인 흔적을 원천 제거하기 위해 고아 브랜치(`git checkout --orphan`) 기반으로 커밋 히스토리를 깨끗하게 재초기화하고 강제 Push(`git push -f`) 완료.

---

## v1.2
기존 **v1.1** 기준 **백엔드 도메인 보안 은폐 및 EC2 재시작 시 유동 퍼블릭 IP 변경 대응(DDNS 자동 갱신)** 설정이 반영되었습니다.

1. **EC2 백엔드 API 주소 환경 변수(`.env`) 분리 및 은폐**
   - **문제 배경**: `src/App.jsx` 코드 내에 `const API_BASE_URL = 'https://...duckdns.org'` 형태로 EC2 주소가 하드코딩되어 있어, 공개 GitHub 저장소를 통해 임의의 외부인이나 봇이 백엔드 주소를 수집해 무분별한 코드 실행 요청을 보낼 위험이 존재함.
   - **해결 방법**: `API_BASE_URL` 값을 Git 추적에서 제외된 `.env` 파일의 `VITE_API_BASE_URL`로 분리하고, `src/App.jsx`에서는 `import.meta.env.VITE_API_BASE_URL`로 참조하도록 수정하여 GitHub 소스 코드에서 백엔드 도메인을 은폐.

2. **EC2 재시작 시 유동 퍼블릭 IP 변경 대응 (DuckDNS DDNS 자동 업데이트 적용)**
   - **문제 배경**: 비용 절약을 위해 유료 고정 IP(AWS Elastic IP, 시간당 과금 발생)를 쓰지 않고 기본 퍼블릭 IP를 사용하면, EC2 인스턴스를 중지(Stop)했다가 다시 시작(Start)할 때마다 퍼블릭 IP가 매번 변경되어 도메인 연결이 끊어지는 문제 발생.
   - **해결 방법**:
     - 무료 DDNS(동적 DNS) 서비스인 DuckDNS의 업데이트 API를 호출하는 쉘 스크립트(`~/duckdns.sh`)를 EC2 내부에 작성.
     - EC2의 `crontab`에 `@reboot sleep 10 && ~/duckdns.sh`(부팅 10초 뒤 자동 실행)와 `*/5 * * * * ~/duckdns.sh`(5분 주기 동기화)를 등록하여, EC2를 껐다 켤 때마다 프론트엔드 `.env` 수정 없이 항상 동일한 도메인으로 새로운 퍼블릭 IP에 자동 연결되도록 해결.

---

## v1.1
기존 **v1.0** 기준 **비로그인 코드 실행 차단, EC2 오프라인 시 무한 대기 방지, 코드 주석/린트 개선 및 `.gitignore` 보안 강화**가 반영되었습니다.

1. **비로그인 상태 코드 실행 차단 (보안 및 리소스 보호)**
   - **기존 (v1.0)**: 로그인 여부와 관계없이 누구나 상단 `실행` 버튼 또는 에디터 내 `Ctrl+Enter` 단축키로 EC2 서버에 코드 실행 요청을 보낼 수 있었음.
   - **변경 (v1.1)**:
     - 로그인 전(`!user`)에는 상단 `실행` 버튼을 비활성화(`disabled={!user || isRunning}`)하고 비활성화 전용 스타일(`disabled:cursor-not-allowed`, `disabled:text-slate-400`) 및 안내 툴팁(`로그인이 필요합니다`)을 적용.
     - 에디터 단축키(`Ctrl+Enter` / `Cmd+Enter`)로 실행을 시도할 경우에도 `handleExecute` 함수 진입 시점에 `if (!user)`를 검사하여 API 호출을 차단하고 콘솔에 `"코드를 실행하려면 먼저 로그인해주세요."` 안내 메시지 출력.

2. **AWS EC2 서버 OFF 대응 및 무한 대기 방지 (타임아웃 처리)**
   - **기존 (v1.0)**: 비용 절감을 위해 EC2 인스턴스가 중지(OFF)된 상태에서 `실행` 버튼을 누르면 `fetch` 요청에 타임아웃이 없어 브라우저 기본 네트워크 타임아웃까지 무한정 대기(`컨테이너 샌드박스에서 실행 중...`)하는 문제 발생.
   - **변경 (v1.1)**:
     - `AbortController`와 `setTimeout`(7,000ms = 7초)을 도입하여 응답 지연 시 요청을 즉시 중단(`controller.abort()`)하고 로딩 상태(`isRunning`)를 해제.
     - 타임아웃(`AbortError`), 네트워크 연결 실패, 또는 게이트웨이 오류(`502`~`504`) 발생 시 `"서버가 비활성화되었거나 인터넷 연결이 불안정합니다."` 메시지를 콘솔에 명확히 출력하도록 예외 처리 강화.

3. **코드 가독성 개선 및 정적 분석(ESLint) 오류 해결**
   - 각 파일(`src/App.jsx`, `src/supabaseClient.js`, `src/main.jsx`, `vite.config.js`)의 상태, 함수, UI 영역별로 역할을 설명하는 간결한 한글 주석 추가.
   - `useEffect`보다 아래에 선언되어 호이스팅 린트 오류(`react-hooks/immutability`)를 유발하던 `fetchSnippets` 함수를 `useCallback`으로 감싸고 `useEffect` 상단으로 이동하여 ESLint 오류 완벽 해결.

4. **`.gitignore` 보안 강화**
   - `.env` 및 모든 환경 변수 파생 파일(`.env.*`, `.env.local` 등, 단 `!.env.example` 제외), AWS/SSH 개인키 및 인증서(`*.pem`, `*.key`, `*.ppk`, `*.crt`, `*.p12`, `*.pfx`, `.aws/`), 클라우드 인증 정보 파일(`*credentials*.json`, `*secret*`, `.supabase/`)이 GitHub 원격 저장소에 업로드되지 않도록 차단 규칙 대폭 강화.

---

## v1.0 (초기 버전)
- Python 3.11, Node.js 20, C++ (GCC) 지원 CodeMirror 6 기반 웹 에디터 및 언어별 기본 템플릿 구현
- AWS EC2 백엔드 서버(`/api/execute`) 연동 코드 실행 및 콘솔 토글 UI 구현
- Supabase GitHub OAuth 로그인/로그아웃 및 코드 스니펫 클라우드 저장(`snippets` 테이블) / 불러오기 모달 구현
- 모바일 가상 키보드(`visualViewport`) 대응 뷰포트 리사이징 및 빠른 특수문자 입력 바(`QUICK_SYMBOLS`) 구현
