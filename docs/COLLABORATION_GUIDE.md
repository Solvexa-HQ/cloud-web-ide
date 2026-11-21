# 공동작업 및 로컬 개발 가이드 (Collaboration Guide)

[← 메인 README로 돌아가기](../README.md)

---

## 1. 로컬 개발 환경 세팅

새로운 팀원이 프로젝트를 클론하여 로컬에서 실행하는 절차입니다.

```bash
# 1. 그룹 레포지토리 클론 및 폴더 이동
git clone https://github.com/Solvexa-HQ/cloud-web-ide.git
cd cloud-web-ide

# 2. 의존성 패키지 설치
npm install

# 3. 환경 변수 파일(.env) 생성 (.env.example 템플릿 복사)
cp .env.example .env
```

생성된 `.env` 파일을 열어 실제 프로젝트의 환경 변수 값을 입력합니다:
```env
VITE_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_PUBLISHABLE_ANON_KEY>
VITE_API_BASE_URL=https://<YOUR_BACKEND_DOMAIN>.duckdns.org
```

```bash
# 4. 로컬 개발 서버 실행 (http://localhost:5173)
npm run dev

# 5. 코드 린트 검사 및 프로덕션 빌드 테스트
npm run lint
npm run build
```

---

## 2. 브랜치 전략 (Branch Strategy)

| 브랜치 | 설명 | 예시 |
| :--- | :--- | :--- |
| `main` | AWS S3로 자동 배포되는 운영(Production) 브랜치 | `main` |
| `feat/*` | 새로운 기능 개발 브랜치 | `feat/stdin-input`, `feat/theme-toggle` |
| `fix/*` | 버그 및 예외 처리 수정 브랜치 | `fix/mobile-keyboard-resize` |
| `docs/*` | 문서 및 가이드 추가/수정 브랜치 | `docs/update-architecture` |

---

## 3. 커밋 메시지 컨벤션 (Commit Convention)

- `feat:` 새로운 기능 추가
- `fix:` 버그 및 예외 처리 수정
- `docs:` README 및 `docs/` 문서 수정
- `chore:` 빌드 설정, 패키지 매니저, 환경 변수 설정 변경
- `refactor:` 기능 변경 없는 코드 구조 개선
