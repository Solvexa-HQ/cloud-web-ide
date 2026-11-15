# Cloud Web IDE (`fold-ide-web`)

AWS EC2 컨테이너 샌드박스와 Supabase를 활용하여 모바일(폴더블 포함), 태블릿, 데스크톱 환경 어디서나 코드를 작성·실행·저장할 수 있는 크로스플랫폼 클라우드 웹 IDE입니다.

---

## 1. 프로젝트 소개

**Cloud Web IDE**는 별도의 로컬 개발 환경 구축 없이 웹 브라우저에서 즉시 코드를 작성하고 실행할 수 있는 클라우드 기반 통합 개발 환경입니다.

### 주요 기능
- **다중 언어 코드 실행 (AWS EC2 샌드박스 연동)**
  - Python 3.11, Node.js 20 (JavaScript), C++ (GCC) 문법 하이라이팅 및 원격 컨테이너 실행을 지원합니다.
- **사용자 인증 및 실행 권한 제어 (Supabase Auth)**
  - GitHub OAuth 로그인을 지원하며, 무분별한 서버 리소스 호출을 방지하기 위해 로그인한 사용자만 코드 실행 및 클라우드 저장을 사용할 수 있습니다.
- **클라우드 코드 스니펫 저장 및 불러오기 (Supabase Database)**
  - 작성한 코드를 파일명·언어와 함께 클라우드 DB에 저장하고 언제든 목록에서 불러올 수 있습니다.
- **EC2 서버 비활성화(절전) 감지 및 타임아웃 제어**
  - 비용 절약을 위해 AWS EC2 서버가 중지(OFF)된 상태이거나 네트워크가 불안정할 때 무한 대기하지 않도록 타임아웃(7초)을 적용하고 명확한 안내 메시지를 출력합니다.
- **모바일 및 폴더블 최적화 UI**
  - `visualViewport` API를 통해 모바일 가상 키보드 활성화 시 레이아웃을 자동 조정하며, 빠른 기호 입력 바(`Tab`, `{}`, `()`, `;` 등)를 제공합니다.
- **AWS S3 정적 웹 호스팅 및 GitHub Actions 자동 배포 (CI/CD)**
  - `main` 브랜치에 Push할 때마다 GitHub Actions가 프로덕션 번들(`dist/`)을 빌드하여 AWS S3 버킷에 자동으로 동기화합니다.

### 기술 스택
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, CodeMirror 6 (`@uiw/react-codemirror`), Lucide React
- **Authentication & Database**: Supabase (`@supabase/supabase-js`, GitHub OAuth)
- **Code Execution Backend**: AWS EC2 컨테이너 샌드박스 API + DuckDNS (DDNS)
- **Deployment & CI/CD**: AWS S3 Static Website Hosting, GitHub Actions

---

## 2. 프로젝트 구조

```text
fold-ide-web/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 기반 AWS S3 자동 빌드/배포 워크플로우
├── dist/                    # 프로덕션 빌드 결과물 폴더 (S3 업로드 대상, Git 추적 제외)
├── public/                  # 정적 에셋 폴더 (파비콘, 아이콘 등)
├── src/
│   ├── assets/              # 이미지 및 SVG 리소스
│   ├── App.jsx              # 메인 IDE 컴포넌트 (에디터, 인증, 코드 실행, 클라우드 저장/목록 UI)
│   ├── App.css              # 보조 컴포넌트 스타일시트
│   ├── supabaseClient.js    # 환경 변수 기반 Supabase 클라이언트 초기화 모듈
│   ├── index.css            # Tailwind CSS 로드 및 모바일 터치/에디터 전역 스타일
│   └── main.jsx             # React 앱 엔트리 포인트 (DOM 마운트)
├── .env                     # Supabase 및 EC2 서버 주소 등 환경 변수 (Git 추적 제외)
├── .gitignore               # 보안 민감 파일(.env, 인증키 등) 및 빌드 산출물(dist) Git 제외 설정
├── eslint.config.js         # ESLint 코드 품질 규칙 설정
├── index.html               # HTML 루트 템플릿
├── package.json             # 프로젝트 의존성 패키지 및 실행 스크립트 정의
├── vite.config.js           # Vite 빌드 및 React/Tailwind 플러그인 설정
└── README.md                # 프로젝트 소개, 구조, 인프라 설정 및 버전 이력 문서
```

---

## 3. 버전 이력 관리 (Changelog)

### v1.3 (현재 버전)
기존 **v1.2** 기준 **AWS S3 프로덕션 빌드(`dist/`) 생성, GitHub Actions 기반 S3 자동 배포(CI/CD) 구축, 그리고 과거 Git 커밋 히스토리 보안 초기화**가 반영되었습니다.

