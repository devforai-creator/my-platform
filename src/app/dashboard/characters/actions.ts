'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCharacter(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const { error } = await supabase.from('characters').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    system_prompt: formData.get('system_prompt') as string,
    greeting_message: formData.get('greeting_message') as string,
    visibility: 'private',
  })

  if (error) {
    return { error: '캐릭터 생성 실패: ' + error.message }
  }

  revalidatePath('/dashboard/characters')
  redirect('/dashboard/characters')
}

export async function updateCharacter(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const { error } = await supabase
    .from('characters')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      system_prompt: formData.get('system_prompt') as string,
      greeting_message: formData.get('greeting_message') as string,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '캐릭터 수정 실패: ' + error.message }
  }

  revalidatePath('/dashboard/characters')
  redirect('/dashboard/characters')
}

export async function deleteCharacter(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '캐릭터 삭제 실패: ' + error.message }
  }

  revalidatePath('/dashboard/characters')
  return { success: true }
}
