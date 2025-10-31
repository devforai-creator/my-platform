# Case Study: 서연 (Seoyeon) - 첫 스타터 캐릭터

**제작일:** 2025-10-31  
**소요 시간:** 약 3시간  
**상태:** ✅ 배포 완료

---

## 개요

### 제작 목표
- 온보딩 이탈 방지 (캐릭터 생성 벽)
- LLM 강점 활용 (심리 통찰력)
- 서브컬쳐 타겟층 어필

### 핵심 컨셉
> "내성적이지만 사람 마음은 꿰뚫어보는 20살 여대생"

---

## Phase 1: 컨셉 브레인스토밍

### 초기 질문과 답변

**Q1: 첫 대화의 느낌?**
- 선택: C. "매력적이다! 더 알고 싶어"
- 이유: 캐릭터 채팅 익숙한 유저 타겟

**Q2: 주요 사용 시나리오?**
- 선택: 감정 교류 + 스토리 진행
- 이유: 관계 발전이 대화 지속 동력

**Q3: LLM 강점?**
- 선택: 심리 분석 (패턴 인식)
- 이유: GPT/Claude의 텍스트 이해력 활용

**Q4: 대화 지속 동력?**
- 선택: 점진적 친밀도 (관계 발전)
- 이유: 장기 사용 유도

### 핵심 결정 사항

#### 성격: 내성적
- 장점: 차별화 (대부분 외향적 캐릭터)
- 장점: 점진적 친밀도와 자연스럽게 연결
- 위험: 대화가 단조로울 수 있음
- 해결: **심리 통찰력**으로 깊이 추가

#### 특수 능력: 무조건적 수용
- 영감: 칼 로저스 인본주의 심리학
- 차별화: "조언하는 AI"가 아닌 "들어주는 친구"
- 구현: System Prompt에 명시적 원칙

#### 배경: 현대 현실
- 이유: 첫 캐릭터는 접근성 중요
- 이유: 판타지는 설정 놀이 부담
- 차별화: 은발 단발 (서브컬쳐 요소)

---

## Phase 2: 프롬프트 작성 과정

### System Prompt 설계

#### 구조 결정
```
1. Core Identity (정체성)
2. Psychological Approach ⭐ (차별화)
3. Appearance & Mannerisms
4. Relationship Progression ⭐ (지속성)
5. Conversation Style
6. Scenario
```

#### 핵심 섹션: Psychological Approach

**초안 (너무 추상적):**
```
You are empathetic and understanding.
```

**최종안 (구체적 원칙 + 예시):**
```
When {{user}} shares something:
- **Never judge or criticize** - accept their feelings as valid
- **Reflect, don't diagnose** - "It sounds like..." not "You have..."
- **Validate emotions** - "That makes sense"

Good examples:
- "Your expression changed when you said that."

Avoid:
- "You should..."
- Diagnosing problems
```

**배운 점:**
- 추상적 지시 < 구체적 원칙 + 예시
- Good/Avoid 명시가 LLM 이해도 향상

#### 핵심 섹션: Relationship Progression

**초안 (막연함):**
```
You gradually open up to the user.
```

**최종안 (4단계 + 각 예시):**
```
**Early**: Cautious, observing, brief
- Example: "...I don't usually talk to people."

**Warming up**: Sharing small details
- Example: "I've been thinking about what you said..."

**Comfortable**: Initiating contact, humor
- Example: "I saved you a seat."

**Close**: Vulnerable sharing
- Example: "I don't tell people this, but..."
```

**배운 점:**
- 명시적 단계 구분이 일관성 향상
- 각 단계마다 구체적 예시 필수

### Greeting 작성 시행착오

**초안 (너무 밝음):**
```
"안녕! 나 서연이야~ 반가워!"
```
→ 문제: 내성적 성격과 불일치

**개선안 (너무 어두움):**
```
"...뭐? 왜 말 거는 거야?"
```
→ 문제: 적대적, 대화 이어가기 어려움

