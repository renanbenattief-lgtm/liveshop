export type Role = 'buyer' | 'seller' | 'admin'
export type StoreStatus = 'pending' | 'approved' | 'suspended' | 'rejected'
export type LiveStatus = 'scheduled' | 'live' | 'ended'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: Role
  state: string | null
  city: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  is_adult: boolean
  sort_order: number
}

export interface Store {
  id: string
  owner_id: string | null
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  description: string | null
  document: string | null
  document_type: 'cpf' | 'cnpj' | null
  phone: string | null
  cep: string | null
  city: string
  state: string
  category_id: string | null
  status: StoreStatus
  status_reason: string | null
  rating: number
  rating_count: number
  free_shipping_min: number | null
  shipping_days: number
  fast_delivery: boolean
  regions: string[]
  created_at: string
  cnpj_status: string | null
  cnpj_legal_name: string | null
  cnpj_checked_at: string | null
  is_demo: boolean
}

export interface ProductImage { id: string; product_id: string; url: string; position: number }
export interface ProductVariant { id: string; product_id: string; name: string; value: string; stock: number }

export interface Product {
  id: string
  store_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  promo_price: number | null
  stock: number
  active: boolean
  created_at: string
  product_images?: ProductImage[]
  product_variants?: ProductVariant[]
  product_hashtags?: { hashtags: { tag: string } | null }[]
}

export interface Live {
  id: string
  store_id: string
  title: string
  cover_url: string | null
  status: LiveStatus
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  viewers_count: number
  peak_viewers: number
  featured_product_id: string | null
  created_at: string
}

export interface FeaturedProduct {
  id: string
  name: string
  price: number
  promo_price: number | null
  image: string | null
}

export interface LiveResult {
  live_id: string
  title: string
  cover_url: string | null
  status: LiveStatus
  viewers_count: number
  scheduled_at: string | null
  started_at: string | null
  store_id: string
  store_name: string
  store_slug: string
  store_logo: string | null
  store_city: string
  store_state: string
  store_rating: number
  free_shipping_min: number | null
  fast_delivery: boolean
  min_price: number | null
  product_count: number
  tags: string[]
  featured: FeaturedProduct | null
}

export interface StoreResult {
  store_id: string
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  city: string
  state: string
  rating: number
  free_shipping_min: number | null
  fast_delivery: boolean
  matched_products: number
  min_price: number | null
  sample_image: string | null
  is_live: boolean
  live_id: string | null
  next_live_at: string | null
}

export interface SearchFilters {
  q: string
  freeShipping: boolean
  fast: boolean
  state: string
  city: string
  minPrice: string
  maxPrice: string
  minRating: string
  onlyLive: boolean
  category: string
  sort: 'viewers' | 'nearest' | 'rating' | 'price'
}
