import { supabase } from './supabase'
import { must } from './useAsync'
import type { Category, LiveResult, SearchFilters, StoreResult } from './types'

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))

export function filtersToParams(f: Partial<SearchFilters>, userState?: string | null) {
  return {
    p_query: f.q?.trim() || null,
    p_free_shipping: !!f.freeShipping,
    p_fast: !!f.fast,
    p_state: f.state || null,
    p_city: f.city?.trim() || null,
    p_min_price: f.minPrice ? num(f.minPrice) : null,
    p_max_price: f.maxPrice ? num(f.maxPrice) : null,
    p_min_rating: f.minRating ? Number(f.minRating) : null,
    p_category: f.category || null,
    ...(userState !== undefined ? { p_user_state: userState } : {}),
  }
}

export async function searchLives(f: Partial<SearchFilters>, userState?: string | null, limit = 48) {
  return must(await supabase.rpc('search_lives', {
    ...filtersToParams(f, userState ?? null),
    p_only_live: !!f.onlyLive,
    p_sort: f.sort ?? 'viewers',
    p_limit: limit,
  })) as LiveResult[]
}

export async function searchStores(f: Partial<SearchFilters>) {
  return must(await supabase.rpc('search_stores', filtersToParams(f))) as StoreResult[]
}

export async function trendingTags(limit = 14) {
  return must(await supabase.rpc('trending_hashtags', { p_limit: limit })) as { tag: string; uses: number; live_now: number }[]
}

let categoriesCache: Category[] | null = null
export async function getCategories() {
  if (categoriesCache) return categoriesCache
  const data = must(await supabase.from('categories').select('*').eq('is_adult', false).order('sort_order')) as Category[]
  categoriesCache = data
  return data
}

export const PRODUCT_SELECT = '*, product_images(*), product_variants(*), product_hashtags(hashtags(tag))'
