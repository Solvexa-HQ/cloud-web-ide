# 인프라 운영 및 자동 배포 가이드 (S3 / CloudFront / EC2 DDNS)

[← 메인 README로 돌아가기](../README.md)

---

## 1. AWS S3 배포 및 GitHub Actions CI/CD 설정

### 1) 수동으로 S3에 배포할 경우
1. 로컬 터미널에서 `npm run build` 실행 후 생성된 **`dist/` 폴더 내부 파일들(`index.html`, `assets/` 등)**을 AWS S3 버킷 루트에 업로드합니다.
2. S3 버킷의 **[속성(Properties)] → [정적 웹 사이트 호스팅(Static website hosting)]**을 활성화하고 인덱스 문서와 오류 문서를 모두 `index.html`로 지정합니다.

### 2) GitHub Actions 자동 배포 설정 (`.github/workflows/deploy.yml`)
GitHub 저장소 상단 메뉴의 **[Settings] → [Secrets and variables] → [Actions] → [New repository secret]**에서 아래 6개 시크릿을 등록하면 `main` 브랜치에 Push할 때마다 자동으로 S3에 배포됩니다:

| Secret 이름 | 설명 |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon(Public) Key |
| `VITE_API_BASE_URL` | EC2 백엔드 도메인 주소 |
| `AWS_ACCESS_KEY_ID` | S3 업로드 권한(`AmazonS3FullAccess`)이 있는 AWS IAM 사용자의 Access Key |
| `AWS_SECRET_ACCESS_KEY` | 해당 IAM 사용자의 Secret Access Key |
| `AWS_S3_BUCKET` | 배포할 S3 버킷 이름 |

> **중요 (Supabase OAuth Redirect 설정)**: 배포된 사이트에서 GitHub 로그인이 정상 동작하려면 **Supabase 콘솔 → Authentication → URL Configuration**의 `Site URL` 및 `Redirect URLs`에 배포된 CloudFront(`https://<CLOUDFRONT_DOMAIN>.cloudfront.net`) 및 S3 엔드포인트 주소를 등록해야 합니다.

---

## 2. AWS CloudFront 캐시 정책 및 즉시 반영(Invalidation)

- S3 앞단에 **AWS CloudFront(HTTPS)**를 연결하여 사용할 경우, 기본 캐시 유지 시간(TTL, 기본 24시간) 동안 이전 `index.html`이 캐싱되어 제공됩니다.
- 자연스럽게 24시간 뒤 캐시가 만료되면 최신 버전이 자동 반영됩니다.
- 배포 직후 즉시 반영이 필요한 경우에만 **AWS 콘솔 → CloudFront → 해당 배포 선택 → [무효화(Invalidations)] → [무효화 생성]**에서 객체 경로에 `/*`를 입력하여 1회성 캐시 초기화를 수행합니다. (완료된 무효화 내역은 단순 실행 기록이므로 별도로 삭제할 필요가 없으며, 이후 다시 24시간 캐시 정책이 유지됩니다.)

---

## 3. EC2 SSH 접속 및 DuckDNS 유동 IP 자동 갱신 설정

비용 절약을 위해 유료 고정 IP(AWS Elastic IP)를 쓰지 않고 기본 퍼블릭 IP를 사용하면, EC2 인스턴스를 껐다 켤 때마다 퍼블릭 IP가 변경됩니다. 이를 해결하기 위해 EC2 내부에서 DuckDNS의 무료 DDNS 업데이트 API를 자동 호출하도록 설정합니다.

### 1) EC2 서버 SSH 접속
```powershell
# IP 주소로 접속할 경우
ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<EC2_PUBLIC_IP>

# DuckDNS 연동 완료 후에는 IP가 바뀌어도 도메인으로 바로 접속 가능
ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<YOUR_DOMAIN>.duckdns.org
```

### 2) DuckDNS IP 갱신 스크립트(`~/duckdns.sh`) 생성 및 테스트
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

### 3) 서버 부팅 시(`@reboot`) 및 5분 주기 자동 실행 등록 (`crontab`)
```bash
(crontab -l 2>/dev/null | grep -v "duckdns.sh"; echo "@reboot sleep 10 && ~/duckdns.sh"; echo "*/5 * * * * ~/duckdns.sh") | crontab -
```

### 4) 상태 확인 명령어
- `crontab -l` : 등록된 자동 실행 스케줄 확인
- `cat ~/duckdns.log` : 최근 IP 갱신 응답(`OK`) 확인
