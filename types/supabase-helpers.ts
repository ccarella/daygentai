// Helper types for Supabase joined queries
export interface WorkspaceMemberWithWorkspace {
  workspace: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
  }
  role: string
  created_at: string
}

export interface WorkspaceMemberWithSlug {
  workspace: {
    slug: string
  } | Array<{
    slug: string
  }>
}

export interface WorkspaceMemberWithDetails {
  workspace: {
    name: string
    slug: string
    avatar_url: string | null
  } | Array<{
    name: string
    slug: string
    avatar_url: string | null
  }>
}

// Raw query response types (what Supabase actually returns)
export interface WorkspaceMemberQueryResponse {
  workspace: Array<{
    id: string
    name: string
    slug: string
    avatar_url: string | null
  }>
  role: string
  created_at: string
}

export interface WorkspaceMemberSlugQueryResponse {
  workspace: Array<{
    slug: string
  }>
}

export interface WorkspaceMemberDetailsQueryResponse {
  workspace: Array<{
    name: string
    slug: string
    avatar_url: string | null
  }>
}