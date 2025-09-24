// lib/queries.ts
export async function fetchProjectsForList(supabase: SupabaseClient) {
  return supabase
    .from('projects')
    .select('id, title, suburb, business_name, cost, created_at') // <— include cost
    .order('created_at', { ascending: false });
}
