# 1단계 Cloud Web IDE 시스템 아키텍처 및 내부 동작 상세

[← 메인 README로 돌아가기](../README.md)

---

## 1. 전체 인프라 및 통신 아키텍처

1단계 **Cloud Web IDE (`cloud-web-ide`)**는 정적 프론트엔드(AWS S3 + CloudFront), 인증 및 데이터베이스(Supabase), 그리고 코드 실행 샌드박스 백엔드(DuckDNS + AWS EC2)의 3계층 구조로 동작합니다.

```mermaid
flowchart TD
    User["사용자 브라우저\n(Mobile / Foldable / Tablet / Desktop)"]
    GH["GitHub Repository\n(Solvexa-HQ/cloud-web-ide)"]
    GHA["GitHub Actions CI/CD\n(.github/workflows/deploy.yml)"]

    subgraph AWS_Frontend["AWS 프론트엔드 호스팅 계층"]
        CF["AWS CloudFront\n(HTTPS 보안 연결 / 기본 24시간 캐시)"]
        S3["AWS S3 Bucket\n(프로덕션 정적 빌드 dist/)"]
    end

    subgraph BaaS["인증 및 영속성 계층 (Supabase)"]
        Auth["Supabase Auth\n(GitHub OAuth 2.0 세션 관리)"]
        DB["Supabase PostgreSQL\n(snippets 테이블: 코드 저장 및 목록 조회)"]
    end

    subgraph AWS_Backend["코드 실행 샌드박스 계층"]
        DDNS["DuckDNS (DDNS)\n(EC2 유동 퍼블릭 IP 도메인 자동 매핑)"]
        EC2["AWS EC2 인스턴스\n(Python 3.11 / Node.js 20 / C++ GCC 격리 컨테이너)"]
    end

    GH -->|"1. main 브랜치 Push"| GHA
    GHA -->|"2. GitHub Secrets 주입 후 npm run build & aws s3 sync"| S3
    User -->|"3. HTTPS 웹 접속"| CF
    CF -->|"4. 정적 리소스(index.html, assets/*) 제공"| S3
    User <-->|"5. GitHub OAuth 로그인 & 세션 검증"| Auth
    User <-->|"6. 사용자별 코드 스니펫 저장(INSERT) / 조회(SELECT)"| DB
    User -->|"7. 코드 실행 요청 (POST /api/execute, 7초 타임아웃)"| DDNS
    DDNS -->|"8. 최신 EC2 퍼블릭 IP로 라우팅"| EC2
    EC2 -.->|"9. 부팅 시(@reboot) 및 5분 주기 crontab IP 자동 갱신"| DDNS
```

---

## 2. 코드 실행 및 예외 처리 시퀀스 (`handleExecute`)

사용자가 `실행` 버튼을 클릭하거나 에디터 내에서 `Ctrl+Enter` (`Cmd+Enter`)를 입력했을 때의 내부 검증 및 타임아웃 흐름입니다.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant UI as React App (App.jsx)
    participant Abort as AbortController (7초 타이머)
    participant EC2 as AWS EC2 (/api/execute)

    User->>UI: 실행 버튼 클릭 또는 Ctrl+Enter 입력
    alt 비로그인 상태 (!user)
        UI-->>User: 실행 차단 & 콘솔에 "코드를 실행하려면 먼저 로그인해주세요." 출력
    else 로그인 상태 (user 존재)
        UI->>UI: isRunning = true, 콘솔창 열기
        UI->>Abort: 7000ms 타임아웃 타이머 시작
        UI->>EC2: POST /api/execute { language, code }
        alt 7초 이내 정상 응답 (200 OK)
            EC2-->>UI: { output: "실행 결과..." }
            UI->>Abort: clearTimeout()
            UI-->>User: 콘솔에 실행 결과 출력 (isRunning = false)
        else EC2 서버 OFF / 응답 지연 (7초 초과)
            Abort->>UI: controller.abort() (AbortError 발생)
            UI-->>User: "요청 시간이 초과되었습니다. 서버가 비활성화되었거나 인터넷 연결이 불안정합니다." 출력
        else 네트워크 연결 실패 또는 502~504 게이트웨이 오류
            EC2-->>UI: Network Error / 502~504
            UI-->>User: "서버가 비활성화되었거나 인터넷 연결이 불안정합니다. (EC2 서버가 꺼져 있는지 확인하세요)" 출력
        end
    end
```

---

## 3. 프론트엔드 주요 상태 및 모바일 최적화 설계 (`src/App.jsx`)

1. **에디터 및 코드 실행 상태**
   - `language`: 현재 선택된 언어 (`python` | `javascript` | `cpp`). 변경 시 `DEFAULT_CODE[newLang]`으로 에디터 초기 템플릿을 전환합니다.
   - `code`: CodeMirror 에디터에 작성 중인 소스 코드 본문 상태입니다.
   - `output`: 우측(데스크톱) 또는 하단(모바일) 콘솔에 표시되는 실행 결과 또는 오류 안내 메시지입니다.
   - `isRunning`: 코드 실행 요청 진행 여부 상태이며, 실행 중에는 중복 요청을 막기 위해 실행 버튼을 비활성화하고 로딩 스피너(`Loader2`)를 표시합니다.

2. **모바일/폴더블 반응형 뷰포트 및 빠른 기호 입력 바**
   - `viewportHeight` & `isKeyboardOpen`: `window.visualViewport`의 `resize` 이벤트를 구독하여, 모바일에서 가상 키보드가 화면 높이의 25% 이상을 차지할 경우 키보드 활성화로 판단하고 모바일(`window.innerWidth < 768`)에서 콘솔창을 자동으로 닫아 코드 편집 시야를 확보합니다.
   - `QUICK_SYMBOLS`: 모바일 터치 환경에서 입력하기 까다로운 괄호 쌍(`{}`, `()`, `[]`), 따옴표(`""`, `''`), 들여쓰기(`Tab` 4칸), 세미콜론(`;`), 콜론(`:`), 커서 좌우 이동(`←`, `→`)을 에디터 트랜잭션(`view.dispatch`)으로 즉시 삽입하고 커서를 괄호 안쪽(`offset: -1`)으로 자동 위치시킵니다.

3. **Supabase 인증 및 클라우드 스니펫 연동**
   - 앱 마운트 시 `supabase.auth.getSession()`과 `supabase.auth.onAuthStateChange()`를 통해 GitHub OAuth 세션을 실시간으로 동기화합니다.
   - 로그인된 사용자의 `user.id`를 기준으로 `snippets` 테이블에서 최신 수정순(`updated_at DESC`)으로 저장된 코드 목록을 조회하며, 저장 모달에서 항목 클릭 시 제목·언어·코드를 에디터로 즉시 복원합니다.
