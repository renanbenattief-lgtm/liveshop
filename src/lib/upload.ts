import { supabase } from './supabase'

/** Envia uma imagem para o bucket "media" na pasta do usuário e devolve a URL pública. */
export async function uploadImage(file: File, userId: string, folder: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
