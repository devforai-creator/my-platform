# CharacterChat Platform

**Phase 0 MVP** - BYOK(Bring Your Own Key) 기반 캐릭터 채팅 플랫폼

## 프로젝트 개요

사용자가 직접 API 키를 등록하여 사용하는 저비용/무료 고성능 캐릭터 채팅 플랫폼입니다.

### 핵심 차별점

1. **압도적 비용 효율**: Google 무료 티어를 안전하게 활용하여 월 0원으로 프런티어 모델 사용
2. **편의성**: RisuAI의 복잡한 설정을 체계화된 공식 가이드로 해결
3. **보안**: Supabase Vault를 활용한 API 키 암호화 저장
4. **확장성**: Phase 1 자체 모델 도입을 위한 아키텍처

## 기술 스택

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Vault)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (예정)

## 시작하기

### 1. 레포지토리 클론 (또는 현재 프로젝트 사용)

```bash
cd my_characterchat_platform
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Supabase 설정

상세한 설정 가이드는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참조하세요.

**간단 요약**:
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. `supabase/migrations/00_initial_schema.sql` 실행
3. API Keys 복사하여 `.env.local` 생성

### 4. 환경 변수 설정

`.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 프로젝트 구조

```
my_characterchat_platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/               # 인증 페이지 (예정)
│   │   ├── dashboard/          # 대시보드 (예정)
│   │   └── api/                # API Routes
│   ├── components/             # React 컴포넌트 (예정)
│   ├── lib/
│   │   └── supabase/           # Supabase 클라이언트
│   │       ├── client.ts       # 브라우저용
│   │       └── server.ts       # 서버용
│   ├── types/
│   │   └── database.types.ts   # DB 타입 정의
│   └── middleware.ts           # 인증 미들웨어
├── supabase/
│   └── migrations/
│       └── 00_initial_schema.sql
├── SUPABASE_SETUP.md           # Supabase 설정 가이드
└── 플랫폼 사업v1.0.2.md        # 사업 계획서
```

## Phase 0 MVP 기능

### ✅ 완료
- [x] 프로젝트 초기 구조
- [x] Supabase 스키마 설계
- [x] 타입 정의

### 🚧 진행 중
- [ ] 인증 시스템 (회원가입/로그인)
- [ ] API 키 관리 (BYOK)
- [ ] 캐릭터 관리
- [ ] 채팅 기능 (스트리밍)

### 📋 예정
- [ ] 온보딩 튜토리얼
- [ ] Google 무료 티어 가이드
- [ ] 캐릭터 템플릿

## 데이터베이스 스키마

### 주요 테이블

- **profiles**: 사용자 확장 정보
- **api_keys**: 암호화된 API 키 저장 (Vault 사용)
- **characters**: 캐릭터 정의
- **chats**: 채팅 세션
- **messages**: 메시지 (토큰 추적 포함)

상세 스키마는 `supabase/migrations/00_initial_schema.sql` 참조

## 보안

### API 키 보호
- Supabase Vault를 통한 암호화 저장
- Row Level Security (RLS)로 사용자 격리
- 서버 사이드 프록시로 클라이언트 노출 방지

### 인증
- Supabase Auth 사용
- 미들웨어를 통한 보호된 라우트 관리

## 개발 가이드

### 브랜치 전략
- `main`: 프로덕션 배포용
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발

### 커밋 컨벤션
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트
- `chore`: 빌드/설정

## 라이센스

MIT License

## 문의

프로젝트 관련 문의는 이슈로 등록해주세요.
