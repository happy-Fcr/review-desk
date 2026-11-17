"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Task = { id: number; title: string; subject: string; minutes: number; done: boolean };
type Subject = { id: number; name: string; code: string; color: string; progress: number; note: string };
type LibraryItem = { id: number; type: "文本" | "课本" | "题库" | "资料"; title: string; detail: string; subject?: string; createdAt: string; visibility?: "private" | "public" };
type Session = { access_token: string; user: { id: string; email: string } };
type LeaderboardEntry = { rank: number; displayName: string; totalSeconds: number; streakDays: number; isCurrent?: boolean };

const starterTasks: Task[] = [
  { id: 1, title: "极限与连续 · 错题回顾", subject: "高等数学", minutes: 25, done: false },
  { id: 2, title: "Unit 3 核心词汇", subject: "英语", minutes: 20, done: false },
  { id: 3, title: "牛顿运动定律 · 例题", subject: "物理", minutes: 30, done: false },
  { id: 4, title: "古诗文默写", subject: "语文", minutes: 15, done: true },
];
const starterSubjects: Subject[] = [
  { id: 1, name: "高等数学", code: "MAT", color: "#e9c46a", progress: 72, note: "12 个知识点待巩固" },
  { id: 2, name: "英语", code: "ENG", color: "#78b6a5", progress: 48, note: "8 组词汇待复习" },
  { id: 3, name: "物理", code: "PHY", color: "#8ca8d8", progress: 64, note: "4 道错题待攻克" },
  { id: 4, name: "语文", code: "CHI", color: "#df9e82", progress: 86, note: "本周目标已完成" },
];

