# 캐릭터 카드 포맷 조사 보고서

**조사일**: 2025-10-30  
**목적**: Phase 2 캐릭터 공유 마켓 구현을 위한 표준 포맷 분석

---

## 📋 Executive Summary

RisuAI와 SillyTavern은 **동일한 오픈 표준(Character Card Specification)**을 사용합니다. PNG 이미지에 JSON 메타데이터를 임베드하는 방식이며, V2와 V3 두 가지 주요 버전이 존재합니다. 이 표준은 자유롭게 사용 가능하며, 수백 개의 플랫폼에서 채택하고 있습니다.

**핵심 결론**:
- ✅ PNG V3 + V2 백필 전략 채택 권장
- ✅ CHARX(RisuAI 전용)는 무시해도 무방
- ✅ Spec 자체 사용에 라이선스 문제 없음
- ✅ 외부 링크 방식이 직접 Import보다 법적으로 안전

---

## 1. 캐릭터 카드 포맷 개요

### 1.1 공통 표준: Character Card Specification

| 항목 | 설명 |
|------|------|
| **저장 방식** | PNG 이미지의 tEXt chunk에 JSON 메타데이터 임베드 |
| **인코딩** | UTF-8 → Base64 |
| **호환성** | RisuAI, SillyTavern, Chub, Agnai, KoboldAI 등 대부분 플랫폼 |
| **표준 관리** | 커뮤니티 기반 오픈 제안 (No single owner) |

### 1.2 주요 포맷 비교

| 포맷 | tEXt Chunk 이름 | 버전 | 호환성 | 비고 |
|------|----------------|------|--------|------|
| **PNG V1** | `chara` | 1.0 | 레거시 | 기본 필드만 지원 |
| **PNG V2** | `chara` | 2.0 | ⭐ 거의 모든 플랫폼 | TavernCard V2 spec |
| **PNG V3** | `ccv3` | 3.0 | 최신 플랫폼 | V2 슈퍼셋, 확장 기능 |
| **JSON V2/V3** | N/A | 2.0/3.0 | 모든 플랫폼 | 디버깅/편집 용이 |
| **CHARX** | N/A (ZIP) | 3.0 | ⚠️ RisuAI 전용 | 에셋 포함 아카이브 |

---

## 2. PNG V2 Specification (TavernCard V2)

### 2.1 기본 구조

```typescript
type TavernCardV2 = {
  // === V1 호환 필드 ===
  name: string                    // 캐릭터 이름
  description: string             // 설명
  personality: string             // 성격
  scenario: string                // 시나리오
  first_mes: string               // 첫 인사말
  mes_example: string             // 예제 대화
  
  // === V2 추가 필드 ===
  creator_notes?: string          // 제작자 노트
  system_prompt?: string          // 시스템 프롬프트
  post_history_instructions?: string  // Jailbreak 프롬프트
  alternate_greetings?: string[]  // 대체 인사말
  character_version?: string      // 버전 번호
  tags?: string[]                 // 태그
  creator?: string                // 제작자
  
  // === Lorebook (World Info) ===
  character_book?: {
    name?: string
    description?: string
    scan_depth?: number
    token_budget?: number
    recursive_scanning?: boolean
    entries: Array<{
      keys: string[]              // 트리거 키워드
      content: string             // 삽입할 내용
      extensions?: {
        position?: 'before_char' | 'after_char'
        depth?: number
        probability?: number
        enabled?: boolean
        // ...
      }
    }>
  }
  
  // === 플랫폼별 확장 ===
  extensions?: {
    [key: string]: any            // 플랫폼 전용 데이터
  }
}
```

### 2.2 Magic Strings (변수 치환)

대화 생성 시 다음 문자열들이 자동 치환됩니다:

| Magic String | 치환 값 | 대소문자 구분 |
|--------------|--------|--------------|
| `{{char}}` 또는 `<BOT>` | 캐릭터 이름 | ❌ 무시 |
| `{{user}}` 또는 `<USER>` | 사용자 표시 이름 | ❌ 무시 |

