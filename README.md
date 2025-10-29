# CharacterChat Platform

**Phase 0 (v0.1.3)** - BYOK(Bring Your Own Key) 기반 캐릭터 채팅 플랫폼

[![Deploy Status](https://img.shields.io/badge/deploy-success-brightgreen)](https://mycharacterchatplatform.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 프로젝트 개요

사용자가 직접 API 키를 등록하여 사용하는 저비용/무료 고성능 캐릭터 채팅 플랫폼입니다.

### 핵심 차별점

1. **압도적 비용 효율**: Google 무료 티어를 안전하게 활용하여 월 0원으로 프런티어 모델 사용
2. **편의성**: 복잡한 설정을 체계화된 UI로 간소화
3. **보안**: Supabase Vault를 활용한 API 키 암호화 저장
4. **확장성**: Phase 1 자체 모델 도입을 위한 아키텍처
5. **멀티 디바이스**: PC와 모바일 모두 반응형으로 지원

## 주요 기능 (Phase 0 완료)

✅ **인증 시스템**
- 회원가입/로그인 (Supabase Auth)
- 보호된 라우트 관리

✅ **API 키 관리 (BYOK)**
- Google Gemini, OpenAI, Anthropic 지원
- Supabase Vault 암호화 저장
- 모델별 선호도 설정

✅ **캐릭터 관리**
- 1:1 캐릭터 대화 템플릿
- 멀티 캐릭터 시뮬레이션 템플릿
- 자유로운 시스템 프롬프트 작성

✅ **실시간 채팅**
- 스트리밍 응답 (AI SDK)
- FIFO 컨텍스트 윈도우 (최근 20개 메시지)
- 계층적 장기기억 시스템 (자동 요약)
- 자동 메시지 저장
- 토큰 사용량 실시간 추적 및 통계
- 자동 스크롤

## 기술 스택

### Frontend/Backend
- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI**: React 19

### Database & Auth
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Secret Management**: Supabase Vault

### AI & LLM
- **SDK**: Vercel AI SDK v3.4.33
- **Providers**:
  - @ai-sdk/google v0.0.55 (Gemini 2.5)
  - @ai-sdk/openai v0.0.72 (GPT-5, GPT-4.1)
  - @ai-sdk/anthropic v0.0.56 (Claude Sonnet 4.5, Haiku 4.5, Opus 4.1)

### Deployment
- **Platform**: Vercel
- **Runtime**: Edge Runtime (60s timeout)
- **CI/CD**: GitHub Integration

## 지원 모델 (2025년 10월 기준)

### Google Gemini
- gemini-2.5-pro (최고 성능)
- gemini-2.5-flash (균형)
- gemini-2.5-flash-lite (경량)

### OpenAI GPT
- gpt-5 (최신)
- gpt-4.1 (안정)
- gpt-4.1-nano (경량)

### Anthropic Claude
- claude-sonnet-4-5 (최고 코딩)
- claude-haiku-4-5 (코스트 효율)
- claude-opus-4-1 (최고 성능)

## 시작하기

### 빠른 시작 (추천)

**5분이면 바로 사용 가능합니다:**

1. **[플랫폼 접속](https://mycharacterchatplatform.vercel.app)**
2. **회원가입** (이메일 + 비밀번호)
3. **API 키 등록**
   - [Google AI Studio](https://aistudio.google.com/app/apikey) - 무료 티어 제공 ⭐
   - [OpenAI Platform](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/settings/keys)
4. **캐릭터 생성** 후 바로 채팅 시작!

---

### 개발자를 위한 셀프 호스팅 (선택)

오픈소스이므로 본인의 인프라에서 직접 운영할 수 있습니다.

#### 1. 레포지토리 클론

```bash
git clone git@github.com:devforai-creator/my-platform.git
cd my-platform
```

#### 2. 의존성 설치

```bash
npm install
```

#### 3. Supabase 설정

상세한 설정 가이드는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참조하세요.

**간단 요약**:
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 다음 파일들을 순서대로 실행:
   - `supabase/migrations/00_initial_schema.sql`
   - `supabase/migrations/01_vault_helpers.sql`
3. Settings → API에서 API Keys 확인

#### 4. 환경 변수 설정

`.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

#### 6. 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
my_characterchat_platform/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/                 # 인증 (로그인/회원가입)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── actions.ts
│   │   ├── dashboard/            # 대시보드
│   │   │   ├── page.tsx
│   │   │   ├── api-keys/         # API 키 관리
│   │   │   ├── characters/       # 캐릭터 관리
│   │   │   └── chats/            # 채팅
│   │   └── api/
│   │       └── chat/             # 채팅 API (Edge Runtime)
│   ├── lib/
│   │   └── supabase/             # Supabase 클라이언트
│   │       ├── client.ts         # 브라우저용
│   │       └── server.ts         # 서버용
│   ├── types/
│   │   └── database.types.ts     # DB 타입 정의
│   └── middleware.ts             # 인증 미들웨어
├── supabase/
│   └── migrations/
│       ├── 00_initial_schema.sql # 초기 스키마
│       └── 01_vault_helpers.sql  # Vault RPC 함수
├── SUPABASE_SETUP.md
├── CHANGELOG.md
└── 플랫폼 사업v1.0.2.md
```

## 데이터베이스 스키마

### 주요 테이블

- **profiles**: 사용자 확장 정보
- **api_keys**: 암호화된 API 키 저장 (Vault 사용)
- **characters**: 캐릭터 정의 (1:1 & 시뮬레이션)
- **chats**: 채팅 세션
- **messages**: 메시지 (토큰 사용량 추적)

### 보안 기능

- **Row Level Security (RLS)**: 모든 테이블에 적용
- **Supabase Vault**: API 키 암호화 저장
- **Edge Runtime Proxy**: 클라이언트에 API 키 노출 방지

상세 스키마는 `supabase/migrations/` 참조

## 배포

### Vercel 배포 (추천)

1. Vercel 계정 연동:
```bash
vercel login
```

2. 프로젝트 배포:
```bash
vercel --prod
```

3. 환경 변수 설정 (Vercel Dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### GitHub 연동 자동 배포

GitHub에 push하면 자동으로 Vercel에 배포됩니다.

## 사용 방법

1. **회원가입**: 이메일과 비밀번호로 계정 생성
2. **API 키 등록**: Google, OpenAI, Anthropic 중 선택하여 API 키 등록
   - [Google AI Studio](https://aistudio.google.com/app/apikey)
   - [OpenAI Platform](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/settings/keys)
3. **캐릭터 생성**: 템플릿 선택 또는 직접 시스템 프롬프트 작성
4. **채팅 시작**: 캐릭터와 API 키를 선택하여 대화 시작

## 개발 가이드

### 커밋 컨벤션
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트
- `chore`: 빌드/설정

### 코드 스타일
- TypeScript strict mode
- ESLint + Next.js 규칙
- Prettier (권장)

## 보안

### 왜 API 키를 믿고 등록해도 되나요?

**"개발자가 코드 바꿔서 API 키 훔치면 어떡하죠?"** - 합리적인 의심입니다.

이 플랫폼이 안전한 이유:

#### 1. **개발자도 API 키를 볼 수 없음**
- API 키는 등록 즉시 **Supabase Vault**로 암호화되어 저장됩니다
- 데이터베이스를 직접 확인해도 암호화된 덩어리만 보입니다
- 채팅할 때만 Edge Runtime(서버)에서 순간적으로 복호화하고 즉시 폐기됩니다
- 증거 코드: [`supabase/migrations/01_vault_helpers.sql`](./supabase/migrations/01_vault_helpers.sql)

#### 2. **GitHub-Vercel 자동 배포**
- 현재 이 저장소는 Vercel과 자동 연동되어 있습니다
- GitHub에 push → Vercel이 자동으로 해당 코드를 빌드/배포
- 개발자가 "다른 코드"를 슬쩍 끼워넣을 수 없습니다
- 배포 로그는 Vercel 대시보드에서 확인 가능합니다

#### 3. **오픈소스 = 투명성과 선택권**
- 그래도 못 믿겠다면? **합리적인 선택입니다.**
- 이 저장소를 Fork하고 본인의 Vercel 계정에 직접 배포할 수 있습니다
- 10분이면 완료되고 비용도 무료입니다

**오픈소스의 장점**:
- ✅ **투명성**: 모든 코드를 직접 확인 가능
- ✅ **선택권**: 공식 플랫폼 또는 셀프 호스팅
- ✅ **신뢰**: "믿으라"가 아니라 "확인하세요"

---

### API 키 보호 메커니즘
- ✅ Supabase Vault 암호화 저장
- ✅ Row Level Security로 사용자 격리
- ✅ Edge Runtime 프록시로 클라이언트 노출 방지
- ✅ HTTPS 통신

### 인증
- ✅ Supabase Auth
- ✅ 미들웨어 기반 보호 라우트
- ✅ JWT 토큰 검증

## 향후 계획

### Phase 1: 자체 모델 도입
- 비용 최적화 모델 학습
- 하이브리드 라우팅 (BYOK + 자체 모델)

### Phase 2: 커뮤니티 기능
- 캐릭터 공유 마켓
- 평점/리뷰 시스템

### Phase 3: 고급 기능
- RAG (문서 기반 대화)
- 음성 채팅
- 이미지 생성

## 라이센스

MIT License

## 기여

이슈와 PR을 환영합니다!

## 문의

프로젝트 관련 문의는 GitHub Issues로 등록해주세요.

---

**Made with ❤️ using Next.js, Supabase, and AI SDK**