1. **AWS S3 정적 배포용 프로덕션 빌드(`dist/`) 구성**
   - `npm run build`를 통해 S3 정적 웹 호스팅에 즉시 업로드 가능한 최적화된 `dist/` 번들 생성.
   - 빌드 결과물(`dist/`)에는 환경 변수가 인라인으로 번들링되므로, `.gitignore`를 통해 Git 저장소에는 업로드되지 않고 로컬 수동 업로드 또는 GitHub Actions에서 직접 S3로만 전송되도록 격리.

2. **GitHub Actions 기반 AWS S3 자동 배포 파이프라인 구축 (`.github/workflows/deploy.yml`)**
   - `main` 브랜치에 Push 시 자동으로 `npm ci` → `npm run build` (`dist/` 생성) → `aws s3 sync dist/ s3://<버킷명> --delete`를 수행하는 CI/CD 워크플로우 추가.
   - **보안 설계**: 코드 내에는 어떠한 AWS 키나 서버 주소도 포함하지 않으며, 모든 민감 정보는 **GitHub Repository Secrets**(`${{ secrets.* }}`)를 통해서만 안전하게 주입.

3. **과거 Git 커밋 히스토리 보안 클린업 (History Sanitization)**
   - `.env` 분리 이전에 작성되었던 과거 커밋 로그(Diff)에 남아 있던 백엔드 도메인 흔적을 원천 제거하기 위해 고아 브랜치(`--orphan`) 기반으로 커밋 히스토리를 깨끗하게 재초기화.

#### [참고] AWS S3 수동 업로드 및 GitHub Actions 자동 배포 설정 가이드

1. **수동으로 S3에 배포할 경우**
   - 로컬 터미널에서 `npm run build` 실행 후 생성된 **`dist` 폴더 내부의 파일들(`index.html`, `assets/` 등)**을 AWS S3 버킷 루트에 업로드합니다.
   - S3 버킷의 **[속성(Properties)] → [정적 웹 사이트 호스팅(Static website hosting)]**을 활성화하고 인덱스 문서와 오류 문서를 모두 `index.html`로 지정합니다.

2. **GitHub Actions 자동 배포를 활성화할 경우 (GitHub Secrets 등록)**
   - GitHub 저장소 상단 메뉴의 **[Settings] → [Secrets and variables] → [Actions] → [New repository secret]**에서 아래 6개 시크릿을 등록하면 `git push` 할 때마다 자동으로 S3에 배포됩니다:
     - `VITE_SUPABASE_URL` : 로컬 `.env`의 Supabase 프로젝트 URL
     - `VITE_SUPABASE_ANON_KEY` : 로컬 `.env`의 Supabase Anon Key
     - `VITE_API_BASE_URL` : 로컬 `.env`의 EC2 백엔드 도메인 주소
     - `AWS_ACCESS_KEY_ID` : S3 업로드 권한(`AmazonS3FullAccess` 등)이 있는 AWS IAM 사용자의 Access Key
     - `AWS_SECRET_ACCESS_KEY` : 해당 IAM 사용자의 Secret Access Key
     - `AWS_S3_BUCKET` : 배포할 S3 버킷 이름 (예: `my-cloud-ide-bucket`)
   - *(주의: S3 배포 완료 후 GitHub 로그인이 정상 동작하려면 **Supabase 콘솔 → Authentication → URL Configuration**의 `Site URL` 및 `Redirect URLs`에 S3 웹 사이트 엔드포인트 주소를 추가해야 합니다.)*

---

### v1.2
기존 **v1.1** 기준 백엔드 도메인 보안 은폐 및 EC2 유동 퍼블릭 IP 대응(DDNS 자동 갱신) 설정이 반영되었습니다.

1. **EC2 백엔드 API 주소 환경 변수(`.env`) 분리 및 은폐**
   - `src/App.jsx` 코드 내에 하드코딩되어 있던 `API_BASE_URL`을 `.env` 파일의 `VITE_API_BASE_URL`로 분리하고 `import.meta.env.VITE_API_BASE_URL`로 참조하도록 변경.
   - GitHub 공개 저장소에서 EC2 도메인 주소가 노출되어 무분별한 외부 요청 표적이 되는 것을 방지.

2. **EC2 재시작 시 유동 퍼블릭 IP 변경 대응 (DuckDNS DDNS 자동 업데이트 적용)**
   - **문제 배경**: 비용 절약을 위해 유료 고정 IP(AWS Elastic IP)를 쓰지 않고 기본 퍼블릭 IP를 사용하면, EC2 인스턴스를 중지(Stop)했다가 다시 시작(Start)할 때마다 퍼블릭 IP가 변경되어 도메인 연결이 끊어짐.
   - **해결 방법**: DuckDNS의 무료 DDNS 업데이트 API를 호출하는 스크립트(`~/duckdns.sh`)와 스케줄러(`crontab`)를 EC2에 구성하여, 서버 부팅 시(`@reboot`) 및 5분 주기로 바뀐 퍼블릭 IP를 도메인에 자동 반영.

#### [참고] EC2 SSH 접속 및 DuckDNS 자동 갱신 설정 가이드 (보안 마스킹 처리됨)