function load<T>(key: string, fallback: T) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function getQuestions(raw: string) {
  try { const json = JSON.parse(raw); if (Array.isArray(json)) return json.map((q) => typeof q === "string" ? q : q.question || q.title || JSON.stringify(q)).filter(Boolean); } catch {}
  const csvLines = raw.split(/\r?\n/).filter(Boolean); if (csvLines[0]?.includes(",")) return csvLines.slice(1).map((line) => line.split(",")[0].replace(/^"|"$/g, "").trim()).filter(Boolean);
  return raw.split(/\r?\n(?=\s*(?:\d+[.、]|Q\d+[:：]|[-*]\s))/i).map((line) => line.replace(/^\s*(?:\d+[.、]|Q\d+[:：]|[-*]\s)/i, "").trim()).filter(Boolean);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(starterTasks);
  const [subjects, setSubjects] = useState<Subject[]>(starterSubjects);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [publicItems, setPublicItems] = useState<LibraryItem[]>([]);
  const [resourceVisibility, setResourceVisibility] = useState<"private" | "public">("private");
  const [selectedLibrarySubject, setSelectedLibrarySubject] = useState<string | null>(null);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [focusSubject, setFocusSubject] = useState("未分类");
  const [history, setHistory] = useState<{ study_date: string; subject: string; seconds: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"signin" | "signup">("signin");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [readyAccountId, setReadyAccountId] = useState<string | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);
  const [view, setView] = useState("概览");
  const startedAt = useRef(0);
  useEffect(() => { const savedSession = load<Session | null>("review-desk-session", null); if (savedSession?.user?.id) { setSession(savedSession); void loadAccount(savedSession); } else { setTasks(load("review-desk-guest-tasks", starterTasks)); setSubjects(load("review-desk-guest-subjects", starterSubjects)); setLibrary(load("review-desk-guest-library", [])); setReadyAccountId("guest"); if (sessionStorage.getItem("review-desk-guest") !== "1") setAccountOpen(true); } }, []);
  useEffect(() => { if (!session && readyAccountId === "guest") localStorage.setItem("review-desk-guest-tasks", JSON.stringify(tasks)); }, [tasks, session, readyAccountId]);
  useEffect(() => { if (!session && readyAccountId === "guest") localStorage.setItem("review-desk-guest-subjects", JSON.stringify(subjects)); }, [subjects, session, readyAccountId]);
  useEffect(() => { if (!session && readyAccountId === "guest") localStorage.setItem("review-desk-guest-library", JSON.stringify(library)); }, [library, session, readyAccountId]);
  useEffect(() => { fetch("/api/public-library").then((r) => r.ok ? r.json() : null).then((data) => setPublicItems(data?.items || [])).catch(() => undefined); }, []);
  useEffect(() => { if (session && readyAccountId === session.user.id) fetch("/api/user-data", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ payload: { tasks, subjects, library } }) }).catch(() => undefined); }, [tasks, subjects, library, session, readyAccountId]);
  useEffect(() => { if (!isFocusing) return; const timer = window.setInterval(() => setFocusSeconds((v) => v + 1), 1000); return () => window.clearInterval(timer); }, [isFocusing]);
  const completed = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const focusClock = useMemo(() => [Math.floor(focusSeconds / 3600), Math.floor((focusSeconds % 3600) / 60), focusSeconds % 60].map((v) => String(v).padStart(2, "0")).join(":"), [focusSeconds]);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("/", "-");
  const todayBySubject = history.filter((item) => item.study_date === todayKey).reduce<Record<string, number>>((all, item) => ({ ...all, [item.subject]: (all[item.subject] || 0) + item.seconds }), {});
  const weekTotals = Array.from({ length: 7 }, (_, index) => { const d = new Date(); d.setDate(d.getDate() - (6 - index)); const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(d).replaceAll("/", "-"); return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, seconds: history.filter((item) => item.study_date === key).reduce((sum, item) => sum + item.seconds, 0) }; });
  const weekMax = Math.max(1, ...weekTotals.map((item) => item.seconds));
  const nav = ["概览", "我的科目", "复习计划", "知识图库", "专注排行"];
  function addTask() { const id = Date.now(); setTasks((items) => [...items, { id, title: "新复习事项", subject: subjects[0]?.name || "未分类", minutes: 25, done: false }]); setView("复习计划"); setTaskEditorOpen(true); }
  async function loadAccount(next: Session) {
    setReadyAccountId(null);
    setTasks(starterTasks); setSubjects(starterSubjects); setLibrary([]);
    setTotalFocusSeconds(0); setStreakDays(0); setHistory([]); setLeaderboard([]);
    const authorization = `Bearer ${next.access_token}`;
    try {
      const [deskResponse, focusResponse] = await Promise.all([
        fetch("/api/user-data", { headers: { authorization } }),
        fetch("/api/streak", { headers: { authorization } }),
      ]);
      if (deskResponse.status === 401 || focusResponse.status === 401) throw new Error("登录已过期");
      const desk = deskResponse.ok ? await deskResponse.json() : null;
      const focus = focusResponse.ok ? await focusResponse.json() : null;
      const payload = desk?.payload || {};
      setTasks(Array.isArray(payload.tasks) ? payload.tasks : starterTasks);
      setSubjects(Array.isArray(payload.subjects) ? payload.subjects : starterSubjects);
      setLibrary(Array.isArray(payload.library) ? payload.library : []);
      if (focus) {
        setTotalFocusSeconds(focus.totalSeconds || 0);
        setStreakDays(focus.streakDays || 0);
        setHistory(focus.history || []);
        setLeaderboard(focus.leaderboard || []);
      }
      setReadyAccountId(next.user.id);
    } catch {
      localStorage.removeItem("review-desk-session");
      setSession(null); setReadyAccountId("guest"); setAccountOpen(true);
      window.alert("登录已失效，请重新登录。");
    }
  }
  function signOut() {
    localStorage.removeItem("review-desk-session");
    setSession(null); setReadyAccountId("guest");
    setTasks(load("review-desk-guest-tasks", starterTasks));
    setSubjects(load("review-desk-guest-subjects", starterSubjects));
    setLibrary(load("review-desk-guest-library", []));
    setTotalFocusSeconds(0); setStreakDays(0); setHistory([]); setLeaderboard([]);
    setAccountOpen(true);
  }
  function addSubject() { const name = window.prompt("科目名称", "例如：生物"); if (!name?.trim()) return; const code = (window.prompt("科目缩写", name.slice(0, 3).toUpperCase()) || name.slice(0, 3)).toUpperCase(); setSubjects((items) => [...items, { id: Date.now(), name: name.trim(), code, color: ["#d6b4e8", "#a9d7d0", "#f1bd91", "#aabde6"][items.length % 4], progress: 0, note: "从第一项复习开始" }]); }
  function chooseSubject() { return selectedLibrarySubject || window.prompt(`归属科目（可填写：${subjects.map((item) => item.name).join("、")}）`, subjects[0]?.name || "未分类")?.trim(); }
  async function saveLibraryItem(item: LibraryItem) { setLibrary((items) => [item, ...items]); if (item.visibility === "public" && session) { const response = await fetch("/api/public-library", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(item) }); if (response.ok) setPublicItems((items) => [item, ...items]); } }
  function addText() { const title = window.prompt("知识条目标题", "例如：电磁感应公式"); const detail = title ? window.prompt("输入内容", "在这里记录定义、公式或易错点") : null; const subject = detail ? chooseSubject() : null; if (title && detail && subject) void saveLibraryItem({ id: Date.now(), type: "文本", title, detail, subject, createdAt: today, visibility: resourceVisibility }); }
  function addBook() { const title = window.prompt("课本名称", "例如：大学物理（第七版）"); const subject = title ? chooseSubject() : null; if (title && subject) void saveLibraryItem({ id: Date.now(), type: "课本", title, detail: "已添加到知识图库，可作为复习资料索引。", subject, createdAt: today, visibility: resourceVisibility }); }
  function importMaterial(event: ChangeEvent<HTMLInputElement>, type: "课本" | "资料") { const file = event.target.files?.[0]; if (!file) return; const subject = chooseSubject(); if (!subject) return; const suffix = file.name.split(".").pop()?.toUpperCase() || "文件"; void saveLibraryItem({ id: Date.now(), type, title: file.name, detail: `${suffix} 文件 · ${(file.size / 1024 / 1024).toFixed(1)} MB · 已加入本地资料库`, subject, createdAt: today, visibility: resourceVisibility }); event.target.value = ""; }
  function editLibraryItem(item: LibraryItem) { const title = window.prompt("资料名称", item.title); const detail = title ? window.prompt("资料说明", item.detail) : null; if (title && detail) setLibrary((items) => items.map((entry) => entry.id === item.id ? { ...entry, title, detail } : entry)); }
  async function submitAccount() { const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: accountMode, email: accountEmail, password: accountPassword }) }); const data = await response.json(); if (!response.ok || !data.access_token || !data.user?.id) { window.alert(data.error_description || data.msg || data.error || "操作失败，请检查邮箱与密码"); return; } const next: Session = { access_token: data.access_token, user: { id: data.user.id, email: data.user.email } }; localStorage.setItem("review-desk-session", JSON.stringify(next)); setSession(next); setAccountOpen(false); await loadAccount(next); }
  function importQuestions(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const subject = chooseSubject(); if (!subject) { event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => { const questions = getQuestions(String(reader.result || "")); if (!questions.length) { window.alert("没有识别到题目。请使用 TXT、Markdown、CSV 或 JSON 题库文件。"); return; } setLibrary((items) => [{ id: Date.now(), type: "题库", title: file.name, detail: `已自动识别 ${questions.length} 道题：${questions.slice(0, 2).join("；")}`, subject, createdAt: today }, ...items]); window.alert(`已识别 ${questions.length} 道题目，并加入知识图库。`); }; reader.readAsText(file, "utf-8"); event.target.value = ""; }
  async function toggleFocus() { if (!session) { setAccountOpen(true); window.alert("请先登录账号，再开始专注计时并参与排行榜。"); return; } if (!isFocusing) { startedAt.current = Date.now(); setFocusSeconds(0); setIsFocusing(true); return; } const seconds = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)); setFocusSeconds(seconds); setIsFocusing(false); try { const response = await fetch("/api/streak", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ seconds, subject: focusSubject }) }); const data = await response.json(); if (response.ok) { setTotalFocusSeconds(data.totalSeconds); setStreakDays(data.streakDays); setHistory(data.history || []); setLeaderboard(data.leaderboard || []); } else window.alert(data.error || "记录失败，请重新登录后再试。"); } catch { window.alert("网络暂不可用，本次专注未能记录，请稍后再试。"); } }
  function editTask(task: Task) { const title = window.prompt("复习内容", task.title); if (!title?.trim()) return; const subject = window.prompt("所属科目", task.subject) || task.subject; const minutes = Number(window.prompt("预计分钟数", String(task.minutes))) || task.minutes; setTasks((items) => items.map((item) => item.id === task.id ? { ...item, title: title.trim(), subject: subject.trim(), minutes } : item)); }
  const toggleTask = (id: number) => setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task));

  return <main className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">R</span><span>复习台</span></div><nav>{nav.map((item, i) => <button key={item} className={view === item ? "nav-item active" : "nav-item"} onClick={() => setView(item)}><span>{["◫", "◌", "□", "◇", "♛"][i]}</span>{item}</button>)}</nav><div className="sidebar-foot"><div className="tiny-avatar">我</div><div><strong>{session ? session.user.email.split("@")[0] : "游客空间"}</strong><small>{session ? "个人数据已隔离保存" : "登录后同步个人数据"}</small></div></div></aside>
      <section className="content" data-view={view}><header><div><p className="eyebrow">{today}</p><h1>{view === "知识图库" ? "把知识整理成自己的地图" : view === "我的科目" ? "我的科目" : view === "复习计划" ? "复习计划" : view === "专注排行" ? "全站专注排行榜" : "你好，今天想从哪里开始？"}</h1></div><div className="header-actions">{view === "概览" && <a className="home-link" href="/">← 返回主页</a>}{view === "知识图库" && selectedLibrarySubject && <select className="visibility-select" value={resourceVisibility} onChange={(e) => setResourceVisibility(e.target.value as "private" | "public")}><option value="private">🔒 新资料仅自己可见</option><option value="public">🌐 新资料对所有用户公开</option></select>}{session ? <button className="account-chip" onClick={signOut}>{session.user.email} · 退出</button> : <button className="account-chip" onClick={() => setAccountOpen(true)}>登录 / 注册</button>}{view !== "知识图库" && view !== "专注排行" && <button className="add-button" onClick={addTask}>＋ 添加复习</button>}</div></header>{accountOpen && <div className="modal-backdrop"><section className="account-modal"><p className="eyebrow">MY REVIEW DESK</p><h2>{accountMode === "signin" ? "欢迎回来" : "创建你的账号"}</h2><p>每个账号都有独立的复习计划、科目和知识图库；专注时长会进入全站排行榜。</p><input type="email" placeholder="邮箱" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} /><input type="password" placeholder="密码（至少 6 位）" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} /><button className="add-button full" onClick={submitAccount}>{accountMode === "signin" ? "登录" : "注册并登录"}</button><button className="switch-account" onClick={() => setAccountMode((mode) => mode === "signin" ? "signup" : "signin")}>{accountMode === "signin" ? "没有账号？立即注册" : "已有账号？去登录"}</button><button className="switch-account guest-entry" onClick={() => { sessionStorage.setItem("review-desk-guest", "1"); setReadyAccountId("guest"); setAccountOpen(false); }}>以游客身份进入</button></section></div>}
      {view === "知识图库" ? <section className="library-page">{!selectedLibrarySubject ? <><div className="library-hero"><p className="eyebrow">KNOWLEDGE LIBRARY</p><h2>选择一门科目，进入它的资料页</h2><p>课本、讲义、图片、题库和你的笔记都会按科目归档。</p></div><div className="library-subject-grid">{subjects.map((subject) => { const count = library.filter((item) => item.subject === subject.name).length; return <button className="library-subject-card" key={subject.id} onClick={() => setSelectedLibrarySubject(subject.name)}><span style={{ background: subject.color }}>{subject.code}</span><strong>{subject.name}</strong><small>{count} 份资料</small><b>进入 →</b></button>; })}<button className="library-subject-card new" onClick={addSubject}>＋ 添加科目</button></div></> : <><button className="back-button" onClick={() => setSelectedLibrarySubject(null)}>← 返回科目列表</button><div className="library-detail-head"><div><p className="eyebrow">SUBJECT LIBRARY</p><h2>{selectedLibrarySubject}</h2></div><div className="library-actions"><button className="outline-button" onClick={addText}>＋ 新建文本</button><label className="outline-button upload-button">添加课本<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.epub,.txt,.md,.jpg,.jpeg,.png,.webp" onChange={(e) => importMaterial(e, "课本")} /></label><label className="add-button upload-button">导入资料<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json,.jpg,.jpeg,.png,.webp" onChange={(e) => importMaterial(e, "资料")} /></label></div></div><div className="format-note">支持 PDF、Word、PPT、Excel、EPUB、图片、TXT、Markdown、CSV、JSON；题库可继续使用 TXT、Markdown、CSV、JSON 自动识别。</div><label className="question-import">＋ 导入题库并识别题目<input type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" onChange={importQuestions} /></label><div className="library-grid">{library.filter((item) => item.subject === selectedLibrarySubject).length ? library.filter((item) => item.subject === selectedLibrarySubject).map((item) => <article className="library-card rich" key={item.id}><span className={`type-badge ${item.type}`}>{item.type}</span><h3>{item.title}</h3><p>{item.detail}</p><small>{item.createdAt} 添加</small><div className="library-card-actions"><button onClick={() => editLibraryItem(item)}>编辑</button><button onClick={() => setLibrary((items) => items.filter((entry) => entry.id !== item.id))}>删除</button></div></article>) : <div className="library-empty"><span>◇</span><h2>还没有资料</h2><p>添加课本、导入资料，或写下第一条知识笔记。</p></div>}</div></>}</section> : <>
      <div className="stats"><article><span className="stat-icon sun">☼</span><div><small>今日完成</small><strong>{completed}<i> / {tasks.length} 项</i></strong></div><b>{progress}%</b></article><article><span className="stat-icon flame">♨</span><div><small>连续学习</small><strong>{streakDays}<i> 天</i></strong></div><b className="soft">已联网记录</b></article></div>
      <section className="charts"><article><div className="chart-head"><h2>近 7 天专注</h2><span>真实联网记录</span></div><div className="week-chart">{weekTotals.map((item) => <div className="day-bar" key={item.key}><b style={{ height: `${Math.max(4, item.seconds / weekMax * 100)}%` }} title={`${Math.round(item.seconds / 60)} 分钟`} /><small>{item.label}</small></div>)}</div></article><article><div className="chart-head"><h2>今天按科目</h2><span>{Math.round(Object.values(todayBySubject).reduce((a, b) => a + b, 0) / 60)} 分钟</span></div><div className="subject-time">{Object.keys(todayBySubject).length ? Object.entries(todayBySubject).map(([subject, seconds]) => <div key={subject}><span>{subject}</span><b>{Math.floor(seconds / 60)} 分 {seconds % 60} 秒</b></div>) : <p>结束一次专注后，这里会显示你的真实学习分布。</p>}</div></article></section>
      <section className="leaderboard-panel"><div className="leaderboard-head"><div><p className="eyebrow">FOCUS LEADERBOARD</p><h2>全站专注榜</h2></div><span>所有已注册用户 · 累计时长</span></div>{!session ? <div className="leaderboard-empty"><strong>登录后查看排行榜</strong><p>游客的计时不会进入全站榜单。</p><button onClick={() => setAccountOpen(true)}>登录 / 注册</button></div> : leaderboard.length ? <div className="leaderboard-list">{leaderboard.map((entry) => <div className={entry.isCurrent ? "leaderboard-row current" : "leaderboard-row"} key={`${entry.rank}-${entry.displayName}`}><b className={entry.rank <= 3 ? `rank top-${entry.rank}` : "rank"}>{entry.rank}</b><span className="leader-name">{entry.displayName}{entry.isCurrent && <em>我</em>}</span><small>连续 {entry.streakDays} 天</small><strong>{Math.floor(entry.totalSeconds / 3600)} 小时 {Math.floor(entry.totalSeconds % 3600 / 60)} 分</strong></div>)}</div> : <div className="leaderboard-empty"><strong>排行榜还没有记录</strong><p>完成第一次专注，你就会出现在这里。</p></div>}</section>
      <div className="section-title"><div><p className="eyebrow">MY SUBJECTS</p><h2>我的科目</h2></div><button className="text-button" onClick={addSubject}>＋ 自定义科目</button></div><section className="subjects">{subjects.map((item) => <article className="subject-card" key={item.id}><div className="subject-top"><span className="subject-code" style={{ background: item.color }}>{item.code}</span><button aria-label={`删除${item.name}`} onClick={() => setSubjects((items) => items.filter((s) => s.id !== item.id))}>×</button></div><h3>{item.name}</h3><p>尚未记录个人复习数据</p></article>)}<button className="new-subject" onClick={addSubject}><span>＋</span>添加科目</button></section>
      <div className="lower-grid"><section className="tasks-panel"><div className="section-title compact"><div><p className="eyebrow">TODAY'S PLAN</p><h2>今日复习</h2></div><button className="text-button" onClick={() => setTaskEditorOpen(true)}>编辑总表</button></div><div className="task-list">{tasks.map((task) => <label className={task.done ? "task done" : "task"} key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} /><span className="fake-check">✓</span><div><strong>{task.title}</strong><small>{task.subject} · {task.minutes} 分钟</small></div></label>)}</div></section><aside className="focus-card"><div className="focus-label">专注计时</div><div className={isFocusing ? "focus-hourglass running" : "focus-hourglass"} aria-hidden="true"><span className="hourglass-top" /><span className="hourglass-stream" /><span className="hourglass-bottom" /></div><select className="focus-subject" value={focusSubject} onChange={(e) => setFocusSubject(e.target.value)} disabled={isFocusing}><option>未分类</option>{subjects.map((item) => <option key={item.id}>{item.name}</option>)}</select><div className="focus-time">{focusClock}</div><p>{isFocusing ? "正在沉浸学习，保持节奏。" : "选择科目后开始，结束时会联网记录。"}</p><button onClick={toggleFocus}>{isFocusing ? "结束并记录" : "开始专注"}</button><div className="focus-streak">◒ 已联网累计 {Math.floor(totalFocusSeconds / 60)} 分钟</div></aside></div>{taskEditorOpen && <div className="modal-backdrop"><section className="task-modal"><div className="section-title"><h2>编辑今日复习</h2><button className="text-button" onClick={() => setTaskEditorOpen(false)}>完成</button></div>{tasks.map((task) => <div className="task-edit-row" key={task.id}><input value={task.title} onChange={(e) => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, title: e.target.value } : item))} /><input value={task.subject} onChange={(e) => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, subject: e.target.value } : item))} /><input type="number" value={task.minutes} onChange={(e) => setTasks((items) => items.map((item) => item.id === task.id ? { ...item, minutes: Number(e.target.value) } : item))} /><button onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}>删除</button></div>)}<button className="outline-button" onClick={addTask}>＋ 添加一项</button></section></div>}</>}</section></main>;
}
