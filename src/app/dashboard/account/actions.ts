'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function deleteAccount() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('[Account] Failed to load current user for deletion', {
      error: userError?.message,
    })
    return { error: '현재 사용자 정보를 확인할 수 없습니다.' }
  }

  const { data: apiKeys, error: apiKeysError } = await supabase
    .from('api_keys')
    .select('vault_secret_name')
    .eq('user_id', user.id)

  if (apiKeysError) {
    console.error('[Account] Failed to load API keys before deletion', {
      userId: user.id,
      error: apiKeysError.message,
    })
    return {
      error:
        '계정 삭제 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (apiKeys?.length) {
    for (const { vault_secret_name: secretName } of apiKeys) {
      const { error: vaultError } = await supabase.rpc('delete_secret', {
        secret_name: secretName,
      })

      if (vaultError) {
        const message = vaultError.message?.toLowerCase() ?? ''

        if (message.includes('secret not found')) {
          console.warn('[Account] delete_secret reported missing secret', {
            userId: user.id,
            secretName,
          })
          continue
        }

        console.error('[Account] delete_secret failed during account removal', {
          userId: user.id,
          secretName,
          error: vaultError.message,
        })

        return {
          error:
            'Vault 시크릿 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        }
      }
    }
  }

  const admin = createAdminClient()

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('[Account] deleteUser failed', {
      userId: user.id,
      error: deleteError.message,
    })
    return { error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }

  const { error: signOutError } = await supabase.auth.signOut()

  if (signOutError) {
    console.error('[Account] signOut after deletion failed', {
      userId: user.id,
      error: signOutError.message,
    })
  }

  return { success: true }
}
