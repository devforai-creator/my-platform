# Gemini 검열 메시지 실시간 표시 문제 해결

**날짜**: 2025-10-30
**문제 해결 시간**: ~3시간
**버전**: v0.1.4

---

## 📋 문제 상황

### 증상
- Google Gemini가 검열로 빈 응답을 보낼 때, 서버는 시스템 메시지를 Supabase에 저장
- **하지만** 클라이언트 UI에서 빨간 경고 메시지가 **즉시 나타나지 않음**
- **새로고침하면** DB에서 불러온 메시지가 정상적으로 보임

### 재현 방법
1. Gemini API 키로 채팅 시작
2. 검열이 발생할만한 메시지 전송 (예: 폭력적 내용 요청)
3. 로딩 완료 후 → 아무 메시지도 안 뜸
4. 새로고침 → 빨간 경고 메시지 보임

---

## 🔍 디버깅 과정

### 1단계: 가설 수립 (초기)

**초기 가설**: 클라이언트 상태 관리 문제
- `useChat` 훅이 로컬에서 추가한 메시지를 덮어쓴다?
- `setMessages`로 추가한 메시지가 SWR 캐시와 충돌?

**시도한 방법들**:
- ❌ `setMessages`로 로컬 메시지 삽입
- ❌ `localSystemMessageIdsRef`로 중복 방지 로직 추가
- ❌ 복잡한 서버/로컬 메시지 sync 로직

**결과**: 모두 실패. 메시지가 여전히 새로고침 후에만 보임.

---

### 2단계: 근본 원인 파악 (디버깅 로그 추가) ⭐

**결정적 전환점**: 체계적인 로그 추가

#### 서버 로그 추가
```typescript
// src/app/api/chat/route.ts
console.log('🚀 [Chat API] streamText 시작')
console.log('🏁 [Chat API onFinish] 실행됨', { finishReason, textLength })
console.log('📤 [Chat API] 응답 반환 전 contentFilterError:', contentFilterError)
```

#### 클라이언트 로그 추가
```typescript
// ChatInterface.tsx
onError: (err) => {
  console.log('🔴 [onError] 실행됨', err)
  console.log('🔴 [onError] err.message:', err.message)
}

onFinish: () => {
  console.log('✅ [onFinish] 클라이언트 onFinish 실행')
}
```

### 발견한 사실들

**실제 로그 출력**:
```
🚀 [Chat API] streamText 시작
📤 [Chat API] 응답 반환 전 contentFilterError: null  ← ❗️ 여기서 이미 null!
✅ [Chat API] 정상 스트리밍 응답 반환
🏁 [Chat API onFinish] 실행됨 { finishReason: 'unknown', textLength: 0 }  ← ❗️ 나중에 실행됨
POST /api/chat 200 in 1622ms  ← 서버는 정상 응답
---
🔴 [onError] 실행됨 Error
🔴 [onError] err.message: (빈 문자열)  ← ❗️ 클라이언트는 에러!
```

### 핵심 발견 🎯

1. **타이밍 이슈**: `streamText()`는 즉시 반환되고, `onFinish`는 **나중에** 실행됨
2. **서버 응답**: 200 OK로 정상 완료 (409가 아님!)
3. **클라이언트 에러**: `onError`가 실행되지만 `err.message`가 비어있음

**왜?**
- Gemini가 검열로 **빈 응답**(textLength: 0)을 보냄
- 서버 `onFinish`는 비동기로 나중에 실행되어 DB에 저장
- 서버는 이미 200 OK 스트리밍 응답 시작
- 클라이언트는 빈 스트림을 파싱하지 못해 `processDataProtocolResponse`에서 에러 발생
- 하지만 AI SDK가 빈 메시지를 파싱하지 못해 `err.message`가 비어있음

---

### 3단계: AI SDK 문서 확인 ⭐

**외부 문서 확인이 결정적이었던 이유**:

#### 조사한 내용
- Vercel AI SDK의 `streamText` 동작 방식
- `onFinish` 콜백 실행 타이밍
- `finishReason = 'content-filter'` 감지 방법

#### 문서에서 발견한 사실
```
onFinish callback is triggered when the stream is finished
Stream consumption is REQUIRED for onFinish to execute
You cannot detect finishReason before streaming starts
```

**결론**:
- ❌ 스트리밍 **전에** 검열을 감지할 수 없음
- ❌ `onFinish`가 완료될 때까지 기다릴 방법 없음
- ✅ 스트리밍 **완료 후** DB에서 폴링하는 것이 정석

이 문서 확인이 없었다면 계속 잘못된 방향으로 접근했을 것입니다.

---

## 💡 해결 방법

### 최종 구현

**전략**: 검열 시 `onError`에서 폴링

