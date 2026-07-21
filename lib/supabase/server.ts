import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

// Helper to get deletion request status for demands
export async function getDeletionRequests(demandIds: string[]) {
  if (demandIds.length === 0) return {}
  
  const serviceClient = createServiceClient()
  
  const { data: deletionComments } = await serviceClient
    .from('comments')
    .select('demand_id')
    .in('demand_id', demandIds)
    .ilike('body', '%SOLICITACAO DE EXCLUSAO%')
  
  const deletionRequests: Record<string, boolean> = {}
  deletionComments?.forEach(c => {
    deletionRequests[c.demand_id] = true
  })
  
  return deletionRequests
}