1. **EC2 서버 SSH 접속**
   ```powershell
   # IP 주소로 접속할 경우
   ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<EC2_PUBLIC_IP>

   # DuckDNS 연동 완료 후에는 IP가 바뀌어도 도메인으로 바로 접속 가능
   ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<YOUR_DOMAIN>.duckdns.org
   ```

2. **EC2 내부에 DuckDNS IP 갱신 스크립트(`~/duckdns.sh`) 생성 및 실행 권한 부여**
   ```bash
   cat << 'EOF' > ~/duckdns.sh
   #!/bin/bash
   curl -s "https://www.duckdns.org/update?domains=<YOUR_DOMAIN>&token=<YOUR_DUCKDNS_TOKEN>&ip=" > ~/duckdns.log 2>&1
   EOF

   chmod +x ~/duckdns.sh
   ~/duckdns.sh
   cat ~/duckdns.log   # "OK" 출력 시 정상 연동 완료
   ```
   *(※ `ip=` 값을 비워두면 DuckDNS가 요청을 보낸 EC2의 현재 퍼블릭 IP를 자동 감지하여 업데이트합니다.)*

3. **서버 부팅 시(`@reboot`) 및 5분 주기 자동 실행 등록 (`crontab`)**
   ```bash
   (crontab -l 2>/dev/null | grep -v "duckdns.sh"; echo "@reboot sleep 10 && ~/duckdns.sh"; echo "*/5 * * * * ~/duckdns.sh") | crontab -
   ```

4. **상태 확인 명령어**
   - `crontab -l` : 등록된 자동 실행 스케줄 확인
   - `cat ~/duckdns.log` : 최근 IP 갱신 응답(`OK`) 확인

---

### v1.1
기존 **v1.0** 기준 다음과 같은 기능 개선, 안정성 강화 및 보안 조치가 반영되었습니다.

1. **비로그인 상태 코드 실행 차단 (보안 및 리소스 보호)**
   - **기존 (v1.0)**: 로그인 여부와 관계없이 누구나 `실행` 버튼 또는 `Ctrl+Enter` 단축키로 EC2 서버에 코드 실행 요청을 보낼 수 있었음.
   - **변경 (v1.1)**:
     - 로그인 전(`!user`)에는 상단 `실행` 버튼을 비활성화(`disabled={!user || isRunning}`)하고 비활성화 스타일 및 안내 툴팁(`로그인이 필요합니다`)을 적용.
     - 에디터 단축키(`Ctrl+Enter` / `Cmd+Enter`)로 실행을 시도할 경우에도 `handleExecute` 내부에서 로그인 여부를 검사하여 API 요청을 차단하고 콘솔에 안내 메시지 출력.

2. **AWS EC2 서버 OFF 대응 및 무한 대기 방지 (타임아웃 처리)**
   - **기존 (v1.0)**: 비용 절감을 위해 EC2 인스턴스가 중지(OFF)된 상태에서 `실행` 버튼을 누르면 브라우저 기본 네트워크 타임아웃까지 무한정 대기(`컨테이너 샌드박스에서 실행 중...`)하는 문제 발생.
   - **변경 (v1.1)**:
     - `AbortController`와 `setTimeout`(7초)을 도입하여 응답 지연 시 요청을 즉시 중단하고 대기 상태를 해제.
     - 타임아웃(`AbortError`), 네트워크 연결 실패, 게이트웨이 오류(`502`~`504`) 발생 시 `"서버가 비활성화되었거나 인터넷 연결이 불안정합니다."` 메시지를 콘솔에 명확히 출력.

3. **코드 가독성 개선 및 정적 분석(ESLint) 오류 해결**
   - 각 파일(`src/App.jsx`, `src/supabaseClient.js`, `src/main.jsx`, `vite.config.js`)의 핵심 로직에 간결한 한글 주석 추가.
   - `fetchSnippets`를 `useCallback`으로 선언 순서에 맞게 정리하여 React Hooks 린트 경고/오류 해결.

4. **`.gitignore` 보안 강화**
   - `.env` 및 모든 환경 변수 파생 파일(`.env.*`), AWS/SSH 개인키(`*.pem`, `*.key`, `*.ppk`, `.aws/`), 인증 정보 파일(`*credentials*.json`, `*secret*`, `.supabase/`)이 GitHub 원격 저장소에 업로드되지 않도록 차단 규칙 추가.

---

### v1.0 (초기 버전)
- Python 3.11, Node.js 20, C++ (GCC) 지원 CodeMirror 6 기반 웹 에디터 구현
- AWS EC2 백엔드 서버 연동 코드 실행 및 콘솔 출력 기능 구현
- Supabase GitHub OAuth 로그인 및 코드 스니펫 클라우드 저장/불러오기 모달 구현
- 모바일 가상 키보드 대응 뷰포트 리사이징 및 빠른 특수문자 입력 바 구현
