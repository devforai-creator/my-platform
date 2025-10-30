/**
 * Seed Script: Insert Starter Character (Seoyeon)
 * 
 * Usage:
 * 1. Install dependencies: npm install -D tsx dotenv
 * 2. Place this file in your project root or scripts/ folder
 * 3. Place character JSON in the same directory
 * 4. Place avatar image as 'seoyeon_avatar.png' (or update filename below)
 * 5. Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 6. Run: npx tsx seed-starter-character.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Configuration
const AVATAR_FILENAME = 'seoyeon_avatar.png' // 이미지 파일명 (필요 시 수정)
const CHARACTER_JSON = 'seoyeon_character.json'
const STORAGE_BUCKET = 'avatars' // Supabase Storage 버킷명 (필요 시 수정)

async function main() {
  // 1. Supabase 클라이언트 생성 (Service Role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('✅ Supabase client initialized')

  // 2. JSON 파일 읽기
  let characterData
  try {
    const jsonPath = resolve(process.cwd(), CHARACTER_JSON)
    const jsonContent = readFileSync(jsonPath, 'utf-8')
    characterData = JSON.parse(jsonContent)
    console.log(`✅ Loaded character data: ${characterData.name}`)
  } catch (error) {
    console.error(`❌ Error reading ${CHARACTER_JSON}:`, error)
    process.exit(1)
  }

  // 3. 이미지 파일 읽기
  let avatarBuffer
  try {
    const imagePath = resolve(process.cwd(), AVATAR_FILENAME)
    avatarBuffer = readFileSync(imagePath)
    console.log(`✅ Loaded avatar image: ${AVATAR_FILENAME}`)
  } catch (error) {
    console.error(`❌ Error reading ${AVATAR_FILENAME}:`, error)
    console.error('   Make sure the image file is in the same directory')
    process.exit(1)
  }

  // 4. Supabase Storage에 이미지 업로드
  const timestamp = Date.now()
  const avatarPath = `starters/seoyeon_${timestamp}.png`
  
  console.log('📤 Uploading avatar to Supabase Storage...')
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(avatarPath, avatarBuffer, {
      contentType: 'image/png',
      upsert: false
    })

  if (uploadError) {
    console.error('❌ Error uploading image:', uploadError)
    process.exit(1)
  }

  console.log(`✅ Avatar uploaded: ${avatarPath}`)

  // 5. Public URL 가져오기
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(avatarPath)

  const avatarUrl = urlData.publicUrl
  console.log(`✅ Public URL: ${avatarUrl}`)

  // 6. Characters 테이블에 삽입
  console.log('💾 Inserting character into database...')
  const { data, error } = await supabase
    .from('characters')
    .insert({
      // user_id: null → 전역 공유 스타터 캐릭터
      user_id: null,
      
      // 기본 정보 (DB 컬럼과 일치)
      name: characterData.name,
      description: characterData.description,
      system_prompt: characterData.system_prompt,
      greeting_message: characterData.greeting,  // greeting → greeting_message 매핑
      
      // 아바타 URL
      avatar_url: avatarUrl,
      
      // Visibility (is_private=false, is_starter=true → public)
      visibility: 'public',
      
      // Character Card V2 추가 필드들을 metadata JSONB에 저장
      metadata: {
        personality: characterData.personality,
        scenario: characterData.scenario,
        example_messages: characterData.example_messages,
        is_starter: true,  // 스타터 플래그
        character_card_v2: true,  // Character Card V2 표준 준수
        version: '1.0'
      },
      
      // 메타데이터
      tags: characterData.tags,
      creator_notes: characterData.creator_notes,
      
      // 타임스탬프 (자동 생성되지만 명시)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) {
    console.error('❌ Error inserting character:', error)
    process.exit(1)
  }

  console.log('✅ Character inserted successfully!')
  console.log('📋 Character ID:', data[0].id)
  console.log('👤 Name:', data[0].name)
  console.log('🖼️  Avatar URL:', data[0].avatar_url)
  console.log('')
  console.log('🎉 Done! Seoyeon is now available as a starter character.')
  console.log('   Users can see it on the dashboard.')
}

// Run
main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