**예시**:
```
personality: "{{char}}는 친절한 AI 비서입니다."
→ "Alice는 친절한 AI 비서입니다."
```

### 2.3 예제 대화 포맷

```
<START>
{{user}}: 안녕?
{{char}}: 안녕하세요! 무엇을 도와드릴까요?
<START>
{{user}}: 날씨 어때?
{{char}}: 오늘은 화창한 날씨네요!
```

- `<START>`: 새 대화 시작 마커
- 실제 대화가 context를 채우면 자동으로 pruning됨

---

## 3. PNG V3 Specification (CharacterCard V3)

### 3.1 V2와의 차이점

PNG V3는 V2의 **슈퍼셋**입니다. V2의 모든 필드를 포함하면서 다음을 추가:

| 신규/변경 필드 | 설명 |
|---------------|------|
| `spec` | 반드시 `"chara_card_v3"` |
| `spec_version` | 반드시 `"3.0"` |
| `data` | 실제 캐릭터 데이터 (V2 필드들 포함) |
| `data.nickname` | `{{char}}` 대신 사용할 별명 |
| `data.creator_notes_multilang` | 다국어 제작자 노트 |
| `data.source` | 출처 정보 (배열) |
| `data.group_only_greetings` | 그룹 채팅 전용 인사말 |
| `data.assets` | 임베디드 에셋 (아이콘, 감정 이미지 등) |

### 3.2 V3 구조 예시

```typescript
type CharacterCardV3 = {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: {
    // V2의 모든 필드 포함
    name: string
    description: string
    // ...
    
    // V3 신규 필드
    nickname?: string
    creator_notes_multilang?: {
      [language: string]: string
    }
    source?: string[]
    group_only_greetings?: string[]
    
    // 에셋 시스템
    assets?: Array<{
      type: 'icon' | 'emotion' | 'background'
      uri: string
      name: string
      ext: string
    }>
    
    // V2 호환
    extensions?: {
      [key: string]: any
    }
  }
}
```

### 3.3 PNG 임베딩 방식

**V3 메타데이터**:
- Chunk 이름: `ccv3`
- 내용: `base64(JSON.stringify(CharacterCardV3))`

**V2 백필 (권장)**:
- Chunk 이름: `chara`
- 내용: `base64(JSON.stringify(TavernCardV2))`
- 목적: 레거시 플랫폼 호환성

---

## 4. CHARX 포맷 (RisuAI 전용)

### 4.1 구조

CHARX는 **ZIP 아카이브**입니다:

```
character.charx (ZIP archive)
├── card.json              # CharacterCardV3 JSON
├── assets/
│   ├── <uuid1>.png       # 감정 이미지
│   ├── <uuid2>.mp3       # 오디오 파일
│   └── <uuid3>.ttf       # 폰트
└── module.risum           # 옵션: 임베디드 모듈
```

### 4.2 우리 플랫폼에서 무시해야 하는 이유

| 이유 | 설명 |
|------|------|
| **RisuAI 종속성** | RisuAI 전용 포맷으로 다른 플랫폼 미지원 |
| **복잡도** | ZIP 파싱, 에셋 관리 등 구현 부담 |
| **대역폭** | 에셋 포함 시 파일 크기 급증 |
| **보안** | ZIP 내부에 악성 파일 포함 가능성 |
| **커뮤니티 비판** | 일부 개발자들이 "불필요하게 복잡"하다고 비판 |

**결론**: PNG V3로 충분하며, CHARX는 Phase 2에서 무시 권장 ✅

---

## 5. 저작권 및 라이선스

### 5.1 Specification 자체

| 항목 | 상태 | 근거 |
|------|------|------|
| **Character Card V2 Spec** | ✅ 자유 사용 | 오픈 제안, 커뮤니티 표준 |
| **Character Card V3 Spec** | ✅ 자유 사용 | 오픈 제안, GitHub에 공개 |
| **PNG 포맷** | ✅ 자유 사용 | 공개 표준 (ISO/IEC 15948) |

