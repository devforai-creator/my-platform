-- ============================================
-- Allow Starter Characters (user_id = NULL)
-- Phase 0: Enable global shared starter characters
-- ============================================

-- 1. user_id를 NULL 허용으로 변경
ALTER TABLE characters
ALTER COLUMN user_id DROP NOT NULL;

-- 2. 기존 RLS 정책 삭제 및 재생성

-- SELECT 정책: 본인 캐릭터 + 스타터 + 공개 캐릭터
DROP POLICY IF EXISTS "Users can view their own and public characters" ON characters;

CREATE POLICY "View own or starter characters"
ON characters FOR SELECT
USING (
  (
    user_id IS NULL
    AND visibility = 'public'
    AND archived_at IS NULL
  )  -- 스타터 캐릭터 (전역 공유)
  OR user_id = auth.uid()  -- 내 캐릭터
  OR (visibility = 'public' AND archived_at IS NULL)  -- 공개 캐릭터
);

-- INSERT 정책: 일반 유저는 본인 소유만, Service role은 스타터 생성 가능
DROP POLICY IF EXISTS "Users can insert their own characters" ON characters;

CREATE POLICY "Users can create own characters"
ON characters FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL        -- 인증된 유저만
  AND user_id = auth.uid()       -- 본인 ID와 일치
  AND user_id IS NOT NULL        -- user_id NULL 명시적 차단
  -- Service role은 RLS를 우회하므로 user_id=NULL 스타터 생성 가능
);

-- UPDATE 정책: 본인만 수정 (스타터는 수정 불가)
DROP POLICY IF EXISTS "Users can update their own characters" ON characters;

CREATE POLICY "Users can update own characters"
ON characters FOR UPDATE
USING (
  user_id = auth.uid()
  AND user_id IS NOT NULL
)
WITH CHECK (
  user_id = auth.uid()
  AND user_id IS NOT NULL
);

-- DELETE 정책: 본인만 삭제 (스타터는 삭제 불가)
DROP POLICY IF EXISTS "Users can delete their own characters" ON characters;

CREATE POLICY "Users can delete own characters"
ON characters FOR DELETE
USING (
  user_id = auth.uid()
  AND user_id IS NOT NULL
);

-- ============================================
-- 완료!
-- 보안 정책 요약:
-- - Service role: user_id=NULL 스타터 캐릭터 생성 가능 (RLS 우회)
-- - 일반 유저: user_id=NULL 생성 절대 불가 (명시적 차단)
-- - 일반 유저: 본인 소유(user_id = auth.uid()) 캐릭터만 생성/수정/삭제
-- - 스타터 캐릭터(user_id=NULL): 모든 유저가 읽기만 가능, 수정/삭제 불가
-- ============================================
