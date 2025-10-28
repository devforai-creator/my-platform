# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-10-28

### 🚀 홍보 전 필수 패치

v0.1.0의 치명적인 비용 문제를 해결하고 사용자 신뢰성을 위한 토큰 모니터링 기능을 추가했습니다.

### Added

#### FIFO 컨텍스트 윈도우
- 최근 N개 메시지만 LLM에 전송 (기본값: 20개)
- `chats.max_context_messages` DB 필드 활용
- `/api/chat/route.ts`에서 `messages.slice(-maxContextMessages)` 구현
- **효과**: 긴 대화에서 토큰 비용 대폭 절감

#### 토큰 사용량 통계
- **채팅 화면 실시간 표시** (`ChatInterface.tsx`):
  - API 키 선택 바 우측에 토큰 통계 배치
  - 총 토큰, 입력 토큰, 출력 토큰 구분 표시
  - 숫자 천 단위 콤마 포맷팅
- **대시보드 통계 카드** (`dashboard/page.tsx`):
  - 그래디언트 디자인 (파란색→보라색)
  - 전체 계정 토큰 사용량 집계
  - 3개 박스로 구분: 총/입력/출력
  - Google Gemini 무료 티어 안내 문구

### Changed
- 채팅 로직: 모든 메시지 전송 → FIFO 컨텍스트 윈도우 적용
- 대시보드 UI: 토큰 통계 카드 추가 (환영 메시지 아래)

### Technical Details
- Server Component에서 토큰 집계 (DB 쿼리 최적화)
- `messages` 테이블의 `prompt_tokens`, `completion_tokens` 필드 활용
- Supabase join으로 사용자별 메시지 필터링

### Fixed
- **토큰 폭탄 방지**: 긴 대화에서 전체 히스토리 전송으로 인한 비용 증가 문제 해결
- **비용 가시성**: 사용자가 API 비용을 실시간으로 모니터링 가능

### Documentation
- README.md: v0.1.1로 버전 업데이트, 주요 기능에 컨텍스트 윈도우 & 토큰 통계 추가
- ROADMAP.md: v0.1.1 섹션 추가, Known Issues 업데이트
- CLAUDE.md: Recent Updates 섹션 추가
- package.json: 버전 0.1.1로 업데이트

### Notes
- 이 패치로 **홍보 준비 완료**: 사용자 신뢰를 위한 최소 요구사항 충족
- 컨텍스트 윈도우 크기는 현재 고정 (UI 커스터마이징은 v0.2.0 예정)

---

## [0.1.0] - 2025-10-27

### 🎉 Phase 0 MVP Release

Phase 0 MVP 완성! BYOK 기반 캐릭터 채팅 플랫폼의 핵심 기능이 모두 구현되었습니다.

### Added

#### 인증 시스템
- 회원가입 페이지 (`/auth/signup`)
- 로그인 페이지 (`/auth/login`)
- Supabase Auth 통합
- 인증 미들웨어로 보호된 라우트 관리
- 자동 프로필 생성 (database trigger)

#### API 키 관리 (BYOK)
- API 키 등록 UI (`/dashboard/api-keys`)
- 3개 provider 지원: Google Gemini, OpenAI, Anthropic
- Supabase Vault를 이용한 API 키 암호화 저장
- 모델별 선호도 설정 기능
- API 키 활성화/비활성화 토글
- API 키 삭제 기능
- 마지막 사용 시간 추적

#### 캐릭터 관리
- 캐릭터 목록 페이지 (`/dashboard/characters`)
- 캐릭터 생성 페이지 (`/dashboard/characters/new`)
- 캐릭터 수정 페이지 (`/dashboard/characters/[id]/edit`)
- 3가지 템플릿 제공:
  - 빈 템플릿 (처음부터 작성)
  - 1:1 캐릭터 템플릿
  - 멀티 캐릭터 시뮬레이션 템플릿
- 시스템 프롬프트 자유 작성
- 인사말 설정
- 캐릭터 아카이브 (소프트 삭제)
- Private 캐릭터 기본 설정

#### 실시간 채팅
- 채팅 목록 페이지 (`/dashboard/chats`)
- 새 채팅 시작 (`/dashboard/chats/new`)
- 채팅 인터페이스 (`/dashboard/chats/[id]`)
- **실시간 스트리밍 응답** (AI SDK `useChat` hook)
- 자동 메시지 저장
- 토큰 사용량 추적 (prompt_tokens, completion_tokens)
- 자동 스크롤
- 로딩 인디케이터 (애니메이션 점 3개)
- Enter 전송 / Shift+Enter 줄바꿈