**법적 근거**:
- 기술 표준(Technical Specification)은 저작권 보호 대상이 아님
- "방법론"이나 "아이디어"는 특허로 보호되지만, 이 경우 특허 출원 없음
- 수백 개 프로젝트가 이미 사용 중 (MIT License 오픈소스 포함)

**비유**:
- JSON 포맷 사용에 라이선스 불필요
- HTTP 프로토콜 사용에 허가 불필요
- **Character Card Spec도 동일** ✅

### 5.2 캐릭터 콘텐츠

| 대상 | 저작권 보호 | 책임 소재 |
|------|-----------|----------|
| **Spec 구조** | ❌ 보호 없음 | N/A |
| **캐릭터 설명/대화** | ✅ 창작물 | 제작자 |
| **캐릭터 이미지** | ✅ 창작물 | 원작자 |
| **시스템 프롬프트** | ⚠️ 경우에 따라 | 제작자 |

**플랫폼 책임**:
- ❌ **직접 호스팅** 시: 저작권 침해 콘텐츠에 대한 책임 발생
- ✅ **사용자 업로드** 시: Safe Harbor (DMCA 512(c)) 적용 가능
- ✅ **외부 링크** 시: 책임 최소화

### 5.3 오픈소스 예시

Character Card 관련 MIT License 프로젝트들:

```
- airole (MIT License) - Character card generator
- CCEditor (MIT License) - Online character card editor  
- SillyTavern Chub Search (MIT License) - Chub integration
```

---

## 6. 캐릭터 공유 방식 비교

### 6.1 방식 A: 직접 Import (❌ 비추천)

**구현 예시**:
```typescript
// 위험한 방식
async function importFromChub(characterId: string) {
  const res = await fetch(`https://api.chub.ai/characters/${characterId}`)
  const character = await res.json()
  
  // 당신의 DB에 저장 ← 법적 리스크!
  await db.characters.create(character)
}
```

**리스크**:

| 리스크 | 설명 | 심각도 |
|--------|------|--------|
| **NSFW 콘텐츠** | Chub는 무검열 플랫폼 | 🔴 높음 |
| **저작권 침해** | 불법 콘텐츠가 당신 DB에 캐싱 | 🔴 높음 |
| **법적 책임** | "직접 호스팅" = 책임 발생 | 🔴 높음 |
| **대역폭 비용** | 이미지/에셋 저장 | 🟡 중간 |
| **업데이트 부담** | 원본 수정 시 동기화 필요 | 🟡 중간 |

### 6.2 방식 B: 외부 링크 + 사용자 업로드 (✅ 추천)

**구현 예시**:
```typescript
// 안전한 방식
function CharacterImportGuide() {
  return (
    <div>
      <h2>수천 개의 캐릭터 가져오기</h2>
      
      {/* 1. 외부 사이트 링크만 제공 */}
      <div className="external-sources">
        <a href="https://www.characterhub.org" target="_blank">
          CharacterHub 방문 →
        </a>
        <a href="https://aicharactercards.com" target="_blank">
          AI Character Cards 방문 →
        </a>
      </div>
      
      {/* 2. 가져오는 방법 안내 */}
      <ol>
        <li>외부 사이트에서 원하는 캐릭터의 PNG 이미지를 다운로드하세요</li>
        <li>아래 "파일 선택" 버튼을 클릭하세요</li>
        <li>다운로드한 PNG 파일을 선택하세요</li>
      </ol>
      
      {/* 3. 사용자가 직접 파일 업로드 */}
      <input 
        type="file" 
        accept="image/png"
        onChange={handleUserUpload}
      />
    </div>
  )
}

