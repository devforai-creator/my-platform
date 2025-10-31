# Supabase 설정 가이드

Phase 0 MVP를 위한 Supabase 데이터베이스 설정 가이드입니다.

## 1. Supabase 프로젝트 생성

### 1-1. 계정 생성 및 로그인
1. [Supabase](https://supabase.com) 접속
2. "Start your project" 클릭하여 가입 (GitHub 계정 연동 추천)
3. 로그인 완료

### 1-2. 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `characterchat-platform` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` (한국 서버 - 지연 시간 최소화)
   - **Pricing Plan**: `Free` (Phase 0 충분)
3. "Create new project" 클릭
4. 프로젝트 생성 완료까지 약 1-2분 대기

---

## 2. 데이터베이스 스키마 적용

### 2-1. SQL Editor 열기
1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. "+ New query" 버튼 클릭

### 2-2. 스키마 SQL 실행
1. `supabase/migrations/00_initial_schema.sql` 파일 열기
2. **전체 내용을 복사**
3. SQL Editor에 붙여넣기
4. 우측 하단 **"Run"** 버튼 클릭 (또는 Cmd/Ctrl + Enter)
5. 성공 메시지 확인: "Success. No rows returned"
6. 이후 `01_vault_helpers.sql` → `02_update_vault_delete_secret.sql` → `03_chat_summaries.sql` → `04_secure_get_decrypted_secret.sql` → `05_allow_starter_characters.sql` → `06_rate_limit_and_vault_audit.sql` 순서로 반복 실행하여 최신 보안/기능 스키마를 모두 적용합니다. (v0.1.7 이상에서는 06번 파일이 필수입니다.)

### 2-3. 테이블 생성 확인
1. 왼쪽 메뉴에서 **"Table Editor"** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - ✅ `profiles`
   - ✅ `api_keys`
   - ✅ `characters`
   - ✅ `chats`
   - ✅ `messages`

---

## 3. 환경 변수 설정

### 3-1. API Keys 복사
1. 왼쪽 메뉴에서 **"Settings"** (톱니바퀴) 클릭
2. **"API"** 탭 선택
3. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (긴 JWT 토큰)
   - **service_role**: `eyJhbGc...` (secret - 노출 금지!)

### 3-2. .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

⚠️ **주의**: `.env.local`은 절대 Git에 커밋하지 마세요! (`.gitignore`에 이미 추가됨)

---

## 4. 인증 설정

### 4-1. URL Configuration (필수) ⚠️

**프로덕션 배포 시 반드시 설정해야 합니다!**

1. **"Authentication"** > **"URL Configuration"** 메뉴
2. 다음 설정 입력:

**Site URL**:
```
https://mycharacterchatplatform.vercel.app
```
> 배포된 도메인으로 변경하세요. 이메일 인증 링크가 이 URL을 기반으로 생성됩니다.

**Redirect URLs** (한 줄에 하나씩):
```
https://mycharacterchatplatform.vercel.app/**
http://localhost:3000/**
```
> `/**`는 모든 하위 경로를 허용합니다. localhost는 로컬 개발용입니다.

3. **"Save"** 버튼 클릭

⚠️ **주의**: 이 설정을 하지 않으면 이메일 인증 링크가 `localhost`로 생성되어 배포된 사이트에서 회원가입이 불가능합니다!

### 4-2. 이메일 인증 활성화
1. **"Authentication"** > **"Providers"** 메뉴
2. **"Email"** 활성화 확인 (기본 활성화됨)
3. 설정:
   - **Confirm email**: ON (이메일 인증 필수)
   - **Secure email change**: ON (이메일 변경 시 확인)

### 4-3. 소셜 로그인 추가 (선택)
나중에 Google, GitHub 등 추가 가능

---

## 5. Supabase Vault 확인 (API 키 암호화용)

### 5-1. Vault 활성화 여부 확인
1. SQL Editor에서 다음 쿼리 실행:
```sql
select exists (
  select from pg_catalog.pg_namespace
  where nspname = 'vault'
) as vault_enabled;
```

2. 결과가 `true`면 Vault 사용 가능
3. `false`면 Supabase 버전이 오래됨 (프로젝트 업데이트 필요)

### 5-2. Vault 테스트 (선택)
```sql
-- 테스트 시크릿 생성
select vault.create_secret('test_secret', 'my_secret_value');

-- 조회 테스트
select decrypted_secret
from vault.decrypted_secrets
where name = 'test_secret';

-- 삭제
delete from vault.secrets where name = 'test_secret';
```

---

## 6. 테스트

### 6-1. 개발 서버 실행
```bash
npm run dev
```

### 6-2. 접속 확인
브라우저에서 `http://localhost:3000` 접속

### 6-3. 연결 테스트
- 에러 없이 페이지가 로드되면 성공!
- Supabase 연결 문제 시 콘솔에 에러 표시됨

---

## 문제 해결

### 에러: "Invalid API key"
- `.env.local` 파일의 키가 정확한지 확인
- 개발 서버 재시작 필요 (`Ctrl + C` 후 `npm run dev`)

### 에러: "relation does not exist"
- SQL 스키마가 제대로 실행되지 않음
- SQL Editor에서 다시 실행

### 에러: "RLS policy violation"
- Row Level Security 정책 문제
- 로그인된 사용자만 데이터 접근 가능 (의도된 동작)

---

## 다음 단계

✅ Supabase 설정 완료!

이제 다음을 진행할 수 있습니다:
1. 회원가입/로그인 UI 구현
2. API 키 관리 기능 구현
3. 캐릭터 생성 기능 구현

설정 완료 후 개발을 계속 진행하세요!
