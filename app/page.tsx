"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Area = "home" | "review" | "game";
type AccountMode = "choose" | "signin" | "signup";
type Point = { x: number; y: number };
type Session = { access_token: string; user: { id: string; email: string } };
type GameLeader = { rank: number; displayName: string; bestScore: number; isCurrent?: boolean };
const gridSize = 18;
const initialSnake = (): Point[] => [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

function SnakeGame({ initialBest, storageKey, onUpdate, onBest }: { initialBest: number; storageKey: string; onUpdate: (value: { score: number; best: number }) => void; onBest: (score: number) => void }) {
  const [snake, setSnake] = useState<Point[]>(initialSnake);
  const [food, setFood] = useState<Point>({ x: 13, y: 6 });
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 });
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("按开始，追上那颗苹果");

  const turn = (next: Point) => {
    if (next.x === -directionRef.current.x && next.y === -directionRef.current.y) return;
    directionRef.current = next;
    setDirection(next);
  };
  const randomFood = (body: Point[]) => {
    let point: Point;
    do point = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
    while (body.some((cell) => same(cell, point)));
    return point;
  };
  const start = () => {
    setSnake(initialSnake()); setFood({ x: 13, y: 6 }); setScore(0);
    directionRef.current = { x: 1, y: 0 }; setDirection(directionRef.current);
    setMessage("保持节奏，别撞到自己"); setRunning(true);
  };
  useEffect(() => { setBest(initialBest); }, [initialBest, storageKey]);
  useEffect(() => { localStorage.setItem(`${storageKey}-last-score`, String(score)); onUpdate({ score, best }); }, [score, best, onUpdate, storageKey]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSnake((body) => {
      const move = directionRef.current;
      const head = { x: body[0].x + move.x, y: body[0].y + move.y };
      const ate = same(head, food);
      const nextBody = ate ? body : body.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize || nextBody.some((cell) => same(cell, head))) {
        setRunning(false); setMessage("这一局结束了，再试一次？"); return body;
      }
      if (ate) {
        setScore((value) => {
          const nextScore = value + 10;
          setBest((valueBest) => { const nextBest = Math.max(valueBest, nextScore); if (nextBest > valueBest) { localStorage.setItem(`${storageKey}-best`, String(nextBest)); onBest(nextBest); } return nextBest; });
          return nextScore;
        });
        setFood(randomFood([head, ...body]));
      }
      return [head, ...nextBody];
    }), Math.max(78, 165 - score * 4));
    return () => window.clearInterval(timer);
  }, [running, score, food, onBest, storageKey]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const moves: Record<string, Point> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
      if (moves[event.key]) { event.preventDefault(); turn(moves[event.key]); }
      if (event.key === " ") { event.preventDefault(); setRunning((value) => !value); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  return <section className="game-layout"><div className="game-board-wrap"><div className="game-board" aria-label="贪吃蛇游戏棋盘">{Array.from({ length: gridSize * gridSize }, (_, index) => { const cell = { x: index % gridSize, y: Math.floor(index / gridSize) }; const snakeCell = snake.some((part) => same(part, cell)); return <span key={index} className={`${snakeCell ? "snake-cell" : ""} ${same(cell, snake[0]) ? "snake-head" : ""} ${same(cell, food) ? "food-cell" : ""}`} />; })}</div><div className="board-glow" /></div><aside className="game-panel"><span className="section-kicker">ARCADE / 01</span><h2>霓虹贪吃蛇</h2><p>{message}</p><div className="score-line"><div><small>本局得分</small><strong>{score}</strong></div><div><small>最高纪录</small><strong>{best}</strong></div></div><button className="primary-button" onClick={running ? () => setRunning(false) : start}>{running ? "暂停游戏" : score ? "重新开始" : "开始游戏"}</button><p className="game-tip">方向键 / WASD 控制，空格暂停。每吞下一颗苹果，速度会稍微加快。</p><div className="d-pad"><button onClick={() => turn({ x: 0, y: -1 })}>↑</button><button onClick={() => turn({ x: -1, y: 0 })}>←</button><button onClick={() => turn({ x: 0, y: 1 })}>↓</button><button onClick={() => turn({ x: 1, y: 0 })}>→</button></div></aside></section>;
}

