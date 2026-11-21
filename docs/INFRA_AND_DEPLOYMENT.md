# 인프라 운영 및 자동 배포 가이드 (S3 / CloudFront / EC2 DDNS)

[← 메인 README로 돌아가기](../README.md)

---

## 1. AWS S3 정적 웹 호스팅 및 버킷 권한 설정

### 1) 수동으로 S3에 빌드 파일을 업로드할 경우
1. 로컬 터미널에서 프로덕션 빌드를 실행하여 `dist/` 폴더를 생성합니다:
   ```bash
   npm run build
   ```
2. 생성된 **`dist/` 폴더 내부의 파일들(`index.html`, `favicon.svg`, `icons.svg`, `assets/` 폴더)**을 AWS S3 버킷 루트에 업로드합니다.
   *(보안 주의: `dist/` 폴더에는 빌드 시점에 `.env`의 환경 변수 값이 번들링되므로 `.gitignore`에 의해 GitHub 저장소에는 업로드되지 않으며 S3에만 업로드되어야 합니다.)*
3. S3 버킷의 **[속성(Properties)] → [정적 웹 사이트 호스팅(Static website hosting)]**을 **활성화**하고, **인덱스 문서**와 **오류 문서**를 모두 `index.html`로 설정합니다.

### 2) S3 버킷 퍼블릭 읽기 권한 정책 (403 Forbidden 방지)
S3 정적 웹 호스팅 또는 퍼블릭 엔드포인트 접근 시 `403 Forbidden` 오류가 발생하지 않도록 S3 버킷의 **[권한(Permissions)]** 탭에서 **퍼블릭 액세스 차단(Block public access)**을 해제하고 아래 **버킷 정책(Bucket policy)**을 적용합니다 (`<YOUR_S3_BUCKET_NAME>`을 실제 버킷 이름으로 변경):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<YOUR_S3_BUCKET_NAME>/*"
    }
  ]
}
```

---

## 2. GitHub Actions 기반 AWS S3 자동 배포 설정 (`.github/workflows/deploy.yml`)

`main` 브랜치에 코드를 Push할 때마다 GitHub Actions가 자동으로 의존성 설치(`npm ci`) → 프로덕션 빌드(`npm run build`) → S3 버킷 동기화(`aws s3 sync dist/ s3://... --delete`)를 수행합니다.

### 1) AWS IAM 배포 전용 사용자 및 액세스 키 발급 (최소 권한 원칙)
보안을 위해 EC2 등 다른 AWS 리소스에는 접근할 수 없고 **S3 업로드 권한만 가진 전용 IAM 사용자**를 생성하여 키를 발급합니다.
1. **AWS 콘솔 → IAM → 사용자(Users) → [사용자 생성(Create user)]** 클릭
2. 사용자 이름(예: `github-s3-deployer`) 입력 후 **[직접 정책 연결(Attach policies directly)]** 선택
3. **`AmazonS3FullAccess`** 정책만 체크하여 사용자 생성
4. 생성된 사용자 상세 페이지 → **[보안 자격 증명(Security credentials)]** 탭 → **[액세스 키 만들기(Create access key)]** 클릭
5. 발급된 **Access key (`AKIA...`)**와 **Secret access key**를 확인

### 2) GitHub Repository Secrets 6개 등록
워크플로우 코드(`.github/workflows/deploy.yml`) 내부에 민감한 키나 서버 주소를 직접 적지 않고, **GitHub 저장소 → [Settings] → [Secrets and variables] → [Actions] → [New repository secret]**에 아래 6개 항목을 암호화하여 등록합니다:

| Secret 이름 (Name) | 입력할 값 설명 (Secret) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | 로컬 `.env`의 Supabase 프로젝트 URL (`https://<PROJECT_ID>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | 로컬 `.env`의 Supabase Anon(Public) Key |
| `VITE_API_BASE_URL` | 로컬 `.env`의 EC2 백엔드 DuckDNS 도메인 주소 (`https://<YOUR_DOMAIN>.duckdns.org`) |
| `AWS_ACCESS_KEY_ID` | 위 1)에서 발급받은 IAM 사용자의 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | 위 1)에서 발급받은 IAM 사용자의 Secret Access Key |
| `AWS_S3_BUCKET` | 배포 대상 S3 버킷 이름 (`http://` 등을 제외한 순수 버킷 이름) |

### 3) Supabase GitHub OAuth 리다이렉트 URL 등록 (필수)
배포된 CloudFront 또는 S3 주소에서 GitHub 로그인을 눌렀을 때 정상적으로 사이트로 복귀하려면:
1. **Supabase 대시보드 → Authentication → URL Configuration** 이동
2. **Site URL**에 배포된 메인 주소(예: `https://<YOUR_CLOUDFRONT_DOMAIN>.cloudfront.net`) 입력
3. **Redirect URLs**에 `https://<YOUR_CLOUDFRONT_DOMAIN>.cloudfront.net/*` (필요 시 S3 엔드포인트 주소 포함)를 추가하고 **Save** 클릭

---

## 3. AWS CloudFront(HTTPS) 캐시 정책 및 즉시 반영(무효화/Invalidation)

- S3 앞단에 **AWS CloudFront**를 연결하면 HTTPS 보안 연결과 CDN 가속이 적용됩니다.
- CloudFront는 성능을 위해 S3의 `index.html` 파일을 **기본 24시간(86,400초) 동안 엣지 서버에 캐싱**합니다. 따라서 S3에 새 빌드 파일이 업로드되어도 최대 24시간 동안은 이전 화면이 보일 수 있으며, 24시간이 지나면 자동으로 새 버전이 반영됩니다.
- **배포 직후 즉시 화면을 갱신하고 싶을 때 (1회성 캐시 무효화)**:
  1. **AWS 콘솔 → CloudFront** → 해당 배포 ID 클릭
  2. 상단 **[무효화(Invalidations)]** 탭 → **[무효화 생성(Create invalidation)]** 클릭
  3. 객체 경로에 **`/*`** 입력 후 생성
  4. 상태가 `Completed(완료됨)`로 바뀌면 즉시 최신 버전이 반영됩니다. 완료된 무효화 항목은 단순 실행 이력이므로 삭제할 필요가 없으며, 무효화 직후부터 다시 정상적으로 24시간 캐시 정책이 작동합니다. (월 1,000건까지 무료)

---

## 4. EC2 SSH 접속 및 DuckDNS 유동 퍼블릭 IP 자동 갱신 가이드

### 1) 문제 배경 및 해결 원리
- AWS에서 고정 IP인 **탄력적 IP(Elastic IP)**를 사용하면 시간당 요금(월 약 \$3.6)이 부과되어, 비용 절약을 위해 EC2를 자주 꺼두는 목적에 맞지 않습니다.
- 반면 기본 퍼블릭 IP를 사용하면 **EC2를 중지(Stop)했다가 다시 시작(Start)할 때마다 퍼블릭 IP가 매번 변경**됩니다.
- 이를 비용 0원으로 해결하기 위해 무료 동적 DNS 서비스인 **DuckDNS의 업데이트 API**를 EC2 내부 스크립트(`~/duckdns.sh`)와 스케줄러(`crontab`)에 등록하여, **EC2가 켜질 때마다 스스로 새 퍼블릭 IP를 DuckDNS 도메인에 자동 매핑**하도록 구성했습니다.

### 2) EC2 서버 SSH 접속 방법
- **방법 A (AWS 웹 콘솔 브라우저 접속)**: AWS 콘솔 → EC2 → 인스턴스 선택 → 우측 상단 **[연결(Connect)]** → **[EC2 Instance Connect]** 탭 → **[연결]** 클릭
- **방법 B (Windows PowerShell에서 `.pem` 키로 접속)**:
  ```powershell
  # 퍼블릭 IP로 접속할 경우
  ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<EC2_PUBLIC_IP>

  # DuckDNS 자동 갱신 설정이 완료된 이후에는 IP가 바뀌어도 도메인으로 바로 SSH 접속 가능
  ssh -i "<KEY_FILE_PATH>.pem" ubuntu@<YOUR_DOMAIN>.duckdns.org
  ```

### 3) EC2 내부 DuckDNS 자동 갱신 스크립트(`~/duckdns.sh`) 생성
EC2 터미널에 접속한 상태에서 아래 명령어를 실행합니다 (`<YOUR_DOMAIN>`과 `<YOUR_DUCKDNS_TOKEN>`에 실제 값 입력):

```bash
# 1. 갱신 스크립트 생성 (ip= 파라미터를 비워두면 DuckDNS가 요청을 보낸 EC2의 현재 퍼블릭 IP를 자동 감지)
cat << 'EOF' > ~/duckdns.sh
#!/bin/bash
curl -s "https://www.duckdns.org/update?domains=<YOUR_DOMAIN>&token=<YOUR_DUCKDNS_TOKEN>&ip=" > ~/duckdns.log 2>&1
EOF

# 2. 실행 권한 부여 및 즉시 실행 테스트
chmod +x ~/duckdns.sh
~/duckdns.sh

# 3. 결과 확인 ("OK"가 출력되면 정상 연결 완료, "KO"가 출력되면 토큰/도메인 확인 필요)
cat ~/duckdns.log
```

### 4) 재부팅 시(`@reboot`) 및 5분 주기 자동 실행 스케줄러(`crontab`) 등록
```bash
# 기존 중복 항목을 제거하고 부팅 10초 후 실행(@reboot) 및 5분 주기 실행(*/5) 등록
(crontab -l 2>/dev/null | grep -v "duckdns.sh"; echo "@reboot sleep 10 && ~/duckdns.sh"; echo "*/5 * * * * ~/duckdns.sh") | crontab -
```

### 5) 정상 등록 여부 확인 명령어
```bash
crontab -l
# 출력 결과:
# @reboot sleep 10 && ~/duckdns.sh
# */5 * * * * ~/duckdns.sh
```

---

## 5. Supabase 무료 플랜 7일 비활성 일시 중지(Auto-Pause) 자동 방지 (`.github/workflows/supabase-keepalive.yml`)

### 1) 문제 배경
- Supabase 무료(Free) 플랜은 **7일 동안 데이터베이스 요청이 없으면 프로젝트를 자동으로 일시 중지(Pause)** 시킵니다.
- 비용 절약을 위해 내 PC나 AWS EC2 서버를 꺼두는 경우가 많으므로, EC2에서 스케줄러를 돌리면 EC2가 꺼져 있는 동안에는 핑을 보낼 수 없습니다.

### 2) 해결 방법 (GitHub Actions 24시간 주기 Keep-Alive)
- 내 PC와 EC2가 모두 꺼져 있어도 365일 무료로 동작하는 **GitHub Actions 스케줄러(`cron: '0 15 * * *'`, 매일 한국 시간 자정 00:00)**를 이용해 24시간마다 Supabase REST API(`/rest/v1/snippets?select=id&limit=1`)로 가벼운 1건 조회 요청을 보내고 즉시 연결을 종료합니다.
- 이미 GitHub Repository Secrets에 등록되어 있는 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 그대로 사용하므로 별도의 추가 설정 없이 자동으로 일시 중지를 영구 방지합니다.
