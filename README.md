# Solvexa-HQ | Cloud Web IDE (`fold-ide-web`)

> **Solvexa-HQ 웹 코딩 플랫폼 프로젝트 (Phase 1: Cloud Web IDE)**  
> AWS(S3, CloudFront, EC2 컨테이너 샌드박스)와 Supabase를 활용하여 모바일(폴더블 포함), 태블릿, 데스크톱 어디서나 코드를 작성·실행·저장할 수 있는 크로스플랫폼 클라우드 웹 IDE입니다.

---

## 1. 프로젝트 소개

**Cloud Web IDE**는 별도의 로컬 개발 환경 구축 없이 웹 브라우저에서 즉시 코드를 작성하고 실행할 수 있는 클라우드 기반 통합 개발 환경이며, **Solvexa-HQ가 구축하는 3단계 통합 웹 코딩 플랫폼(1단계 Web IDE → 2단계 코딩 문제 사이트 → 3단계 코딩 검증 프로세스)의 핵심 엔진**입니다.

### 주요 기능
- **다중 언어 코드 실행 (AWS EC2 샌드박스 연동)**: Python 3.11, Node.js 20 (JavaScript), C++ (GCC) 지원
- **사용자 인증 및 실행 권한 제어 (Supabase Auth)**: GitHub OAuth 로그인 사용자 전용 코드 실행 및 저장 보호
- **클라우드 코드 스니펫 관리 (Supabase Database)**: 파일명·언어별 코드 클라우드 저장 및 목록 불러오기
- **EC2 서버 비활성화(절전) 감지 및 타임아웃 제어**: 서버 OFF 시 7초 타임아웃(`AbortController`)을 통한 무한 대기 방지
- **모바일 및 폴더블 최적화 UI**: 가상 키보드 반응형 뷰포트 조정 및 빠른 특수문자 입력 바 제공
- **AWS S3 + CloudFront 자동 배포 (CI/CD)**: GitHub Actions 기반 S3 정적 호스팅 자동 동기화 및 HTTPS 제공

### 기술 스택
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, CodeMirror 6 (`@uiw/react-codemirror`), Lucide React
- **Authentication & Database**: Supabase (`@supabase/supabase-js`, GitHub OAuth)
- **Code Execution Backend**: AWS EC2 컨테이너 샌드박스 API + DuckDNS (DDNS)
- **Deployment & CI/CD**: AWS S3, AWS CloudFront (HTTPS), GitHub Actions

---

## 2. 프로젝트 구조

```text
fold-ide-web/
├── .github/workflows/
│   └── deploy.yml                  # GitHub Actions 기반 AWS S3 자동 빌드/배포 워크플로우
├── docs/                           # 프로젝트 상세 가이드 및 아키텍처 문서 폴더
│   ├── ROADMAP_AND_ARCHITECTURE.md # 3단계 플랫폼 로드맵 및 시스템 아키텍처 다이어그램
│   ├── COLLABORATION_GUIDE.md      # 로컬 개발 환경 구축, 브랜치 전략 및 커밋 컨벤션
│   ├── INFRA_AND_DEPLOYMENT.md     # S3/CloudFront 배포 및 EC2 DuckDNS 자동 갱신 가이드
│   └── CHANGELOG.md                # 버전별(v1.0 ~ v1.4) 상세 변경 이력
├── public/                         # 정적 에셋 폴더 (파비콘, 아이콘 등)
├── src/
│   ├── App.jsx                     # 메인 IDE 컴포넌트 (에디터, 인증, 코드 실행, 클라우드 저장)
│   ├── supabaseClient.js           # 환경 변수 기반 Supabase 클라이언트 초기화 모듈
│   ├── index.css                   # Tailwind CSS 로드 및 모바일 터치/에디터 전역 스타일
│   └── main.jsx                    # React 앱 엔트리 포인트
├── .env.example                    # 협업 팀원을 위한 환경 변수 설정 템플릿 파일
├── .gitignore                      # 보안 민감 파일(.env, 인증키 등) 및 빌드 산출물(dist) 제외 설정
├── package.json                    # 프로젝트 의존성 패키지 및 실행 스크립트 정의
├── vite.config.js                  # Vite 빌드 및 플러그인 설정
└── README.md                       # 프로젝트 메인 요약 문서
```

---

## 3. 상세 가이드 문서 (`docs/`)

각 주제별 상세 내용과 다이어그램, 설정 명령어는 아래 문서에서 확인하실 수 있습니다.

| 문서 | 설명 |
| :--- | :--- |
| **[플랫폼 로드맵 및 시스템 아키텍처](./docs/ROADMAP_AND_ARCHITECTURE.md)** | Solvexa-HQ 3단계 웹 코딩 플랫폼 로드맵, 레포지토리 구조 및 AWS/Supabase 아키텍처 다이어그램 |
| **[공동작업 및 로컬 개발 가이드](./docs/COLLABORATION_GUIDE.md)** | 팀원용 로컬 설치 절차(`.env.example` 활용), 브랜치 전략(`main`, `feat/*`, `fix/*`) 및 커밋 컨벤션 |
| **[인프라 운영 및 자동 배포 가이드](./docs/INFRA_AND_DEPLOYMENT.md)** | AWS S3 + CloudFront 배포, GitHub Actions Secrets 설정, EC2 SSH 및 DuckDNS 유동 IP 자동 갱신 |
| **[버전 이력 관리 (Changelog)](./docs/CHANGELOG.md)** | `v1.0` 초기 버전부터 현재 `v1.4`까지의 전체 기능 개선 및 보안 패치 이력 |

---

## 4. 빠른 시작 (Quick Start)

```bash
git clone https://github.com/Solvexa-HQ/cloud-web-ide.git
cd cloud-web-ide
npm install
cp .env.example .env   # .env 파일에 Supabase 및 백엔드 API 주소 입력
npm run dev
```
