import { env } from "cloudflare:workers";

type AuthUser = { id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } };

const headers = () => ({ apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" });
async function currentUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const result = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { ...headers(), authorization } });
  return result.ok ? result.json() as Promise<AuthUser> : null;
}
function displayName(user: AuthUser) {
  const fallback = (user.email || "玩家").split("@")[0].slice(0, 30);
  return (user.user_metadata?.display_name || user.user_metadata?.full_name || fallback).slice(0, 40);
}
async function leaderboard(currentUserId: string) {
  const rows = await env.DB.prepare("SELECT user_id, display_name, best_score, games_played FROM user_game_scores ORDER BY best_score DESC, updated_at ASC LIMIT 100")
    .all<{ user_id: string; display_name: string; best_score: number; games_played: number }>();
  return rows.results.map((item: { user_id: string; display_name: string; best_score: number; games_played: number }, index: number) => ({
    rank: index + 1,
    displayName: item.display_name,
    bestScore: item.best_score,
    gamesPlayed: item.games_played,
    isCurrent: item.user_id === currentUserId,
  }));
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  await env.DB.prepare("INSERT INTO user_game_scores (user_id, display_name, best_score, games_played, updated_at) VALUES (?, ?, 0, 0, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name")
    .bind(user.id, displayName(user), new Date().toISOString()).run();
  const current = await env.DB.prepare("SELECT best_score, games_played FROM user_game_scores WHERE user_id = ?").bind(user.id)
    .first<{ best_score: number; games_played: number }>();
  return Response.json({ bestScore: current?.best_score ?? 0, gamesPlayed: current?.games_played ?? 0, leaderboard: await leaderboard(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "请先登录后保存成绩" }, { status: 401 });
  const body = await request.json() as { score?: number };
  const score = Math.floor(Number(body.score) || 0);
  if (score < 0 || score > 100000 || score % 10 !== 0) return Response.json({ error: "成绩格式无效" }, { status: 400 });
  await env.DB.prepare("INSERT INTO user_game_scores (user_id, display_name, best_score, games_played, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, best_score=MAX(user_game_scores.best_score, excluded.best_score), games_played=user_game_scores.games_played+1, updated_at=excluded.updated_at")
    .bind(user.id, displayName(user), score, new Date().toISOString()).run();
  const current = await env.DB.prepare("SELECT best_score, games_played FROM user_game_scores WHERE user_id = ?").bind(user.id)
    .first<{ best_score: number; games_played: number }>();
  return Response.json({ bestScore: current?.best_score ?? score, gamesPlayed: current?.games_played ?? 1, leaderboard: await leaderboard(user.id) });
}
