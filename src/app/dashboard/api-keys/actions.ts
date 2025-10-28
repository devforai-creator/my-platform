'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Provider } from '@/types/database.types'

export async function createApiKey(formData: FormData) {
  const supabase = await createClient()

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const provider = formData.get('provider') as Provider
  const keyName = formData.get('key_name') as string
  const apiKey = formData.get('api_key') as string
  const modelPreference = formData.get('model_preference') as string

  // Vault에 API 키 저장 (암호화)
  const vaultSecretName = `apikey_${user.id}_${provider}_${Date.now()}`

  const { error: vaultError } = await supabase.rpc('create_secret', {
    secret_name: vaultSecretName,
    secret_value: apiKey,
  })

  if (vaultError) {
    console.error('Vault error:', vaultError)
    return { error: 'API 키 암호화 저장 실패: ' + vaultError.message }
  }

  // 메타데이터를 api_keys 테이블에 저장
  const { error } = await supabase.from('api_keys').insert({
    user_id: user.id,
    provider,
    key_name: keyName,
    vault_secret_name: vaultSecretName,
    model_preference: modelPreference || null,
  })

  if (error) {
    // 실패 시 Vault에서도 삭제
    await supabase.rpc('delete_secret', { secret_name: vaultSecretName })
    return { error: 'API 키 등록 실패: ' + error.message }
  }

  revalidatePath('/dashboard/api-keys')
  return { success: true }
}

export async function deleteApiKey(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const { data: apiKeyRecord, error: fetchError } = await supabase
    .from('api_keys')
    .select('vault_secret_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !apiKeyRecord) {
    return { error: 'API 키를 찾을 수 없습니다' }
  }

  // DB에서 삭제 (RLS가 소유권 확인)
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'API 키 삭제 실패: ' + error.message }
  }

  // Vault에서도 삭제
  const { error: vaultError } = await supabase.rpc('delete_secret', {
    secret_name: apiKeyRecord.vault_secret_name,
  })

  if (vaultError) {
    console.error('Vault delete error:', vaultError)
  }

  revalidatePath('/dashboard/api-keys')
  return { success: true }
}

export async function toggleApiKey(id: string, isActive: boolean) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '상태 변경 실패: ' + error.message }
  }

  revalidatePath('/dashboard/api-keys')
  return { success: true }
}
