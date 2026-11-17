import { env } from "cloudflare:workers";

const headers = { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" };
export async function POST(request: Request) {
  const { action, email, password } = await request.json() as { action?: "signup" | "signin"; email?: string; password?: string };
  if (!email || !password || password.length < 6) return Response.json({ error: "请输入邮箱和至少 6 位密码" }, { status: 400 });
  const path = action === "signup" ? "signup" : "token?grant_type=password";
  const upstream = await fetch(`${env.SUPABASE_URL}/auth/v1/${path}`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
  return new Response(await upstream.text(), { status: upstream.status, headers: { "content-type": "application/json" } });
}
