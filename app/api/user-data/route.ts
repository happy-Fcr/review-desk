import { env } from "cloudflare:workers";

const baseHeaders = { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" };
async function currentUser(token: string) { const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { ...baseHeaders, authorization: token } }); return response.ok ? response.json() as Promise<{ id: string }> : null; }
export async function GET(request: Request) {
  const token = request.headers.get("authorization"); if (!token) return Response.json({ error: "未登录" }, { status: 401 });
  const user = await currentUser(token); if (!user) return Response.json({ error: "登录已失效" }, { status: 401 });
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/user_data?select=payload&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: { ...baseHeaders, authorization: token } });
  const rows = await response.json() as Array<{ payload: unknown }>; return Response.json({ payload: rows[0]?.payload ?? {} }, { status: response.status });
}
export async function PUT(request: Request) {
  const token = request.headers.get("authorization"); if (!token) return Response.json({ error: "未登录" }, { status: 401 }); const user = await currentUser(token); if (!user) return Response.json({ error: "登录已失效" }, { status: 401 }); const { payload } = await request.json();
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/user_data`, { method: "POST", headers: { ...baseHeaders, authorization: token, prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: user.id, payload, updated_at: new Date().toISOString() }) }); return Response.json({ ok: response.ok }, { status: response.status });
}
