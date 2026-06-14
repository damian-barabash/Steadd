import { createClient } from "@supabase/supabase-js";

// Public project config — safe to ship in the client bundle.
export const SUPABASE_URL = "https://iwmrjewqxmtczuktbkpr.supabase.co";
export const SUPABASE_ANON = "sb_publishable_XHBOZXgYYhOJQZQLax2gvg_7cVcyOM-";
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Call an edge function with the current user's JWT.
export async function callFn(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${session?.access_token || SUPABASE_ANON}`,
    },
    body: JSON.stringify(body || {}),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  return json;
}