// 사용자가 선택한 파일 파싱
async function handleUserUpload(file: File) {
  const characterData = await parseCharacterPNG(file)
  
  // 사용자 소유로 저장
  await db.characters.create({
    user_id: currentUser.id,
    ...characterData,
    source: 'user_upload'
  })
}
```

**장점**:

| 장점 | 설명 |
|------|------|
| ✅ **법적 안전** | 사용자가 직접 다운로드 = Safe Harbor 적용 |
| ✅ **NSFW 필터링** | 사용자가 선택권 가짐 |
| ✅ **저작권 안전** | 원본 사이트에서 직접 = 정당한 사용 |
| ✅ **비용 절감** | 에셋 호스팅 불필요 |
| ✅ **책임 회피** | 원본 사이트 문제 시 무관 |

### 6.3 주요 커뮤니티 사이트

| 사이트 | URL | 특징 | NSFW |
|--------|-----|------|------|
| **CharacterHub (Chub)** | characterhub.org | 최대 규모, API 제공 | ✅ 무검열 |
| **AI Character Cards** | aicharactercards.com | SillyTavern 중심 | ⚠️ 필터링 |
| **RisuRealm** | realm.risuai.net | RisuAI 공식 | ⚠️ 필터링 |

---

## 7. 구현 권장사항

### 7.1 Phase 2-A: 기본 Import/Export (우선순위: 높음)

**1단계: PNG V3 Parser**

```typescript
// 라이브러리: pngjs 또는 fast-png
import { PNG } from 'pngjs'
import { Buffer } from 'buffer'

export async function parseCharacterPNG(file: File): Promise<CharacterCardV3> {
  const buffer = await file.arrayBuffer()
  const png = PNG.sync.read(Buffer.from(buffer))
  
  // 1. V3 시도
  const ccv3Chunk = png.text?.ccv3
  if (ccv3Chunk) {
    const json = Buffer.from(ccv3Chunk, 'base64').toString('utf-8')
    return JSON.parse(json)
  }
  
  // 2. V2 폴백
  const charaChunk = png.text?.chara
  if (charaChunk) {
    const json = Buffer.from(charaChunk, 'base64').toString('utf-8')
    return upgradeV2toV3(JSON.parse(json))
  }
  
  throw new Error('Invalid character card')
}
```

**2단계: PNG V3 Exporter (+ V2 백필)**

```typescript
export async function exportCharacterPNG(character: Character): Promise<Blob> {
  // 1. V3 JSON 생성
  const cardV3: CharacterCardV3 = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.greeting,
      mes_example: character.example_messages,
      system_prompt: character.system_prompt,
      
      // 당신의 플랫폼 전용 데이터
      extensions: {
        myplatform: {
          memory_system: 'hierarchical_v1',
          preferred_model: character.preferred_model,
          token_stats: character.token_stats
        }
      }
    }
  }
  
  // 2. V2 백필
  const cardV2 = backfillV2(cardV3)
  
  // 3. PNG 생성
  const png = await createPNG(character.avatar_url)
  png.addTextChunk('ccv3', base64Encode(JSON.stringify(cardV3)))
  png.addTextChunk('chara', base64Encode(JSON.stringify(cardV2)))
  
  return png.toBlob()
}
```

**3단계: V2 → V3 변환**

```typescript
function upgradeV2toV3(cardV2: TavernCardV2): CharacterCardV3 {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      ...cardV2,
      // V3 기본값
      nickname: cardV2.name,
      creator_notes_multilang: cardV2.creator_notes ? {
        en: cardV2.creator_notes
      } : undefined
    }
  }
}
```

### 7.2 Phase 2-B: 외부 링크 가이드 (우선순위: 높음)

**UI 컴포넌트**:

```typescript
// src/app/dashboard/characters/import/page.tsx
export default function CharacterImportPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        캐릭터 가져오기
      </h1>
      
      {/* 외부 사이트 링크 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          1. 캐릭터 찾기
        </h2>
        <p className="text-gray-600 mb-4">
          수천 개의 커뮤니티 캐릭터를 무료로 사용할 수 있어요:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ExternalLink 
            name="CharacterHub"
            url="https://www.characterhub.org"
            description="최대 규모의 캐릭터 저장소"
            icon="🌐"
          />
          <ExternalLink 
            name="AI Character Cards"
            url="https://aicharactercards.com"
            description="SillyTavern 호환 캐릭터"
            icon="🎴"
          />
          <ExternalLink 
            name="RisuRealm"
            url="https://realm.risuai.net"
            description="RisuAI 공식 저장소"
            icon="🏰"
          />
        </div>
      </section>
      
      {/* 가져오는 방법 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          2. 가져오는 방법
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>위 사이트 중 하나를 방문하세요</li>
          <li>원하는 캐릭터를 찾아 PNG 이미지를 다운로드하세요</li>
          <li>아래 "파일 선택" 버튼을 클릭하세요</li>
          <li>다운로드한 PNG 파일을 선택하세요</li>
        </ol>
      </section>
      
      {/* 파일 업로드 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">
          3. 파일 업로드
        </h2>
        <CharacterFileUpload />
      </section>
      
      {/* 지원 포맷 안내 */}
      <section className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">지원 포맷</h3>
        <ul className="text-sm text-gray-700">
          <li>✅ PNG V3 (CharacterCard V3)</li>
          <li>✅ PNG V2 (TavernCard V2)</li>
          <li>✅ JSON V2/V3</li>
          <li>❌ CHARX (ZIP) - 현재 미지원</li>
        </ul>
      </section>
    </div>
  )
}
```

### 7.3 Phase 2-C: 자체 공유 마켓 (우선순위: 중간)

**추후 구현 시 고려사항**:

1. **필터링 시스템**
   - NSFW/SFW 태그 필수
   - 사용자 신고 기능
   - 모더레이션 도구

2. **라이선스 명시**
   ```typescript
   type SharedCharacter = {
     id: string
     name: string
     creator_id: string
     license: 'CC0' | 'CC-BY' | 'CC-BY-NC' | 'All Rights Reserved'
     tags: string[]
     nsfw: boolean
     // ...
   }
   ```

3. **DMCA 대응**
   - Take-down 요청 프로세스
   - 침해 신고 이메일
   - 48시간 내 대응

### 7.4 데이터베이스 스키마 확장

```sql
-- 기존 characters 테이블에 추가
ALTER TABLE characters ADD COLUMN IF NOT EXISTS
  -- V3 필드
  nickname TEXT,
  creator_notes_multilang JSONB,
  source TEXT[],
  group_only_greetings TEXT[],
  
  -- Export 지원
  export_formats TEXT[] DEFAULT ARRAY['png-v3', 'png-v2', 'json-v3'],
  
  -- Import 메타데이터
  imported_from TEXT,  -- 'characterhub', 'user_upload', 'platform_market'
  original_url TEXT,
  imported_at TIMESTAMP DEFAULT NOW();