#### AI & LLM 통합
- Vercel AI SDK v3.4.33 통합
- Edge Runtime API 라우트 (`/api/chat`)
- 60초 maxDuration 설정
- Provider별 모델 인스턴스 생성:
  - `createGoogleGenerativeAI` (Gemini 2.5)
  - `createOpenAI` (GPT-5, GPT-4.1)
  - `createAnthropic` (Claude 4.5)
- 2025년 10월 기준 최신 모델 지원:
  - Google: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
  - OpenAI: gpt-5, gpt-4.1, gpt-4.1-nano
  - Anthropic: claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-1

#### 데이터베이스
- PostgreSQL 스키마 설계 (`00_initial_schema.sql`)
- 5개 테이블: profiles, api_keys, characters, chats, messages
- Row Level Security (RLS) 정책 모든 테이블 적용
- Supabase Vault 헬퍼 함수 (`01_vault_helpers.sql`)
- 자동 증가 메시지 시퀀스 번호
- 타임스탬프 자동 관리

#### UI/UX
- Tailwind CSS 반응형 디자인
- 다크 모드 지원 (dark: 클래스)
- 모바일 친화적 레이아웃
- 로딩 상태 표시
- 에러 메시지 표시
- 대시보드 퀵 액션 카드
- 시작 가이드

#### 배포 & 인프라
- Vercel 프로덕션 배포
- GitHub private repository 연동
- 환경 변수 관리
- Next.js 15 App Router
- TypeScript 5 strict mode
- ESLint 설정

### Technical Details

#### Dependencies
- **Frontend**: Next.js 15.5.6, React 19, TypeScript 5
- **Styling**: Tailwind CSS 3.4, autoprefixer, postcss
- **Database**: @supabase/supabase-js 2.39.0, @supabase/ssr 0.5.0
- **AI SDK**:
  - ai@3.4.33
  - @ai-sdk/google@0.0.55
  - @ai-sdk/openai@0.0.72
  - @ai-sdk/anthropic@0.0.56

#### Architecture
- **Runtime**: Edge Runtime for chat API
- **Auth**: Supabase Auth with JWT
- **Secret Management**: Supabase Vault
- **API Proxy**: Server-side to protect API keys
- **Real-time**: Streaming responses via AI SDK

### Security
- ✅ API 키 Vault 암호화 저장
- ✅ Row Level Security (RLS) 전체 테이블
- ✅ 인증 미들웨어
- ✅ Edge Runtime 프록시
- ✅ HTTPS 통신

### Documentation
- README.md 완전 업데이트
- CHANGELOG.md 생성
- Supabase 설정 가이드 (SUPABASE_SETUP.md)
- 사업 계획서 (플랫폼 사업v1.0.2.md)

### Fixed
- TypeScript 빌드 오류 (logout 함수 반환 타입)
- AI SDK import 경로 (`ai/react`)
- Provider 패키지 버전 호환성 (v3.x → 0.0.x)
- `useChat` hook 통합

### Known Issues
- ~~**FIFO 컨텍스트 윈도우 미구현**~~ → ✅ v0.1.1에서 해결
- ~~**토큰 사용량 통계 없음**~~ → ✅ v0.1.1에서 해결
- Supabase Realtime.js Edge Runtime 경고 (기능에는 영향 없음)
- NSFW 콘텐츠 Google Gemini 검열 (provider 특성)

---

## [Unreleased]

### Planned for Phase 1
- 자체 모델 도입
- 비용 최적화
- 하이브리드 라우팅

### Planned for Phase 2
- 캐릭터 공유 마켓
- 평점/리뷰 시스템
- 커뮤니티 기능

### Planned for Phase 3
- RAG (문서 기반 대화)
- 음성 채팅
- 이미지 생성

---

## Release Notes

### v0.1.0 - Phase 0 MVP
**출시일**: 2025-10-27

Phase 0 MVP의 모든 핵심 기능이 완성되었습니다! 사용자는 이제 자신의 API 키를 안전하게 등록하고, 캐릭터를 생성하여, 실시간 스트리밍 채팅을 즐길 수 있습니다.

**주요 하이라이트**:
- 🔐 완벽한 보안: Vault 암호화 + RLS
- 🚀 실시간 스트리밍: AI SDK 통합
- 📱 모바일 지원: 반응형 디자인
- 🌐 프로덕션 배포: Vercel + GitHub

**다음 단계**: 사용자 피드백 수집 및 Phase 1 준비

---

[0.1.1]: https://github.com/devforai-creator/my-platform/releases/tag/v0.1.1
[0.1.0]: https://github.com/devforai-creator/my-platform/releases/tag/v0.1.0
