import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://shrsxgzrdbxlptwzuevb.supabase.co'
const supabaseKey = 'sb_publishable_JOIKDWL542ukiu-4mIBUtA_EYYVUVyd'

export const supabase = createClient(supabaseUrl, supabaseKey)