-- V2/V3 호환 뷰
CREATE VIEW characters_v3 AS
SELECT 
  id,
  user_id,
  name,
  COALESCE(nickname, name) as nickname,
  description,
  personality,
  scenario,
  greeting as first_mes,
  example_messages as mes_example,
  system_prompt,
  -- ... 기타 필드
FROM characters;
```

---

## 8. 법적 리스크 최소화 체크리스트

### 8.1 구현 전 체크

- [ ] PNG V3/V2 파서 구현 (직접 호스팅 없음)
- [ ] 사용자 파일 업로드 방식만 지원
- [ ] 외부 링크 가이드 페이지 제공
- [ ] Terms of Service에 사용자 책임 명시
- [ ] DMCA 신고 이메일 설정

### 8.2 ToS 필수 조항

```markdown
## 캐릭터 콘텐츠 정책

1. **사용자 책임**: 업로드하는 모든 캐릭터 카드에 대한 저작권 책임은 사용자에게 있습니다.

2. **금지 콘텐츠**:
   - 저작권 침해 콘텐츠
   - 미성년자 성적 콘텐츠
   - 혐오 표현

3. **DMCA 준수**: 저작권 침해 신고 시 48시간 내 조치합니다.
   신고 이메일: dmca@yourplatform.com

4. **면책**: 당사는 사용자가 업로드한 콘텐츠에 대해 책임지지 않습니다.
```

### 8.3 Safe Harbor 요건 (DMCA 512(c))

- [ ] 사용자가 콘텐츠 업로드 (플랫폼은 도구만 제공)
- [ ] 침해 인지 시 즉시 삭제
- [ ] DMCA Agent 등록 (미국 Copyright Office)
- [ ] Repeat Infringer 정책 수립

---

## 9. 실전 예시 코드

### 9.1 완전한 Import 흐름

```typescript
// components/CharacterFileUpload.tsx
'use client'

