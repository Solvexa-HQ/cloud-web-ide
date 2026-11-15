import { createClient } from '@supabase/supabase-js'

// 환경 변수(.env)에서 Supabase 프로젝트 URL 및 공개(Anon) 키 로드
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 인증(GitHub OAuth) 및 코드 스니펫 DB 연동을 위한 Supabase 클라이언트 생성
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
