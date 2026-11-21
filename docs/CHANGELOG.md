# 버전 이력 관리 (Changelog)

[← 메인 README로 돌아가기](../README.md)

---

## v1.4 (현재 버전)
**Solvexa-HQ 그룹(Organization) 레포지토리 전환, 문서 모듈화(`docs/`) 및 웹 코딩 플랫폼 로드맵 수립**
1. **그룹 레포지토리(`Solvexa-HQ/cloud-web-ide`) 전환 및 3단계 플랫폼 로드맵 수립**
   - 1단계(Web IDE) → 2단계(코딩 문제 사이트) → 3단계(코딩 검증 프로세스)로 이어지는 전체 플랫폼 아키텍처 및 멀티 레포지토리 구조 정의.
2. **가이드 문서 분리(`docs/`) 및 메인 `README.md` 경량화**
   - 비대해진 `README.md`를 핵심 소개 위주로 간결하게 정리하고, 상세 문서를 `docs/` 폴더 하위 4개 문서로 분리하여 링크로 연결.
3. **공동작업 지원용 `.env.example` 템플릿 및 협업 가이드 추가**
   - 실제 시크릿 값을 노출하지 않고 팀원이 즉시 개발 환경을 세팅할 수 있도록 `.env.example` 파일을 추가하고 로컬 설치·브랜치·커밋 컨벤션 문서화.

---

## v1.3
**AWS S3 프로덕션 빌드, GitHub Actions 자동 배포(CI/CD) 및 CloudFront 연동 문서화**
1. **AWS S3 정적 배포용 프로덕션 빌드(`dist/`) 구성 및 격리**
   - `npm run build`를 통해 S3 정적 웹 호스팅용 번들 생성 및 `.gitignore` 격리.
2. **GitHub Actions 기반 AWS S3 자동 배포 파이프라인 구축 (`.github/workflows/deploy.yml`)**
   - `main` 브랜치 Push 시 GitHub Secrets를 주입받아 자동으로 빌드 후 S3 버킷에 동기화.
3. **AWS CloudFront 24시간 캐시 정책 및 무효화(`/*`) 운영 가이드 정리**
4. **과거 Git 커밋 히스토리 보안 클린업 (History Sanitization)**
   - `.env` 분리 이전 커밋 로그(Diff)에 남아 있던 백엔드 도메인 흔적을 제거하기 위해 고아 브랜치(`--orphan`) 기반으로 커밋 히스토리 재초기화.

---

## v1.2
**백엔드 도메인 보안 은폐 및 EC2 유동 퍼블릭 IP 대응(DDNS 자동 갱신)**
1. **EC2 백엔드 API 주소 환경 변수(`.env`) 분리 및 은폐**
   - `src/App.jsx`의 `API_BASE_URL`을 `.env`의 `VITE_API_BASE_URL`로 분리하여 GitHub 저장소에 백엔드 도메인이 노출되지 않도록 조치.
2. **EC2 재시작 시 유동 퍼블릭 IP 변경 대응 (DuckDNS DDNS 자동 업데이트 적용)**
   - EC2 내부에 `~/duckdns.sh` 및 `crontab`(`@reboot`, `*/5 * * * *`)을 구성하여 서버 재시작 시 바뀐 퍼블릭 IP를 도메인에 자동 반영.

---

## v1.1
**비로그인 코드 실행 차단, EC2 서버 오프라인 타임아웃 제어 및 보안 강화**
1. **비로그인 상태 코드 실행 차단 (보안 및 리소스 보호)**
   - 로그인 전(`!user`) 상단 `실행` 버튼 비활성화(`disabled={!user || isRunning}`) 및 단축키(`Ctrl+Enter`) 실행 차단.
2. **AWS EC2 서버 OFF 대응 및 무한 대기 방지 (타임아웃 처리)**
   - `AbortController`와 `setTimeout`(7초)을 도입하여 EC2 중지 상태에서 무한 대기하지 않고 `"서버가 비활성화되었거나 인터넷 연결이 불안정합니다."` 메시지를 출력하도록 개선.
3. **코드 가독성 개선 및 정적 분석(ESLint) 오류 해결**
   - 핵심 코드 한글 주석 추가 및 `fetchSnippets` `useCallback` 적용.
4. **`.gitignore` 보안 강화**
   - `.env.*`, `*.pem`, `*.key`, `*.ppk`, `.aws/`, `*credentials*.json`, `*secret*` 등 민감 파일 업로드 차단 규칙 추가.

---

## v1.0 (초기 버전)
- Python 3.11, Node.js 20, C++ (GCC) 지원 CodeMirror 6 기반 웹 에디터 구현
- AWS EC2 백엔드 서버 연동 코드 실행 및 콘솔 출력 기능 구현
- Supabase GitHub OAuth 로그인 및 코드 스니펫 클라우드 저장/불러오기 모달 구현
- 모바일 가상 키보드 대응 뷰포트 리사이징 및 빠른 특수문자 입력 바 구현