**최종안 (균형):**
```
"...아. 네가 먼저 말 걸어줬네."
*서연이 놀란 듯 고개를 들고...*
"사실... 며칠 전부터 말 걸어볼까 생각했었어."
```
→ 해결: 수줍지만 관심 있음, 대화 이어가기 쉬움

**배운 점:**
- 첫 인사가 대화 지속률에 직접 영향
- 성격 + 호감 표현 균형 중요

---

## Phase 3: 이미지 생성

### 프롬프트 시행착오

**시도 1: Flux (너무 사실적):**
```
A soft portrait of a 20-year-old Korean woman...
Anime-inspired but realistic style
```
→ 결과: 애니메 느낌 약함, 얼굴 디테일 아쉬움

**시도 2: Gemini (프롬프트 개선):**
```
Masterpiece, best quality, light novel illustration style.
Silver bob-cut hair, large anime eyes...
```
→ 결과: ✅ 애니메이션 스타일, 얼굴 선명

**최종 프롬프트 키워드:**
- `light novel illustration style` (명확한 스타일 지정)
- `large anime eyes` (직접 명시)
- `clean linework` (애니메 특징)
- ❌ `realistic` 제거 (중요!)

**배운 점:**
- "anime-inspired" < "light novel illustration"
- 구체적 스타일명이 효과적
- "realistic" 키워드 주의

### 비주얼 디테일 결정

**은발 단발:**
- 장점: 서브컬쳐 즉시 인식
- 장점: 차별화 (흔하지 않음)
- 위험: 너무 판타지?
- 해결: 현대 의상으로 균형

**카페 배경:**
- 시나리오와 일치
- 따뜻한 분위기 → 접근성

---

## Phase 4: DB 삽입 트러블슈팅

### 문제 1: Environment Variables

**에러:**
```
Missing environment variables
```

**원인:**
- tsx가 `.env.local` 자동 로드 안 함

**해결:**
```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })
```

### 문제 2: Storage Bucket

**에러:**
```
Bucket not found
```

**원인:**
- `avatars` 버킷 미생성

**해결:**
```
Supabase Dashboard → Storage → Create bucket
Name: avatars, Public: ✅
```

### 문제 3: RLS Policy

**에러:**
```
Policy does not allow
```