export default function Page() {
  const [area, setArea] = useState<Area>("home");
  const [accountMode, setAccountMode] = useState<AccountMode>("choose");
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState(["完成 20 分钟英语阅读", "复盘一道数学错题", "整理本周知识卡片"]);
  const [done, setDone] = useState<number[]>([]);
  const [gameStats, setGameStats] = useState({ score: 0, best: 0 });
  const [gameLeaderboard, setGameLeaderboard] = useState<GameLeader[]>([]);
  const [gameRankingLoading, setGameRankingLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const savedTasks = localStorage.getItem("review-hub-tasks"); const savedDone = localStorage.getItem("review-hub-done");
    if (savedTasks) setTasks(JSON.parse(savedTasks)); if (savedDone) setDone(JSON.parse(savedDone));
    let savedSession: Session | null = null;
    try { savedSession = JSON.parse(localStorage.getItem("review-desk-session") || "null") as Session | null; } catch {}
    if (savedSession?.user?.id) { setSession(savedSession); void loadGameProfile(savedSession); }
    else setGameStats({ score: Number(localStorage.getItem("review-snake-guest-last-score") || 0), best: Number(localStorage.getItem("review-snake-guest-best") || 0) });
    const isGuest = sessionStorage.getItem("review-desk-guest") === "1";
    setAccountOpen(!savedSession?.user?.id && !isGuest);
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) { localStorage.setItem("review-hub-tasks", JSON.stringify(tasks)); localStorage.setItem("review-hub-done", JSON.stringify(done)); } }, [tasks, done, hydrated]);
  const progress = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
  const openReview = () => window.location.assign("/review");
  const openGame = () => { setArea("game"); if (!session && sessionStorage.getItem("review-desk-guest") !== "1") { setAccountMode("choose"); setAccountOpen(true); } };
  async function loadGameProfile(next: Session) {
    setGameRankingLoading(true);
    try {
      const response = await fetch("/api/game-score", { headers: { authorization: `Bearer ${next.access_token}` } });
      if (!response.ok) throw new Error("profile");
      const data = await response.json();
      setGameStats({ score: Number(localStorage.getItem(`review-snake-${next.user.id}-last-score`) || 0), best: data.bestScore || 0 });
      setGameLeaderboard(data.leaderboard || []);
    } catch { setGameLeaderboard([]); }
    finally { setGameRankingLoading(false); }
  }
  const enterAsGuest = () => { sessionStorage.setItem("review-desk-guest", "1"); setSession(null); setGameLeaderboard([]); setGameStats({ score: Number(localStorage.getItem("review-snake-guest-last-score") || 0), best: Number(localStorage.getItem("review-snake-guest-best") || 0) }); setAccountOpen(false); };
  const signOut = () => { localStorage.removeItem("review-desk-session"); sessionStorage.removeItem("review-desk-guest"); setSession(null); setGameLeaderboard([]); setGameStats({ score: Number(localStorage.getItem("review-snake-guest-last-score") || 0), best: Number(localStorage.getItem("review-snake-guest-best") || 0) }); setAccountMode("choose"); setAccountOpen(true); };
  const saveGameBest = useCallback(async (score: number) => {
    if (!session) return;
    try {
      const response = await fetch("/api/game-score", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ score }) });
      const data = await response.json();
      if (response.ok) { setGameStats((value) => ({ ...value, best: data.bestScore || score })); setGameLeaderboard(data.leaderboard || []); }
    } catch {}
  }, [session]);
  const submitAccount = async () => {
    setAccountError("");
    if (!accountEmail.trim() || accountPassword.length < 6) { setAccountError("请输入邮箱和至少 6 位密码"); return; }
    setAccountBusy(true);
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: accountMode, email: accountEmail.trim(), password: accountPassword }) });
      const data = await response.json();
      if (!response.ok || !data.access_token || !data.user?.id) { setAccountError(data.error_description || data.msg || data.error || "操作失败，请检查邮箱与密码"); return; }
      const next: Session = { access_token: data.access_token, user: { id: data.user.id, email: data.user.email } };
      localStorage.setItem("review-desk-session", JSON.stringify(next));
      sessionStorage.removeItem("review-desk-guest");
      setSession(next);
      await loadGameProfile(next);
      setAccountOpen(false);
    } catch { setAccountError("网络暂不可用，请稍后再试"); }
    finally { setAccountBusy(false); }
  };
  const addTask = () => { const title = window.prompt("添加一项复习任务"); if (title?.trim()) setTasks((items) => [...items, title.trim()]); };
  const toggle = (index: number) => setDone((items) => items.includes(index) ? items.filter((id) => id !== index) : [...items, index]);
  return <main className="app-shell"><nav className="topbar"><button className="logo" onClick={() => setArea("home")}><span>R</span>复习台</button><div><button className={area === "review" ? "nav-active" : ""} onClick={openReview}>复习区</button><button className={area === "game" ? "nav-active" : ""} onClick={openGame}>游戏区</button></div><button className="mini-button" onClick={() => setArea("home")}>主页</button></nav>
    {accountOpen && <div className="entry-auth-backdrop"><section className="entry-auth" role="dialog" aria-modal="true" aria-labelledby="entry-auth-title">{accountMode === "choose" ? <><span className="entry-auth-mark">R</span><span className="section-kicker">WELCOME TO REVIEW DESK</span><h2 id="entry-auth-title">开始你的学习空间</h2><p>登录后同步复习数据，并永久保存游戏最高分和排行榜名次；也可以先以游客身份体验。</p><div className="entry-auth-actions"><button className="primary-button" onClick={() => setAccountMode("signin")}>登录</button><button className="entry-signup-button" onClick={() => setAccountMode("signup")}>注册新账号</button><button className="entry-guest-button" onClick={enterAsGuest}>以游客身份进入 <b>→</b></button></div></> : <><button className="entry-auth-back" onClick={() => { setAccountMode("choose"); setAccountError(""); }}>← 返回</button><span className="section-kicker">{accountMode === "signin" ? "WELCOME BACK" : "CREATE ACCOUNT"}</span><h2 id="entry-auth-title">{accountMode === "signin" ? "登录复习台" : "注册新账号"}</h2><p>{accountMode === "signin" ? "继续你的复习计划和永久游戏排名。" : "创建账号后，学习数据和游戏纪录都会独立保存。"}</p><label>邮箱<input autoFocus type="email" autoComplete="email" placeholder="name@example.com" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} /></label><label>密码<input type="password" autoComplete={accountMode === "signin" ? "current-password" : "new-password"} placeholder="至少 6 位" value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitAccount(); }} /></label>{accountError && <div className="entry-auth-error" role="alert">{accountError}</div>}<button className="primary-button entry-submit" disabled={accountBusy} onClick={() => void submitAccount()}>{accountBusy ? "请稍候…" : accountMode === "signin" ? "登录并进入" : "注册并进入"}</button><button className="entry-switch" onClick={() => { setAccountMode(accountMode === "signin" ? "signup" : "signin"); setAccountError(""); }}>{accountMode === "signin" ? "没有账号？立即注册" : "已有账号？去登录"}</button></>}</section></div>}
    {area === "home" && <section className="home-page"><div className="hero-copy"><span className="section-kicker">STUDY, PLAY, REPEAT</span><h1>学习有节奏，<em>休息有乐趣。</em></h1><p>把今天的小目标做完，再用一局轻松的游戏为注意力充电。</p><div className="hero-actions"><button className="primary-button" onClick={openReview}>进入复习台 <b>↗</b></button><button className="ghost-button" onClick={openGame}>去玩贪吃蛇 <b>→</b></button></div></div><div className="hero-orbit"><button className="orbit-card card-study" onClick={openReview}><span>✦</span><b>今日复习</b><small>{done.length} / {tasks.length} 项已完成 · {progress}%</small></button><button className="orbit-card card-game" onClick={openGame}><span>●</span><b>Snake</b><small>最高 {gameStats.best} 分 · 最近 {gameStats.score} 分</small></button><div className="orb orb-one" /><div className="orb orb-two" /><div className="orbit-ring" /></div><div className="home-footer"><span>01 / 复习计划</span><i /> <span>02 / 轻松一局</span><i /> <span>03 / 更好地出发</span></div></section>}
    {area === "review" && <section className="review-page"><header className="page-header"><div><span className="section-kicker">YOUR REVIEW SPACE</span><h1>今天，先完成一小步。</h1></div><button className="primary-button" onClick={addTask}>+ 添加任务</button></header><div className="review-grid"><section className="task-card"><div className="card-head"><div><span className="section-kicker">TODAY'S LIST</span><h2>今日复习</h2></div><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div>{tasks.map((task, index) => <label className={done.includes(index) ? "review-task completed" : "review-task"} key={`${task}-${index}`}><input type="checkbox" checked={done.includes(index)} onChange={() => toggle(index)} /><span>✓</span><b>{task}</b><small>25 分钟</small></label>)}</section><aside className="focus-card-new"><span className="section-kicker">FOCUS CLOCK</span><div className="focus-number">25:00</div><p>选一项任务，给自己一段不被打扰的专注时间。</p><button className="light-button">开始专注</button><div className="focus-dots"><i /><i /><i /></div></aside></div></section>}
    {area === "game" && <section className="game-page"><header className="page-header"><div><span className="section-kicker">GAME BREAK</span><h1>休息一下，再漂亮地回归。</h1></div><div className="game-header-actions"><div className="game-status"><i /> {session ? "成绩已永久保存" : "游客成绩仅保存在本机"}</div>{session ? <button className="game-account-button" onClick={signOut}>{session.user.email} · 退出</button> : <button className="game-account-button" onClick={() => { setAccountMode("choose"); setAccountOpen(true); }}>登录 / 注册</button>}</div></header><SnakeGame initialBest={gameStats.best} storageKey={session ? `review-snake-${session.user.id}` : "review-snake-guest"} onUpdate={setGameStats} onBest={saveGameBest} /><section className="game-ranking"><div className="game-ranking-head"><div><span className="section-kicker">PERMANENT LEADERBOARD</span><h2>全站游戏排行榜</h2></div><small>登录用户 · 永久最高分</small></div>{!session ? <div className="game-ranking-empty"><strong>登录后永久保存成绩并参与排名</strong><p>游客可以正常游玩，但成绩只保存在当前浏览器。</p><button className="primary-button" onClick={() => { setAccountMode("choose"); setAccountOpen(true); }}>登录 / 注册</button></div> : gameRankingLoading ? <div className="game-ranking-empty"><p>正在加载排行榜…</p></div> : <div className="game-ranking-list">{gameLeaderboard.map((entry) => <div className={entry.isCurrent ? "game-rank-row current" : "game-rank-row"} key={`${entry.rank}-${entry.displayName}`}><b className={entry.rank <= 3 ? `game-rank-number top-${entry.rank}` : "game-rank-number"}>{entry.rank}</b><span>{entry.displayName}{entry.isCurrent && <em>我</em>}</span><strong>{entry.bestScore} 分</strong></div>)}</div>}</section></section>}
  </main>;
}
