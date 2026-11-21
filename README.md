# Cloud Web IDE (`cloud-web-ide`)

> **[Solvexa-HQ](https://github.com/Solvexa-HQ) 웹 코딩 플랫폼 프로젝트 — Phase 1: Cloud Web IDE**  
> AWS(S3, CloudFront, EC2 컨테이너 샌드박스)와 Supabase를 활용하여 모바일(폴더블 포함), 태블릿, 데스크톱 환경 어디서나 코드를 작성·실행·저장할 수 있는 크로스플랫폼 클라우드 웹 IDE입니다.

---

## 1. 프로젝트 소개

**Cloud Web IDE**는 별도의 로컬 개발 환경 구축 없이 웹 브라우저에서 즉시 코드를 작성하고 실행할 수 있는 클라우드 기반 통합 개발 환경입니다.  
본 레포지토리(`Solvexa-HQ/cloud-web-ide`)는 Solvexa-HQ 웹 코딩 플랫폼의 **1단계(Web IDE) 전용 레포지토리**로서, 에디터 UX·원격 코드 실행·클라우드 스니펫 저장 및 배포 자동화를 담당합니다.

### 주요 기능 상세
- **다중 언어 코드 실행 (AWS EC2 샌드박스 연동)**
  - Python 3.11, Node.js 20 (JavaScript), C++ (GCC) 3종 언어의 문법 하이라이팅(CodeMirror 6)과 언어별 기본 템플릿 코드를 제공합니다.
  - 실행 요청 시 AWS EC2 백엔드 컨테이너 샌드박스(`/api/execute`)에서 격리 실행된 표준 출력/에러 결과를 실시간 콘솔에 표시합니다.
- **사용자 인증 및 실행 권한 제어 (Supabase Auth)**
  - GitHub OAuth 소셜 로그인을 지원합니다.
  - 무분별한 서버 리소스 호출 및 비인가 사용자의 EC2 샌드박스 악용을 방지하기 위해, **로그인 전에는 실행 버튼(`disabled`) 및 단축키(`Ctrl+Enter`) 실행을 원천 차단**합니다.
- **클라우드 코드 스니펫 저장 및 불러오기 (Supabase Database)**
  - 작성한 코드를 파일명(`title`), 언어(`language`), 코드 본문(`code`), 수정 시각(`updated_at`)과 함께 Supabase PostgreSQL `snippets` 테이블에 저장하고, 모달 목록에서 언제든 다시 불러올 수 있습니다.
- **EC2 서버 비활성화(절전) 감지 및 무한 대기 방지**
  - 비용 절약을 위해 AWS EC2 서버가 자주 중지(OFF)되는 운영 환경에 맞추어, `AbortController` 기반 **7초 타임아웃**을 적용했습니다.
  - 서버가 꺼져 있거나 네트워크가 불안정할 때 무한 로딩에 빠지지 않고 `"서버가 비활성화되었거나 인터넷 연결이 불안정합니다."`라는 명확한 안내 메시지를 콘솔에 출력합니다.
- **모바일 및 폴더블 디바이스 최적화 UI**
  - `window.visualViewport` API를 감지하여 모바일 가상 키보드가 올라올 때 에디터 높이를 동적으로 재계산하고 모바일 화면에서 콘솔을 자동으로 접어 편집 영역을 확보합니다.
  - 모바일 환경에서 입력하기 불편한 특수기호(`Tab`, `{`, `}`, `(`, `)`, `[`, `;`, `=`, `"`, `'`, `:`) 및 커서 이동(`←`, `→`)을 원터치로 입력할 수 있는 빠른 기호 바를 제공합니다.
- **AWS S3 + CloudFront 정적 호스팅 및 GitHub Actions 자동 배포 (CI/CD)**
  - `main` 브랜치에 코드가 Push될 때마다 GitHub Actions가 프로덕션 번들(`dist/`)을 빌드하여 AWS S3 버킷에 자동 동기화하며, CloudFront를 통해 HTTPS 보안 연결로 서비스됩니다.

### 기술 스택
| 분류 | 기술 및 라이브러리 | 상세 역할 |
| :--- | :--- | :--- |
| **Frontend Core** | React 19, Vite 8 | 컴포넌트 상태 관리 및 고속 번들링 빌드 |
| **Code Editor** | CodeMirror 6 (`@uiw/react-codemirror`) | Python/JS/C++ 문법 하이라이팅, One Dark 테마, `Mod-Enter` 단축키 바인딩 |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | 모바일/태블릿/데스크톱 반응형 레이아웃 및 아이콘 UI |
| **Auth & Database** | Supabase (`@supabase/supabase-js`) | GitHub OAuth 사용자 인증 및 `snippets` 테이블 CRUD |
| **Execution Backend** | AWS EC2 + DuckDNS (DDNS) | 원격 코드 실행 컨테이너 샌드박스 API 및 유동 퍼블릭 IP 도메인 자동 매핑 |
| **Hosting & CI/CD** | AWS S3, AWS CloudFront, GitHub Actions | 정적 웹 호스팅, HTTPS CDN 캐싱(24h TTL), `main` 브랜치 자동 빌드·배포 |

---

## 2. 프로젝트 구조 및 파일별 역할

```text
fold-ide-web/
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions 기반 AWS S3 자동 빌드 및 배포 워크플로우
├── docs/                             # 1단계 Web IDE 상세 기술/운영 가이드 문서 폴더
│   ├── ARCHITECTURE.md               # Web IDE 내부 동작 흐름 및 AWS/Supabase 시스템 아키텍처
│   ├── INFRA_AND_DEPLOYMENT.md       # S3/CloudFront 배포, GitHub Secrets, EC2 SSH 및 DuckDNS 설정 가이드
│   ├── COLLABORATION_GUIDE.md        # 로컬 개발 환경 구축(.env.example), 브랜치 전략 및 커밋 컨벤션
│   ├── CHANGELOG.md                  # v1.0 ~ v1.4 버전별 전체 상세 변경 이력 (원문 보존)
│   └── MAIN_HUB_README_TEMPLATE.md   # Solvexa-HQ 메인 허브 레포지토리용 README 템플릿 (1~3단계 안내용)
├── dist/                             # 프로덕션 빌드 산출물 폴더 (S3 업로드 대상, Git 추적 제외)
├── public/                           # 정적 에셋 폴더 (파비콘, 아이콘 SVG)
├── src/
│   ├── assets/                       # 프로젝트 내부 이미지 리소스
│   ├── App.jsx                       # 메인 IDE 컴포넌트 (에디터, OAuth 인증, 코드 실행/타임아웃, 클라우드 저장)
│   ├── App.css                       # 보조 컴포넌트 스타일시트
│   ├── supabaseClient.js             # 환경 변수(.env) 기반 Supabase 클라이언트 초기화 모듈
│   ├── index.css                     # Tailwind CSS 로드 및 모바일 제스처/CodeMirror 스크롤 전역 스타일
│   └── main.jsx                      # React 애플리케이션 루트 DOM 마운트 엔트리 포인트
├── .env                              # 실제 환경 변수 파일 (Supabase 키 및 EC2 도메인 - Git 업로드 차단)
├── .env.example                      # 협업 팀원을 위한 환경 변수 키 템플릿 파일
├── .gitignore                        # 보안 민감 파일(.env*, *.pem, *.key, .aws/ 등) 및 dist 제외 설정
├── eslint.config.js                  # ESLint 정적 코드 분석 규칙 설정
├── index.html                        # HTML 루트 템플릿
├── package.json                      # 의존성 패키지 및 스크립트(dev, build, lint, preview) 정의
├── vite.config.js                    # Vite 빌드 및 React / Tailwind CSS v4 플러그인 설정
└── README.md                         # 1단계 Cloud Web IDE 프로젝트 메인 문서
```

---

## 3. 상세 가이드 문서 (`docs/`)

각 영역별 상세 아키텍처, 인프라 명령어, 협업 규칙 및 전체 버전 이력은 아래 전용 문서에 빠짐없이 정리되어 있습니다.

| 문서 링크 | 수록 내용 상세 |
| :--- | :--- |
| **[1. 시스템 아키텍처 및 내부 동작 상세 (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)** | AWS CloudFront/S3 ↔ Supabase ↔ DuckDNS/EC2 전체 아키텍처 다이어그램, 코드 실행/타임아웃 시퀀스 흐름, 컴포넌트 상태 구조 상세 |
| **[2. 인프라 운영 및 자동 배포 가이드 (`docs/INFRA_AND_DEPLOYMENT.md`)](./docs/INFRA_AND_DEPLOYMENT.md)** | AWS S3 정적 호스팅 및 버킷 정책 JSON, GitHub Actions 6대 Secrets 설정, CloudFront 24시간 캐시 정책 및 무효화(`/*`), EC2 SSH 접속 및 DuckDNS(`~/duckdns.sh`, `crontab`) 유동 IP 자동 갱신 전 과정 |
| **[3. 공동작업 및 로컬 개발 가이드 (`docs/COLLABORATION_GUIDE.md`)](./docs/COLLABORATION_GUIDE.md)** | 팀원용 로컬 설치 절차(`.env.example` → `.env`), 스크립트 실행법, 브랜치 전략(`main`, `feat/*`, `fix/*`) 및 커밋 메시지 컨벤션 |
| **[4. 버전별 상세 변경 이력 (`docs/CHANGELOG.md`)](./docs/CHANGELOG.md)** | 초기 `v1.0`부터 `v1.1`, `v1.2`, `v1.3`, `v1.4`까지 수정 전후 비교(기존 vs 변경), 문제 배경 및 해결 방법이 모두 포함된 전체 이력 문서 |
| **[5. Solvexa-HQ 메인 허브 레포지토리 템플릿 (`docs/MAIN_HUB_README_TEMPLATE.md`)](./docs/MAIN_HUB_README_TEMPLATE.md)** | 그룹의 메인 진입점 레포지토리에서 전체 플랫폼(1단계 Web IDE 완성 중심 + 2·3단계 기본 틀)을 소개하고 각 레포지토리로 안내하기 위한 템플릿 |

---

## 4. 빠른 시작 (Quick Start)

```bash
# 1. 레포지토리 클론 및 이동
git clone https://github.com/Solvexa-HQ/cloud-web-ide.git
cd cloud-web-ide

# 2. 의존성 패키지 설치
npm install

# 3. 환경 변수 파일 생성 및 값 입력
cp .env.example .env
# .env 파일 내에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL 입력

# 4. 개발 서버 실행
npm run dev
```

---

## 5. 버전 요약 (Changelog Summary)

> 각 버전의 수정 전/후 상세 비교와 설정 코드는 **[`docs/CHANGELOG.md`](./docs/CHANGELOG.md)** 에서 확인하실 수 있습니다.

- **v1.4 (현재 버전)**: `Solvexa-HQ` 그룹 레포지토리 전환, `.env.example` 추가, `docs/` 폴더 기반 상세 가이드 모듈화 및 1단계 문서 보강
- **v1.3**: AWS S3 배포용 프로덕션 빌드(`dist/`) 구성, GitHub Actions 자동 배포(`.github/workflows/deploy.yml`), CloudFront 24시간 캐시/무효화 가이드 및 과거 Git 히스토리 보안 클린업
- **v1.2**: `App.jsx` 내 EC2 백엔드 주소를 `.env`(`VITE_API_BASE_URL`)로 분리하여 은폐, EC2 재시작 시 유동 퍼블릭 IP 변경에 대응하는 DuckDNS(`~/duckdns.sh`, `crontab`) 자동 갱신 적용
- **v1.1**: 비로그인 상태 코드 실행 차단(버튼 `disabled` 및 `Ctrl+Enter` 단축키 방어), EC2 서버 OFF 시 무한 대기 방지(`AbortController` 7초 타임아웃 및 안내 메시지), 한글 주석 추가, `.gitignore` 보안 강화
- **v1.0**: Python/Node.js/C++ 지원 CodeMirror 6 에디터, EC2 코드 실행 연동, Supabase GitHub 로그인 및 스니펫 저장, 모바일 키보드 반응형 UI 구현
