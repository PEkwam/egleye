// Shared auth gate for AI-powered edge functions.
// Accepts either:
//  - a valid Supabase user JWT in the Authorization header, OR
//  - the ADMIN_PASSWORD in the x-admin-token header (used by internal tools).
// Returns null on success, or a Response (401/403) on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const adminToken = req.headers.get("x-admin-token");
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (adminToken && adminPassword && adminToken === adminPassword) {
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }

  const token = authHeader.slice("Bearer ".length);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: jsonHeaders },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: jsonHeaders },
      );
    }
    return null;
  } catch {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: jsonHeaders },
    );
  }
}
