# 플랫폼 로드맵 및 시스템 아키텍처

[← 메인 README로 돌아가기](../README.md)

---

## 1. Solvexa-HQ 웹 코딩 플랫폼 3단계 로드맵

**Solvexa-HQ**는 단일 Web IDE를 넘어, 문제 출제·풀이·자동 채점까지 아우르는 통합 웹 코딩 플랫폼을 구축하고 있습니다. 각 단계는 독립된 레포지토리로 분리하여 개발 및 관리합니다.

```mermaid
flowchart LR
    subgraph Phase1["1단계: Web IDE (현재 레포지토리)"]
        IDE["cloud-web-ide\n(코드 작성 · 실시간 실행 · 스니펫 저장)"]
    end
    subgraph Phase2["2단계: 코딩 문제 사이트"]
        PORTAL["coding-problem-web\n(문제 탐색 · 난이도 분류 · 풀이 제출 UI)"]
    end
    subgraph Phase3["3단계: 코딩 검증 프로세스"]
        JUDGE["code-judge-engine\n(테스트케이스 채점 · 시간/메모리 제한 · 보안 샌드박스)"]
    end

    IDE -->|"에디터 컴포넌트 & 실행 연동"| PORTAL
    PORTAL -->|"제출 코드 & 문제 ID 전달"| JUDGE
    JUDGE -->|"채점 결과(AC/WA/TLE/MLE) 반환"| PORTAL
```

| 단계 | 구분 | 권장 레포지토리명 | 핵심 역할 및 목표 | 상태 |
| :---: | :--- | :--- | :--- | :---: |
| **1단계** | **Web IDE 제작** | `Solvexa-HQ/cloud-web-ide` | 다중 언어 웹 에디터, 원격 컨테이너 실행, 클라우드 코드 저장 및 모바일/PC 반응형 UI 완성 | **진행 중** |
| **2단계** | **코딩 문제 사이트 제작** | `Solvexa-HQ/coding-problem-web` | 알고리즘/코딩 문제 목록, 문제 상세 설명, 입출력 예제 제공 및 1단계 Web IDE 결합 | 기획 완료 |
| **3단계** | **코딩 검증 프로세스 제작** | `Solvexa-HQ/code-judge-engine` | 비동기 메시지 큐 기반 다중 테스트케이스 자동 채점, 실행 시간/메모리 측정 및 샌드박스 격리 | 기획 완료 |

---

## 2. 시스템 아키텍처 (Phase 1: Cloud Web IDE)

```mermaid
flowchart TD
    User["사용자 브라우저\n(Mobile / Foldable / Tablet / Desktop)"]
    GH["GitHub Repository\n(Solvexa-HQ/cloud-web-ide)"]
    GHA["GitHub Actions CI/CD\n(.github/workflows/deploy.yml)"]

    subgraph AWS_Frontend["AWS 정적 웹 호스팅"]
        CF["AWS CloudFront\n(HTTPS CDN / 24h Cache)"]
        S3["AWS S3 Bucket\n(프로덕션 정적 빌드 dist/)"]
    end

    subgraph BaaS["인증 및 데이터베이스"]
        SB["Supabase\n(GitHub OAuth 인증 & PostgreSQL 스니펫 DB)"]
    end

    subgraph AWS_Backend["코드 실행 백엔드 인프라"]
        DDNS["DuckDNS (DDNS)\n(EC2 유동 퍼블릭 IP 자동 매핑)"]
        EC2["AWS EC2 인스턴스\n(Python 3.11 / Node.js 20 / C++ GCC 컨테이너 샌드박스)"]
    end

    GH -->|"main 브랜치 Push"| GHA
    GHA -->|"npm run build & aws s3 sync"| S3
    User -->|"HTTPS 접속"| CF
    CF -->|"정적 리소스 로드"| S3
    User <-->|"로그인(OAuth) & 코드 저장/조회"| SB
    User -->|"코드 실행 요청 (POST /api/execute, 7초 타임아웃)"| DDNS
    DDNS -->|"라우팅"| EC2
    EC2 -.->|"@reboot & 5분 주기 crontab IP 갱신"| DDNS
```
