import { supabase } from '../supabaseClient'

export async function getMeditators() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, lat, lng')
    .eq('share_location', true)

  if (error) {
    console.error('Load meditators error:', error)
    return []
  }

  return data || []
}
