import { env } from "cloudflare:workers";

type AuthUser = { id: string; email?: string; user_metadata?: { display_name?: string; full_name?: string } };
type Profile = { total_seconds: number; streak_days: number; last_study_date: string | null };

const apiHeaders = () => ({ apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" });
const date = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d).replaceAll("/", "-");
};
const response = (body: unknown, init?: ResponseInit) => Response.json(body, init);

async function currentUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const result = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { ...apiHeaders(), authorization } });
  return result.ok ? result.json() as Promise<AuthUser> : null;
}

function displayName(user: AuthUser) {
  const fallback = (user.email || "学习者").split("@")[0].slice(0, 30);
  return (user.user_metadata?.display_name || user.user_metadata?.full_name || fallback).slice(0, 40);
}

const history = async (userId: string) => {
  const rows = await env.DB.prepare("SELECT study_date, subject, SUM(seconds) AS seconds FROM user_focus_sessions WHERE user_id = ? AND study_date >= ? GROUP BY study_date, subject ORDER BY study_date")
    .bind(userId, date(-6)).all<{ study_date: string; subject: string; seconds: number }>();
  return rows.results;
};

async function leaderboard(currentUserId: string) {
  const rows = await env.DB.prepare("SELECT user_id, display_name, total_seconds, streak_days FROM user_focus_profiles ORDER BY total_seconds DESC, updated_at ASC LIMIT 100")
    .all<{ user_id: string; display_name: string; total_seconds: number; streak_days: number }>();
  return rows.results.map((item: { user_id: string; display_name: string; total_seconds: number; streak_days: number }, index: number) => ({ rank: index + 1, displayName: item.display_name, totalSeconds: item.total_seconds, streakDays: item.streak_days, isCurrent: item.user_id === currentUserId }));
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return response({ error: "请先登录" }, { status: 401 });
  await env.DB.prepare("INSERT INTO user_focus_profiles (user_id, display_name, total_seconds, streak_days, last_study_date, updated_at) VALUES (?, ?, 0, 0, NULL, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name")
    .bind(user.id, displayName(user), new Date().toISOString()).run();
  const profile = await env.DB.prepare("SELECT total_seconds, streak_days, last_study_date FROM user_focus_profiles WHERE user_id = ?").bind(user.id).first<Profile>();
  return response({ totalSeconds: profile?.total_seconds ?? 0, streakDays: profile?.streak_days ?? 0, history: await history(user.id), leaderboard: await leaderboard(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return response({ error: "请先登录后记录专注" }, { status: 401 });
  const payload = await request.json() as { seconds?: number; subject?: string };
  const seconds = Math.min(Math.max(Math.floor(Number(payload.seconds) || 0), 1), 4 * 3600);
  const subject = payload.subject?.trim().slice(0, 60) || "未分类";
  const today = date();
  const previous = await env.DB.prepare("SELECT total_seconds, streak_days, last_study_date FROM user_focus_profiles WHERE user_id = ?").bind(user.id).first<Profile>();
  const streak = previous?.last_study_date === today ? previous.streak_days : previous?.last_study_date === date(-1) ? previous.streak_days + 1 : 1;
  const total = (previous?.total_seconds ?? 0) + seconds;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO user_focus_profiles (user_id, display_name, total_seconds, streak_days, last_study_date, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, total_seconds=excluded.total_seconds, streak_days=excluded.streak_days, last_study_date=excluded.last_study_date, updated_at=excluded.updated_at")
      .bind(user.id, displayName(user), total, streak, today, new Date().toISOString()),
    env.DB.prepare("INSERT INTO user_focus_sessions (user_id, study_date, subject, seconds) VALUES (?, ?, ?, ?)")
      .bind(user.id, today, subject, seconds),
  ]);
  return response({ totalSeconds: total, streakDays: streak, history: await history(user.id), leaderboard: await leaderboard(user.id) });
}
