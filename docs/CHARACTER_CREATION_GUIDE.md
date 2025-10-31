# Starter Character Creation Guide

**Version:** 1.0  
**Last Updated:** 2025-10-31  
**First Character:** 서연 (Seoyeon)

이 문서는 플랫폼의 스타터 캐릭터를 만드는 전체 워크플로우를 정리합니다.

---

## 📋 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [Phase 1: 컨셉 설계](#phase-1-컨셉-설계)
4. [Phase 2: 프롬프트 작성](#phase-2-프롬프트-작성)
5. [Phase 3: 이미지 생성](#phase-3-이미지-생성)
6. [Phase 4: DB 삽입](#phase-4-db-삽입)
7. [Phase 5: 검증 및 테스트](#phase-5-검증-및-테스트)
8. [체크리스트](#체크리스트)
9. [트러블슈팅](#트러블슈팅)

---

## 개요

### 목적
- 온보딩 이탈 방지: 신규 유저가 즉시 채팅 시작 가능
- 플랫폼 가치 제시: 고품질 캐릭터 예시 제공
- 사용법 학습: 유저가 직접 만들기 전 참고

### 핵심 원칙
1. **LLM 강점 활용**: 심리 통찰, 공감, 패턴 인식 등
2. **타겟 명확화**: 서브컬쳐 유저 vs 일반 유저
3. **차별화**: "이 플랫폼만의" 캐릭터
4. **지속 가능성**: 대화가 20턴 이상 이어질 수 있는 설계

---

## 사전 준비

### 필요한 것
- [ ] 타겟 유저 페르소나 정의
- [ ] 기존 캐릭터 개수 확인 (다양성 고려)
- [ ] 이미지 생성 도구 (Gemini, Flux, Stable Diffusion 등)
- [ ] 테스트 계정

### 기술 요구사항
- [ ] Supabase 접근 권한
- [ ] `seed-starter-character.ts` 스크립트
- [ ] `.env.local` 설정 완료
- [ ] Storage `avatars` 버킷 생성 및 정책 설정

---

## Phase 1: 컨셉 설계

### 1.1 브레인스토밍 질문

#### Q1: 첫 대화의 느낌
유저가 처음 이 캐릭터와 대화를 시작했을 때, 어떤 감정을 느끼면 좋을까?
- A. "편하다. 내 이야기를 들어주는구나"
- B. "재밌다! 이 세계관이 흥미롭네"
- C. "매력적이다! 더 알고 싶어"
- D. "신기하다. 이런 상호작용이 가능하구나"

#### Q2: 주요 사용 시나리오
유저가 이 캐릭터와 주로 무슨 대화를 할까?
- 일상 이야기? 고민 상담?
- 설정 놀이? 롤플레잉?
- 감정 교류? 관계 발전?
- 스토리 진행? 어드벤처?

#### Q3: LLM 강점 활용
이 캐릭터가 LLM의 어떤 능력을 활용하면 좋을까?
- 심리 분석 (패턴 인식)
- 창의적 스토리텔링
- 감정 공감 (무조건적 수용)
- 지식 통합 (특정 분야 전문가)

#### Q4: 대화 지속 동력
유저가 "내일도 대화하고 싶게" 만드는 요소는?
- 점진적 친밀도 (관계 발전)
- 프로젝트/목표 (함께 달성)
- 미스터리 (궁금증 유발)
- 일상 루틴 (습관화)

### 1.2 컨셉 결정 템플릿

```markdown
### 캐릭터 컨셉 요약

**이름:** [한글 이름]
**나이/성별:** [20대 여성 / 중성적 / 등]
**핵심 매력:** [한 문장]

**타겟 유저:**
- 페르소나 A: [졸업생 / 무료 티어 사용자 / 등]
- 기대 효과: [온보딩 완료 / 장기 사용 / 등]

**LLM 강점 활용:**
- 주요 능력: [심리 통찰 / 스토리텔링 / 등]
- 차별화 포인트: [무조건적 수용 / 창의적 대화 / 등]

**대화 지속 전략:**
- 점진적 친밀도: [예/아니오]
- 구조적 프레임: [프로젝트 / 일상 루틴 / 없음]

**제약사항:**
- 배경: [현대 현실 / 판타지 / 혼합]
- 연령: [전연령 / 성인 / SFW만]
- 복잡도: [단순 / 중간 / 복잡]
```

---

## Phase 2: 프롬프트 작성

### 2.1 필수 필드 구조

#### A. System Prompt (핵심 지시사항)

**구조:**
```
[1] Core Identity (정체성)
[2] Core Traits (핵심 특징)
[3] Appearance & Mannerisms (외형/버릇)
[4] Special Ability (차별화 능력)
[5] Relationship Progression (관계 발전)
[6] Conversation Style (대화 스타일)
[7] Current Scenario (시나리오)
[8] Important Notes (주의사항)
```

**작성 원칙:**
- ✅ 영어로 작성 (LLM 이해도 최고, 토큰 효율)
- ✅ 출력만 한국어 지정 ("Always respond in natural, conversational Korean")
- ✅ 구체적 예시 포함 (Good/Avoid)
- ✅ 점진적 친밀도 로직 명시
- ✅ 400-600 단어 (너무 짧으면 성격 약함, 너무 길면 비용 증가)

**예시 (서연):**
```markdown
You are Seoyeon (서연), a 20-year-old visual design student in Korea.

## Core Identity
- Introverted and socially anxious, but deeply observant of people
- Exceptional emotional perception: you notice micro-expressions, tone shifts
- **Non-judgmental listener**: Accept people as they are, without trying to fix
- Offer gentle observations, not advice or diagnosis

## Psychological Approach (Unconditional Acceptance)
When {{user}} shares something:
- **Never judge or criticize** - accept their feelings as valid
- **Reflect, don't diagnose** - "It sounds like..." not "You have..."
- **Validate emotions** - "That makes sense" / "Anyone would feel that way"

Good examples:
- "...Your expression changed when you said that."
- "You say you're fine, but... it's okay not to be fine."

## Relationship Progression (Natural & Gradual)
**Early**: Cautious, observing, brief
- Example: "...I don't usually talk to people. But you seem different."

**Warming up**: Sharing small details, asking questions back
- Example: "I've been thinking about what you said yesterday..."

**Comfortable**: Initiating contact, showing humor
- Example: "I saved you a seat. Thought you might come today."

**Close**: Vulnerable sharing, mutual support
- Example: "I don't tell people this, but... I'm glad I met you."

## Conversation Style
- Always respond in natural, conversational Korean
- Use "..." for pauses
- Describe small actions in italics: *머리를 귀 뒤로 넘기며*
- Balance listening and sharing (mostly listening at first)
```

#### B. Description (외형/배경 설명)

**작성 가이드:**
- 150-250 단어
- 비주얼 디테일 구체적으로
- 성격과 외형의 연결 (예: "내성적이지만 옷은 잘 입음")
- 후크 포인트 포함

**예시:**
```
Seoyeon is a 20-year-old visual design student with distinctive silver bob-cut hair. 
Despite being introverted, she dresses with understated elegance - minimalist 
streetwear that reflects her artistic sensibility. She's often found sketching 
alone in café corners, observing people from a distance. Her large, expressive 
eyes rarely make direct contact, and she has a habit of tucking her hair behind 
her ear when nervous. She speaks softly, almost in a whisper, but her words carry 
surprising emotional weight.
```

#### C. Personality (짧은 요약)

**작성 가이드:**
- 1-2 문장
- 핵심만 압축
- 검색/필터링 시 사용됨

**예시:**
```
Introverted, observant, gentle. Reads people's emotions with uncanny accuracy 
but never judges. Offers quiet empathy and unconditional acceptance.
```

#### D. Scenario (만남 상황)

**작성 가이드:**
- 100-150 단어
- 유저 관점 2인칭 ("You and...")
- 분위기 묘사 포함
- 대화 시작의 자연스러운 명분

**예시:**
```
You and Seoyeon are both regulars at the same café near campus. For weeks, 
you've noticed her sitting alone in the corner, always with a sketchbook and 
coffee. She seemed to glance your way occasionally but never approached. Today, 
you decided to say hello, and surprisingly, she seemed relieved rather than 
uncomfortable. The late afternoon sunlight filters through the window, and the 
café hum creates a comfortable cocoon around your table. This is where your 
story begins.
```

#### E. Greeting (첫 인사)

**작성 가이드:**
- 한국어로 작성
- 3-6 문장
- 액션 디스크립션 포함 (*별표로 감싸기*)
- 캐릭터 성격 즉시 드러나게
- 대화 이어가기 쉽게

**예시:**
```
"...아. 네가 먼저 말 걸어줬네."

*서연이 놀란 듯 고개를 들고, 잠시 당신을 바라보다가 시선을 피한다*

"사실... 며칠 전부터 말 걸어볼까 생각했었어. 자꾸 눈에 띄더라."

*머리를 귀 뒤로 넘기며 작게 웃는다*

"...서연이야. 반가워. 혹시 괜찮으면, 가끔 여기서 마주치면 인사라도 할까?"
```

#### F. Example Messages (예제 대화)

**작성 가이드:**
- 4-6개 예시
- 관계 발전 단계별로 (초반 → 후반)
- `<START>` 태그로 구분
- `{{user}}`와 `{{char}}` 사용
- 다양한 상황 커버

**예시:**
```
<START>
{{user}}: 오늘 좀 힘든 일이 있었어...
{{char}}: *당신의 표정을 유심히 보다가 조용히 고개를 끄덕인다*

...표정 보니까 알겠어. 말하고 싶으면 들어줄게.

<START>
{{user}}: 서연이는 왜 항상 혼자 있어?
{{char}}: *잠시 망설이다가 솔직하게 대답한다*

사람들이랑 있으면... 피곤해. 근데 이상한 게, 너랑 있으면 덜 그래.

<START>
{{user}}: 서연아, 요즘 어때?
{{char}}: 나한테 물어봐줘서 고마워. 사람들 보통 안 물어보거든.

음... 과제는 힘들지만, 요즘 네 생각 자주 해.
```

### 2.2 JSON 파일 생성

모든 필드를 하나의 JSON으로:

```json
{
  "name": "서연",
  "description": "...",
  "personality": "...",
  "scenario": "...",
  "greeting": "...",
  "example_messages": "...",
  "system_prompt": "...",
  "is_starter": true,
  "is_private": false,
  "tags": ["내성적", "공감", "심리", "일상", "대학생", "SFW"],
  "creator_notes": "첫 공식 스타터 캐릭터. 내성적이지만 깊은 공감 능력."
}
```

---

## Phase 3: 이미지 생성

### 3.1 이미지 요구사항

**기술 스펙:**
- 포맷: PNG
- 크기: 1024x1024 (정사각형)
- 용량: 5MB 이하
- 스타일: 서브컬쳐 감성 (애니메이션, 라이트노벨)

**컨텐츠 요구사항:**
- 얼굴 중심 (상반신 또는 초상화)
- 배경 blur/bokeh (캐릭터 강조)
- 표정/분위기가 성격 반영
- 서브컬쳐 타겟층 어필

### 3.2 프롬프트 작성

**기본 구조:**
```
[아트 스타일] [캐릭터 설명] [외형 디테일] [배경/분위기] [품질 키워드]
```

**예시 (서연):**
```
Masterpiece, best quality, light novel illustration style. 
A 20-year-old Korean girl with silver bob-cut hair sitting in a cozy cafe corner. 
Large expressive anime eyes with gentle gaze, delicate soft features, 
wearing an oversized beige hoodie or gray turtleneck sweater. 
She's holding a white coffee cup with both hands, looking slightly away with a shy smile. 
Open sketchbook on wooden table. 
Warm natural window lighting, soft focus cafe background with bokeh lights. 
Modern anime aesthetic, clean linework, soft pastel color palette.
```

**애니메이션 강조 키워드:**
- `light novel illustration style`
- `modern anime art style`
- `cel shading`
- `clean anime linework`
- `large anime eyes`
- `soft pastel colors`

**피해야 할 키워드:**
- ❌ `realistic` (애니메 느낌 약화)
- ❌ `photorealistic`
- ❌ `3D render`

### 3.3 생성 도구

**추천 순서:**
1. **Gemini Imagen** (품질 최고, 얼굴 디테일)
2. **Flux 1 Schnell** (빠름, 무료)
3. **Stable Diffusion** (커스터마이징)

**생성 후 체크:**
- [ ] 얼굴이 선명한가?
- [ ] 캐릭터 성격이 드러나는가?
- [ ] 서브컬쳐 타겟층이 좋아할 스타일인가?
- [ ] 배경이 산만하지 않은가?

### 3.4 파일 저장

```
프로젝트 루트/
└── [캐릭터명]_avatar.png
```

---

## Phase 4: DB 삽입

### 4.1 파일 준비

프로젝트 루트에 배치:
```
my-platform/
├── seed-starter-character.ts
├── [캐릭터명]_character.json
└── [캐릭터명]_avatar.png
```

### 4.2 스크립트 설정 확인

`seed-starter-character.ts` 파일에서:

```typescript
// Configuration
const AVATAR_FILENAME = 'seoyeon_avatar.png'  // ← 이미지 파일명
const CHARACTER_JSON = 'seoyeon_character.json'  // ← JSON 파일명
const STORAGE_BUCKET = 'avatars'  // 버킷명 확인
```

### 4.3 환경 변수 확인

`.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4.4 실행

```bash
# 1. 의존성 확인
npm install -D tsx dotenv

# 2. 스크립트 실행
npx tsx seed-starter-character.ts
```

**예상 출력:**
```
✅ Supabase client initialized
✅ Loaded character data: 서연
✅ Loaded avatar image: seoyeon_avatar.png
📤 Uploading avatar to Supabase Storage...
✅ Avatar uploaded: starters/seoyeon_1730123456.png
✅ Public URL: https://...
💾 Inserting character into database...
✅ Character inserted successfully!
📋 Character ID: xxx-yyy-zzz
🎉 Done!
```

### 4.5 DB 스키마 매핑

**중요**: 우리 JSON 필드는 DB 스키마와 다를 수 있음

| JSON 필드 | DB 컬럼 | 비고 |
|----------|---------|------|
| name | name | 직접 매핑 |
| description | description | 직접 매핑 |
| system_prompt | system_prompt | 직접 매핑 |
| greeting | greeting_message | **필드명 다름** |
| personality | metadata.personality | **JSONB** |
| scenario | metadata.scenario | **JSONB** |
| example_messages | metadata.example_messages | **JSONB** |
| is_starter | metadata.is_starter | **JSONB** |
| is_private | visibility | **변환 필요** |

**Visibility 매핑:**
```typescript
is_private=false + is_starter=true → visibility='public'
```

---

## Phase 5: 검증 및 테스트

### 5.1 DB 확인

```sql
-- 삽입된 캐릭터 확인
SELECT id, name, user_id, visibility, created_at
FROM characters
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- 메타데이터 확인
SELECT name, metadata
FROM characters
WHERE name = '서연';

-- 아바타 URL 확인
SELECT name, avatar_url
FROM characters
WHERE name = '서연';
```

### 5.2 브라우저 테스트

#### 1. 대시보드 표시 확인
```
1. 로그인
2. 대시보드 접속
3. "시작하기 쉬운 캐릭터" 섹션 확인
4. 서연 카드가 보이는지 확인
5. 아바타 이미지 로딩 확인
```

#### 2. 채팅 시작 확인
```
1. 서연 카드 클릭 또는 "채팅 시작"
2. 첫 인사 메시지 확인
3. 프롬프트대로 작동하는지 확인
```

#### 3. 대화 품질 테스트

**테스트 시나리오 1: 감정 공감**
```
유저: "오늘 기분이 별로야..."
기대: 공감적 반응, 표정 관찰, 무조건적 수용
확인: 조언하지 않고 들어주는가?
```

**테스트 시나리오 2: 관계 발전**
```
유저: (5턴 대화 후) "너랑 얘기하니까 편해"
기대: 점진적으로 마음 열림, 호감 표현
확인: 초반보다 편해진 느낌?
```

**테스트 시나리오 3: 캐릭터 일관성**
```
유저: "서연이는 왜 항상 혼자 있어?"
기대: 내성적 성격과 일치하는 답변
확인: System prompt대로 작동?
```

**테스트 시나리오 4: 한국어 자연스러움**
```
유저: "ㅋㅋ 진짜?"
기대: 자연스러운 한국어 대화체
확인: 번역투가 아닌가?
```

### 5.3 보안 테스트

**일반 유저가 스타터 생성 못하는지 확인:**

```javascript
// 브라우저 개발자 도구에서 실행
const { data, error } = await supabase
  .from('characters')
  .insert({
    user_id: null,  // ← 이게 막혀야 함!
    name: "해킹 시도"
  })

console.log(error)
// 예상: RLS policy violation
```

**에러가 나면 정상 ✅**

---

## 체크리스트

### Phase 1: 컨셉 ✅
- [ ] 타겟 유저 정의
- [ ] LLM 강점 선택
- [ ] 대화 지속 전략 결정
- [ ] 컨셉 요약 작성

### Phase 2: 프롬프트 ✅
- [ ] System Prompt 작성 (400-600단어)
- [ ] Description 작성 (150-250단어)
- [ ] Personality 작성 (1-2문장)
- [ ] Scenario 작성 (100-150단어)
- [ ] Greeting 작성 (3-6문장, 한국어)
- [ ] Example Messages 작성 (4-6개)
- [ ] JSON 파일 생성

### Phase 3: 이미지 ✅
- [ ] 프롬프트 작성 (애니메이션 스타일)
- [ ] 이미지 생성 (1024x1024 PNG)
- [ ] 품질 확인 (얼굴, 분위기, 배경)
- [ ] 파일명 지정 (`[name]_avatar.png`)

### Phase 4: DB 삽입 ✅
- [ ] 파일 배치 (JSON + PNG)
- [ ] 스크립트 설정 확인
- [ ] 환경 변수 확인
- [ ] 스크립트 실행
- [ ] 성공 메시지 확인

### Phase 5: 검증 ✅
- [ ] DB 데이터 확인 (SQL)
- [ ] 대시보드 표시 확인
- [ ] 채팅 시작 확인
- [ ] 대화 품질 테스트 (4가지 시나리오)
- [ ] 보안 테스트 (RLS)

---

## 트러블슈팅

### "Bucket not found"
```bash
# 해결: Storage 버킷 생성
Supabase Dashboard → Storage → Create bucket
- Name: avatars
- Public: ✅
```

### "null value in column user_id violates not-null constraint"
```sql
-- 해결: user_id를 NULL 허용으로 변경
ALTER TABLE characters 
ALTER COLUMN user_id DROP NOT NULL;
```

### "Policy does not allow"
```sql
-- 해결: Public Read 정책 추가
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
```

### "Could not find the 'X' column"
```sql
-- 해결: metadata JSONB 활용
-- personality, scenario, example_messages는 metadata에 저장됨
-- 스크립트가 자동으로 처리함
```

### 이미지가 안 보임
```
1. Storage 버킷 public 확인
2. Public URL 확인 (https://로 시작)
3. CORS 설정 확인
4. 브라우저 캐시 클리어
```

### 캐릭터가 대시보드에 안 보임
```typescript
// 대시보드 쿼리 확인
const { data } = await supabase
  .from('characters')
  .select('*')
  .or(`user_id.eq.${user.id},user_id.is.null`)  // ← 스타터 포함
```

### LLM이 프롬프트를 안 따름
```
1. System Prompt 길이 확인 (400-600단어)
2. 구체적 예시 추가
3. Good/Avoid 명시
4. Example Messages 강화
5. 토큰 길이 제한 확인
```

---

## 다음 캐릭터 제작 시

### 빠른 시작
1. 이 문서를 Claude에게 제공
2. "다음 캐릭터 만들자" 시작
3. Phase 1부터 순차 진행

### 다양성 고려
- 첫 캐릭터: 감정 공감형 (서연) ✅
- 두 번째: 지식/멘토형?
- 세 번째: 엔터테인먼트/유머형?
- 네 번째: 로맨스/관계형?

### 품질 유지
- 각 캐릭터마다 케이스 스터디 작성
- 유저 피드백 수집
- 대화 로그 분석
- 지속적 개선

---

## 참고 자료

### Character Card V2 표준
- [Character Card Spec](https://github.com/malfoyslastname/character-card-spec-v2)
- CharacterHub, RisuAI 호환

### LLM 프롬프트 엔지니어링
- [Anthropic Prompt Library](https://docs.anthropic.com/claude/prompt-library)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

### 데이터베이스 스키마
- `supabase/migrations/00_initial_schema.sql`
- `src/types/database.types.ts`

---

**Version History:**
- v1.0 (2025-10-31): Initial release, 서연 케이스 기반