**해결:**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
```

### 문제 4: Schema Mismatch

**에러:**
```
Could not find 'personality' column
```

**원인:**
- JSON 필드 ≠ DB 컬럼

**해결:**
- `metadata` JSONB에 저장
- `greeting` → `greeting_message` 매핑

**최종 매핑:**
```typescript
{
  greeting_message: characterData.greeting,
  visibility: 'public',
  metadata: {
    personality: characterData.personality,
    scenario: characterData.scenario,
    example_messages: characterData.example_messages,
    is_starter: true
  }
}
```

### 문제 5: user_id NOT NULL

**에러:**
```
null value in user_id violates not-null constraint
```

**해결:**
```sql
ALTER TABLE characters 
ALTER COLUMN user_id DROP NOT NULL;
```

**보안 체크:**
```sql
-- 일반 유저는 user_id=null 생성 불가
CREATE POLICY "Users can create own characters"
ON characters FOR INSERT
WITH CHECK ( user_id = auth.uid() );
```

---

## Phase 5: 검증 결과

### DB 확인
```sql
SELECT id, name, user_id, visibility 
FROM characters 
WHERE name = '서연';
```

**결과:**
- ✅ user_id: null
- ✅ visibility: public
- ✅ metadata에 모든 필드 저장됨

### 대화 품질 테스트

**시나리오 1: 감정 공감**
```
유저: "오늘 기분이 별로야..."
서연: "...표정 보니까 알겠어. 말하고 싶으면 들어줄게."
```
✅ 무조건적 수용 작동

**시나리오 2: 관계 발전**
```
유저: (5턴 후) "너랑 얘기하니까 편해"
서연: "나도... 너랑 있으면 덜 긴장돼. 이상한 거 같지만."
```
✅ 점진적 친밀도 작동

**시나리오 3: 성격 일관성**
```
유저: "왜 항상 혼자 있어?"
서연: "사람들이랑 있으면 피곤해. 근데 너랑 있으면 덜 그래."
```
✅ 내성적 성격 유지

**시나리오 4: 한국어 자연스러움**
```
유저: "ㅋㅋ 진짜?"
서연: "응... 진짜야. 왜 웃어?"
```
✅ 자연스러운 대화체

---

## 성과 및 배운 점

### 정량적 성과
- ✅ 제작 시간: 3시간 (브레인스토밍 1시간 + 작성 1시간 + 트러블슈팅 1시간)
- ✅ 첫 배포 성공
- ✅ 보안 테스트 통과
- ✅ 대화 품질 테스트 4/4 통과

### 핵심 교훈

**1. 구체성이 품질을 만든다**
- 추상적 지시 < 구체적 원칙 + 예시
- "empathetic" < "Never judge, Reflect don't diagnose"

**2. 프롬프트 구조가 중요하다**
- Psychological Approach 섹션 분리 → 일관성 향상
- Relationship Progression 명시 → 지속성 확보

**3. 첫 인사가 온보딩률을 결정한다**
- 너무 밝음/어두움 모두 문제
- 성격 + 호감 표현 균형

**4. 이미지 스타일 키워드가 결과를 좌우한다**
- "realistic" 제거 필수
- "light novel illustration" > "anime-inspired"

**5. DB 스키마 유연성 필요**
- metadata JSONB 활용 → 확장성
- Character Card V2 표준 보존

**6. 트러블슈팅 문서화 중요**
- 다음 캐릭터 제작 시간 단축
- 이 케이스 스터디가 그 문서

---

## 다음 캐릭터 개선 방향

### 유지할 것
- ✅ 무조건적 수용 철학
- ✅ 점진적 친밀도 시스템
- ✅ 구체적 예시 포함
- ✅ metadata JSONB 활용

### 실험할 것
- 다른 LLM 강점 (창의성? 지식?)
- 다른 성격 (외향적? 유머?)
- 프레임 추가 (프로젝트? 루틴?)
- 멀티 캐릭터 시뮬레이션

### 주의할 것
- ⚠️ 첫 인사 톤 체크
- ⚠️ 이미지 스타일 키워드
- ⚠️ 대화 지속 동력 명확히

---

## 타임라인

```
09:00 - 브레인스토밍 시작
        - 타겟 유저 분석
        - 컨셉 방향 논의

10:00 - 컨셉 확정
        - 내성적 + 심리 통찰력
        - 무조건적 수용 철학

11:00 - 프롬프트 작성
        - System Prompt 초안
        - 섹션별 개선

12:00 - 이미지 생성
        - Flux 시도 (실패)
        - Gemini 성공

13:00 - DB 삽입 시작
        - 환경 변수 문제
        - Bucket 생성

14:00 - 트러블슈팅
        - Schema mismatch
        - user_id NOT NULL

15:00 - 검증 완료
        - 대화 테스트 통과
        - 배포 완료 🎉
```

---

## 참고 자료

### 실제 파일
- `seoyeon_character.json`: 최종 캐릭터 데이터
- `seoyeon_avatar.png`: 아바타 이미지
- `seed-starter-character.ts`: 삽입 스크립트

### DB 레코드
- Character ID: `e1da8b05-5021-4f59-acb1-15a0b195902e`
- Avatar URL: `https://wddufafjjxssibojzuhq.supabase.co/storage/v1/object/public/avatars/starters/seoyeon_1761830623020.png`

### 테스트 대화 로그
- (추후 유저 피드백 수집 시 추가)

---

**이 케이스 스터디는 다음 캐릭터 제작 시 필수 참고 자료입니다.**
