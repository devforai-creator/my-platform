# Troubleshooting Guide

## 이메일 인증 링크가 localhost로 연결되는 문제

### 증상
- 배포된 사이트(https://mycharacterchatplatform.vercel.app)에서 회원가입
- 이메일 인증 링크를 클릭하면 `http://localhost:3000`으로 연결됨
- 인증이 안 되고 페이지를 찾을 수 없다는 오류 발생

### 원인
Supabase 프로젝트 설정의 Site URL과 Redirect URLs가 localhost로 설정되어 있기 때문입니다.

### 해결 방법

#### 1. Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (현재: `wddufafjjxssibojzuhq`)

#### 2. URL Configuration 설정 변경
1. 왼쪽 메뉴에서 **"Authentication"** 클릭
2. **"URL Configuration"** 탭 선택
3. 다음 설정을 변경:

**Site URL**:
```
https://mycharacterchatplatform.vercel.app
```

**Redirect URLs**:
```
https://mycharacterchatplatform.vercel.app/**
http://localhost:3000/**
```

> **참고**: `http://localhost:3000/**`는 로컬 개발 환경에서도 테스트할 수 있도록 유지합니다.

#### 3. 설정 저장
- "Save" 버튼 클릭
- 변경사항이 즉시 적용됩니다 (재시작 불필요)

#### 4. 테스트
1. 새로운 이메일 주소로 회원가입 시도
2. 인증 이메일에서 링크 확인 (이제 `https://mycharacterchatplatform.vercel.app`으로 시작해야 함)
3. 링크 클릭하여 인증 완료

---

## 기존 사용자 대응

이미 가입했지만 이메일 인증을 완료하지 못한 사용자의 경우:

### 방법 1: 인증 이메일 재전송

Supabase는 기본적으로 인증 이메일 재전송 기능을 제공하지 않습니다. 다음 옵션을 사용하세요:

1. **새 계정으로 재가입** (가장 간단)
   - 다른 이메일 주소 사용
   - 또는 원래 계정을 관리자가 수동 삭제 후 재가입

2. **Supabase Dashboard에서 수동 인증**
   - Supabase Dashboard → Authentication → Users
   - 해당 사용자 찾기
   - "Confirm email" 버튼 클릭

### 방법 2: 사용자 삭제 후 재가입

관리자가 Supabase Dashboard에서:
1. Authentication → Users
2. 해당 사용자 찾기
3. 우측 메뉴(⋮) → "Delete user"
4. 사용자에게 재가입 요청

---

## 추가 인증 설정 권장사항

### Email Template 커스터마이징

Supabase Dashboard → Authentication → Email Templates에서:
- **Confirm signup** 템플릿 수정
- 더 명확한 안내 문구 추가
- 브랜드 이미지 추가 가능

### Rate Limiting 설정 확인

Authentication → Rate Limits에서:
- 스팸 방지를 위한 제한 설정 확인
- 기본값: 동일 IP에서 시간당 최대 요청 수 제한

---

## 개발 환경 vs 프로덕션 환경

### 로컬 개발 시 (localhost:3000)

`.env.local`에 Supabase URL 설정:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wddufafjjxssibojzuhq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Supabase Redirect URLs에 `http://localhost:3000/**` 추가되어 있어야 합니다.

### Vercel 배포 환경

Vercel Dashboard → Settings → Environment Variables에서:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wddufafjjxssibojzuhq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

모두 설정되어 있는지 확인하세요.

---

## 문의 및 지원

문제가 계속되면:
1. GitHub Issues에 문제 보고
2. Supabase 설정 스크린샷 첨부
3. 오류 메시지 전체 복사

**빠른 대응을 위해 다음 정보를 포함해주세요**:
- 사용한 이메일 주소 (개인정보 제외, 도메인만)
- 발생 시간
- 브라우저 콘솔 에러 메시지 (F12 → Console 탭)