```typescript
// src/app/dashboard/chats/[id]/ChatInterface.tsx
onError: (err) => {
  const messageText = err instanceof Error ? err.message : null

  // 빈 에러 메시지일 경우 (검열로 인한 빈 응답)
  if (!messageText) {
    // 1.5초 후 서버에서 시스템 메시지 확인
    setTimeout(async () => {
      const response = await fetch(`/api/chats/${chatId}/messages/latest`)
      const latestMessage = await response.json()

      // 시스템 메시지가 있으면 추가
      if (latestMessage?.role === 'system') {
        setErrorBanner(latestMessage.content)
        setMessages((prev) => [...prev, latestMessage])
      }
    }, 1500)
    return
  }

  setErrorBanner(messageText)
}
```

### 새로운 API 엔드포인트

```typescript
// src/app/api/chats/[chatId]/messages/latest/route.ts
export async function GET(req, { params }) {
  const { chatId } = await params
  const supabase = await createClient()

  // 인증 및 소유권 확인
  const { data: user } = await supabase.auth.getUser()
  // ...

  // 최근 메시지 1개 가져오기
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)

  return Response.json(messages?.[0] || null)
}
```

### 동작 흐름

```
1. Gemini 검열 발생 → 빈 응답 (textLength: 0)
2. 서버 onFinish → DB에 시스템 메시지 저장
3. 클라이언트 onError → 빈 메시지 감지
4. 1.5초 대기 → 서버 DB 저장 완료 시간 확보
5. 폴링 → /api/chats/[chatId]/messages/latest 호출
6. 시스템 메시지 발견 → 즉시 화면에 표시 + 배너 추가
```

---

## 📚 교훈 및 핵심 인사이트

### 1. 체계적인 로깅의 중요성 ⭐⭐⭐

**좋았던 점**:
- 이모지를 사용한 구분 (`🔴 [onError]`, `🚀 [Chat API]`)
- 실행 순서 추적 (시작 → 응답 반환 → onFinish)
- 상태 값 출력 (`contentFilterError`, `err.message`, `textLength`)

**결과**:
- 타이밍 이슈를 명확히 발견
- 서버는 정상인데 클라이언트에서 에러 발생하는 것 확인
- `err.message`가 비어있다는 결정적 단서 발견

### 2. 공식 문서 확인의 중요성 ⭐⭐⭐

**왜 결정적이었나**:
- AI SDK의 `streamText` 동작 방식을 정확히 이해
- `onFinish`가 스트림 소비 후에 실행된다는 것 확인
- 검열을 사전 감지할 수 없다는 것 확인
- **잘못된 접근을 조기에 포기**하고 올바른 방향으로 전환

**문서 없이는**:
- `onFinish`를 await하는 방법 계속 찾았을 것
- 복잡한 클라이언트 상태 동기화 로직에 계속 시간 소비
- 결국 해결 못 했을 수도 있음

### 3. 문제를 넓게 바라보기

**초기**: "클라이언트 상태 관리 문제겠지"
**중간**: "useChat의 내부 로직 문제일까?"
**최종**: "아, AI SDK의 스트리밍 구조 자체가 이렇게 동작하는구나"

**교훈**: 코드 디테일에 집중하기 전에 **시스템 전체 흐름**을 이해하는 것이 중요

### 4. 간단한 해결책이 최선일 때가 있다

**복잡한 시도들**:
- 로컬/서버 메시지 sync 로직
- `localSystemMessageIdsRef`로 중복 방지
- 복잡한 useEffect 체인

**최종 해결책**:
```typescript
setTimeout(async () => {
  const latest = await fetch('/latest')
  if (latest?.role === 'system') {
    setMessages(prev => [...prev, latest])
  }
}, 1500)
```

**교훈**: 때로는 **1.5초 폴링**이 복잡한 상태 관리보다 나을 수 있다.

---

## 🔧 디버깅 체크리스트 (재사용 가능)

다음에 비슷한 문제가 생기면:

- [ ] **로그부터 추가**: 서버/클라이언트 실행 순서 확인
- [ ] **공식 문서 확인**: 사용 중인 라이브러리의 동작 방식 이해
- [ ] **넓게 바라보기**: 코드 디테일 전에 시스템 전체 흐름 파악
- [ ] **간단한 해결책 고려**: 복잡한 로직이 항상 답은 아님
- [ ] **타이밍 확인**: 비동기 작업의 실행 순서 체크

---

## 📝 관련 파일

- `src/app/api/chat/route.ts` - 스트리밍 엔드포인트
- `src/app/dashboard/chats/[id]/ChatInterface.tsx` - 채팅 UI 컴포넌트
- `src/app/api/chats/[chatId]/messages/latest/route.ts` - 새로운 폴링 API

---

## 🔗 참고 자료

- [Vercel AI SDK - streamText Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK Issue #4220 - Azure OpenAI content filter](https://github.com/vercel/ai/issues/4220)
- [AI SDK Discussion #4845 - Guidance on persisting messages](https://github.com/vercel/ai/discussions/4845)