import { useState } from 'react'
import { parseCharacterPNG } from '@/lib/character-parser'
import { createCharacter } from '@/app/dashboard/characters/actions'

export function CharacterFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 파일 타입 검증
    if (!file.type.match(/^image\/(png|jpeg)$/)) {
      setError('PNG 또는 JPEG 파일만 지원됩니다.')
      return
    }
    
    setUploading(true)
    setError(null)
    
    try {
      // 1. PNG 파싱
      const characterData = await parseCharacterPNG(file)
      
      // 2. 서버 액션 호출
      const character = await createCharacter({
        ...characterData.data,
        source: 'user_upload',
        avatar: file  // 별도 업로드
      })
      
      // 3. 성공 시 리다이렉트
      window.location.href = `/dashboard/characters/${character.id}`
      
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        id="character-upload"
      />
      <label
        htmlFor="character-upload"
        className="btn btn-primary"
      >
        {uploading ? '업로드 중...' : '파일 선택'}
      </label>
      
      {error && (
        <p className="text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
```

### 9.2 Export 다운로드

```typescript
// app/dashboard/characters/[id]/actions.ts
'use server'

import { exportCharacterPNG } from '@/lib/character-exporter'

export async function downloadCharacter(characterId: string) {
  const character = await db.characters.findById(characterId)
  
  // PNG V3 + V2 백필
  const pngBlob = await exportCharacterPNG(character)
  
  // 파일명 생성
  const filename = `${character.name.replace(/[^a-z0-9]/gi, '_')}.png`
  
  return {
    blob: pngBlob,
    filename
  }
}
```

---

## 10. 커뮤니티 생태계 활용

### 10.1 호환 가능한 플랫폼

당신의 플랫폼이 PNG V3를 지원하면, 다음 플랫폼과 자동 호환됩니다:

| 플랫폼 | 유형 | 캐릭터 수 |
|--------|------|----------|
| **SillyTavern** | 오픈소스 클라이언트 | N/A (로컬) |
| **CharacterHub (Chub)** | 저장소 + 채팅 | ~100,000+ |
| **Agnai** | 웹 클라이언트 | ~10,000+ |
| **AI Character Cards** | 저장소 | ~5,000+ |
| **RisuRealm** | 저장소 + 클라이언트 | ~1,000+ |

### 10.2 마케팅 포인트

```markdown
## 당신의 플랫폼 차별점

✅ **10만+ 캐릭터와 호환**
   - CharacterHub, AI Character Cards 등에서 즉시 가져오기 가능

✅ **오픈 표준 준수**
   - PNG V3 (CharacterCard V3) 완벽 지원
   - V2 백필로 레거시 호환성 보장

✅ **크로스 플랫폼**
   - SillyTavern, Agnai, RisuAI와 자유롭게 캐릭터 이동

✅ **당신만의 확장**
   - 계층적 장기기억 시스템
   - 토큰 사용량 통계
   - 모델별 최적화 설정
```

---

## 11. Phase 2 로드맵

### 11.1 단계별 우선순위

| Phase | 기능 | 우선순위 | 예상 시간 |
|-------|------|----------|----------|
| **2-A** | PNG V3/V2 Parser 구현 | 🔴 높음 | 1주 |
| **2-A** | PNG V3 Exporter 구현 | 🔴 높음 | 1주 |
| **2-A** | 외부 링크 가이드 페이지 | 🔴 높음 | 3일 |
| **2-B** | JSON Import/Export | 🟡 중간 | 2일 |
| **2-B** | 파일 업로드 UI/UX 개선 | 🟡 중간 | 1주 |
| **2-C** | 자체 캐릭터 마켓 | 🟢 낮음 | 4주+ |
| **2-C** | 모더레이션 도구 | 🟢 낮음 | 2주 |

### 11.2 최소 기능 (MVP)

Phase 2-A만 구현해도 충분합니다:

```
✅ 사용자가 CharacterHub에서 PNG 다운로드
✅ 플랫폼에 PNG 업로드
✅ 자동 파싱 후 DB 저장
✅ 캐릭터 편집 가능
✅ PNG V3 + V2로 다시 Export
```

**예상 사용자 흐름**:
1. 가이드 페이지 → CharacterHub 링크 클릭
2. 원하는 캐릭터 PNG 다운로드
3. "캐릭터 가져오기" → 파일 업로드
4. 즉시 채팅 시작!

---

## 12. 결론 및 권장사항

### 12.1 핵심 결론

| 질문 | 답변 |
|------|------|
| RisuAI 엮임 위험? | ✅ 없음 (오픈 표준 사용, CHARX 무시) |
| 라이선스 문제? | ✅ 없음 (Spec은 자유 사용) |
| 직접 Import 안전? | ❌ 위험 (법적 책임) |
| 외부 링크 방식? | ✅ 추천 (Safe Harbor) |

### 12.2 최종 권장사항

**Phase 2 구현 전략**:

1. **PNG V3 + V2 백필** 구현 ⭐
   - 최신 표준 지원
   - 레거시 호환성 보장
   - CHARX는 무시

2. **외부 링크 + 사용자 업로드** 방식 ⭐
   - 법적 리스크 최소화
   - Safe Harbor 적용
   - 비용 절감

3. **커뮤니티 생태계 활용**
   - 10만+ 캐릭터와 즉시 호환
   - 크로스 플랫폼 지원
   - 마케팅 포인트

4. **자체 확장 추가**
   - `extensions.myplatform` 필드 활용
   - 계층적 장기기억 메타데이터
   - 토큰 통계 임베드

### 12.3 리스크 관리

**법적 리스크 최소화**:
- ✅ 사용자 파일 업로드만 지원
- ✅ Terms of Service에 책임 명시
- ✅ DMCA 대응 프로세스 수립
- ✅ 신고 기능 및 모더레이션

**기술적 리스크 최소화**:
- ✅ PNG 파싱 라이브러리 사용 (pngjs, fast-png)
- ✅ 파일 크기 제한 (5MB)
- ✅ 악성 코드 검사 (optional)

---

## 부록

### A. 참고 자료

**공식 스펙**:
- [Character Card V2 Spec](https://github.com/malfoyslastname/character-card-spec-v2)
- [Character Card V3 Spec](https://github.com/kwaroran/character-card-spec-v3)

**오픈소스 프로젝트**:
- [SillyTavern](https://github.com/SillyTavern/SillyTavern)
- [CCEditor](https://github.com/lenML/CCEditor)
- [Airole](https://github.com/easychen/airole)

**커뮤니티**:
- [CharacterHub (Chub)](https://www.characterhub.org)
- [AI Character Cards](https://aicharactercards.com)
- [SillyTavern Discord](https://discord.gg/sillytavern)

### B. NPM 패키지 추천

```json
{
  "dependencies": {
    "pngjs": "^7.0.0",           // PNG 파싱/생성
    "buffer": "^6.0.3",          // Base64 인코딩
    "zod": "^3.22.0"             // 스키마 검증
  }
}
```

### C. TypeScript 타입 정의

```typescript
// types/character-card.ts
export type CharacterCardV2 = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  alternate_greetings?: string[]
  character_book?: CharacterBook
  tags?: string[]
  creator?: string
  character_version?: string
  extensions?: Record<string, any>
}

export type CharacterCardV3 = {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: CharacterCardV2 & {
    nickname?: string
    creator_notes_multilang?: Record<string, string>
    source?: string[]
    group_only_greetings?: string[]
    assets?: Asset[]
  }
}

export type CharacterBook = {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  entries: CharacterBookEntry[]
}

export type CharacterBookEntry = {
  keys: string[]
  content: string
  extensions?: {
    position?: 'before_char' | 'after_char'
    depth?: number
    probability?: number
    enabled?: boolean
  }
}

export type Asset = {
  type: 'icon' | 'emotion' | 'background'
  uri: string
  name: string
  ext: string
}
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-10-30  
**작성자**: Claude (Anthropic)
