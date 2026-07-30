"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Category = {
  id: number; name: string; slug: string; color: string; icon: string;
  sort_order: number; enabled: number;
};
type Video = {
  id: number; category_id: number; category_name: string; title: string;
  description: string; poster_url: string; source_type: string; source_url: string;
  duration: string; uploader: string; status: string; featured: number;
};
type SyncTask = {
  id: number; category_name: string; source_url: string; status: string;
  imported_count: number; message: string; last_synced_at?: string;
};

const navItems = [
  ["overview", "概览", "⌂"],
  ["library", "内容库", "▦"],
  ["import", "导入内容", "＋"],
  ["categories", "分类管理", "≡"],
  ["sync", "同步任务", "↻"],
  ["api", "OK影视接口", "⌁"],
];

const sourceLabels: Record<string, string> = {
  bilibili: "哔哩哔哩", quark: "夸克网盘", baidu: "百度网盘",
  iqiyi: "爱奇艺", tencent: "腾讯视频", direct: "直连视频",
};

function token() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("admin-token") || "";
}

async function api<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { "X-Admin-Token": token() } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = contentType.includes("json") ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!contentType.includes("json")) {
    throw new Error(response.ok ? "服务器返回格式异常，请刷新页面后重试" : `服务器请求失败（${response.status}），请稍后重试`);
  }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "操作失败，请稍后重试");
  return data as T;
}

export default function Dashboard() {
  const [section, setSection] = useState("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [protectedMode, setProtectedMode] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [apiUrl] = useState(() => typeof window === "undefined" ? "/api/ok" : `${window.location.origin}/api/ok`);

  const load = useCallback(async () => {
    try {
      const [categoryData, videoData, taskData, statusData] = await Promise.all([
        api<{ categories: Category[] }>("/api/categories"),
        api<{ rows: Video[] }>("/api/videos?limit=100"),
        api<{ tasks: SyncTask[] }>("/api/sync/tasks"),
        api<{ protected: boolean }>("/api/admin/status"),
      ]);
      setCategories(categoryData.categories);
      setVideos(videoData.rows);
      setTasks(taskData.tasks);
      setProtectedMode(statusData.protected);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "数据加载失败");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = setTimeout(() => { setNotice(""); setError(""); }, 3600);
    return () => clearTimeout(timer);
  }, [notice, error]);

  const filtered = useMemo(() => videos.filter((video) => {
    const inCategory = !categoryFilter || video.category_id === categoryFilter;
    const term = query.trim().toLowerCase();
    return inCategory && (!term || `${video.title} ${video.uploader} ${video.description}`.toLowerCase().includes(term));
  }), [videos, query, categoryFilter]);

  function requireToken() {
    if (protectedMode && !token()) {
      setTokenOpen(true);
      return false;
    }
    return true;
  }

  async function mutate(action: () => Promise<unknown>, success: string) {
    if (!requireToken()) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setNotice(success);
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "操作失败";
      setError(message);
      if (message.includes("口令")) setTokenOpen(true);
    } finally {
      setBusy(false);
    }
  }

  function changeSection(value: string) {
    setSection(value);
    setMenuOpen(false);
  }

  function saveToken(event: FormEvent) {
    event.preventDefault();
    sessionStorage.setItem("admin-token", adminToken.trim());
    setTokenOpen(false);
    setNotice("管理口令已在当前设备启用");
  }

  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    setNotice(message);
  }

  const publishedCount = videos.filter((item) => item.status === "published").length;
  const sourceCount = new Set(videos.map((item) => item.source_type)).size;

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark"><span>⌁</span></div>
          <div><strong>小树苗</strong><small>家庭视频中心</small></div>
        </div>
        <nav aria-label="主要导航">
          {navItems.map(([id, label, icon]) => (
            <button key={id} className={section === id ? "nav-item active" : "nav-item"} onClick={() => changeSection(id)}>
              <span>{icon}</span>{label}
              {id === "sync" && tasks.some((task) => task.status === "failed") && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>家长模式</span>
          <strong>{protectedMode ? "已开启编辑保护" : "本地预览模式"}</strong>
          <button onClick={() => setTokenOpen(true)}>{protectedMode ? "输入管理口令" : "口令将在上线后启用"}</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div className="page-title">
            <p>家庭儿童视频管理中心</p>
            <h1>{navItems.find((item) => item[0] === section)?.[1]}</h1>
          </div>
          <div className="header-actions">
            <div className="status-pill"><span /> OK影视接口正常</div>
            <button className="primary small" onClick={() => changeSection("import")}>＋ 添加内容</button>
          </div>
        </header>

        {(notice || error) && <div className={error ? "toast error" : "toast"}>{error || notice}</div>}

        <div className="content">
          {section === "overview" && (
            <>
              <section className="welcome-panel">
                <div>
                  <span className="eyebrow">今日片库</span>
                  <h2>把好内容，安静地放进孩子的世界。</h2>
                  <p>所有视频都由你亲自挑选。孩子只会看到已经发布的分类和内容。</p>
                  <div className="welcome-actions">
                    <button className="primary" onClick={() => changeSection("import")}>开始添加视频</button>
                    <button className="secondary" onClick={() => changeSection("api")}>连接 OK影视</button>
                  </div>
                </div>
                <div className="tree-art" aria-hidden="true">
                  <div className="sun" />
                  <div className="leaf l1" /><div className="leaf l2" /><div className="leaf l3" />
                  <div className="leaf l4" /><div className="leaf l5" /><div className="trunk" />
                  <div className="ground" />
                </div>
              </section>

              <section className="stats-grid">
                <Stat label="已发布内容" value={publishedCount} note="孩子当前可见" tone="green" />
                <Stat label="内容分类" value={categories.filter((item) => item.enabled).length} note="可随时调整" tone="orange" />
                <Stat label="播放来源" value={sourceCount} note="B站与网盘等" tone="blue" />
                <Stat label="同步任务" value={tasks.length} note={tasks[0]?.message || "等待首次同步"} tone="plum" />
              </section>

              <section className="two-column">
                <div className="panel">
                  <PanelHead title="最近添加" action="查看全部" onAction={() => changeSection("library")} />
                  {videos.length ? (
                    <div className="recent-list">
                      {videos.slice(0, 4).map((video) => <VideoRow key={video.id} video={video} compact />)}
                    </div>
                  ) : <Empty title="片库还是空的" text="添加第一条视频后，它会出现在这里。" action={() => changeSection("import")} />}
                </div>
                <div className="panel">
                  <PanelHead title="分类一览" action="管理分类" onAction={() => changeSection("categories")} />
                  <div className="category-overview">
                    {categories.map((category) => {
                      const count = videos.filter((video) => video.category_id === category.id).length;
                      return (
                        <button key={category.id} onClick={() => { setCategoryFilter(category.id); changeSection("library"); }}>
                          <span style={{ background: category.color }}>{category.icon}</span>
                          <div><strong>{category.name}</strong><small>{count} 个内容</small></div>
                          <b>›</b>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          )}

          {section === "library" && (
            <section className="panel full">
              <PanelHead title="内容库" subtitle={`${filtered.length} 条内容`} action="添加视频" onAction={() => changeSection("import")} />
              <div className="toolbar">
                <label className="search-field"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题、UP主或简介" /></label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(Number(e.target.value))}>
                  <option value={0}>全部分类</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              {filtered.length ? (
                <div className="library-list">
                  {filtered.map((video) => (
                    <VideoRow
                      key={video.id}
                      video={video}
                      onEdit={() => setEditingVideo(video)}
                      onDelete={() => void mutate(() => api(`/api/videos?id=${video.id}`, { method: "DELETE" }), "视频已移除")}
                    />
                  ))}
                </div>
              ) : <Empty title="没有找到内容" text={videos.length ? "换个关键词或分类试试。" : "先导入一条适合孩子的视频吧。"} action={() => changeSection("import")} />}
            </section>
          )}

          {section === "import" && (
            <section className="import-layout">
              <div className="panel">
                <div className="section-intro">
                  <span className="eyebrow">单条添加</span>
                  <h2>添加一个视频或网盘资源</h2>
                  <p>支持 B站、爱奇艺、腾讯视频播放页，以及夸克和百度网盘分享链接。</p>
                </div>
                <VideoForm categories={categories} busy={busy} onSubmit={(payload) => void mutate(
                  () => api("/api/videos", { method: "POST", body: JSON.stringify(payload) }),
                  "内容已添加到片库",
                )} />
              </div>
              <div className="panel sync-card">
                <div className="section-intro">
                  <span className="eyebrow">批量同步</span>
                  <h2>同步 B站UP主全部视频</h2>
                  <p>填写 UP主空间链接，系统会读取最近 50 条公开视频并自动去重。再次执行即可同步更新。</p>
                </div>
                <BiliSyncForm categories={categories} busy={busy} onSubmit={(payload) => void mutate(
                  () => api("/api/sync/bilibili", { method: "POST", body: JSON.stringify(payload) }),
                  "UP主视频同步完成",
                )} />
                <div className="privacy-note"><span>✓</span><p><strong>账号留在电视端</strong><br />夸克、百度、B站的扫码登录由 OK影视本机完成，本网站不收集网盘密码。</p></div>
              </div>
            </section>
          )}

          {section === "categories" && (
            <section className="panel full">
              <PanelHead title="分类管理" subtitle="决定孩子在电视首页看到什么" action="新建分类" onAction={() => setEditingCategory({
                id: 0, name: "", slug: "", color: "#4f7c68", icon: "✦", sort_order: categories.length * 10 + 10, enabled: 1,
              })} />
              <div className="category-table">
                {categories.map((category) => (
                  <div className="category-line" key={category.id}>
                    <span className="category-icon" style={{ background: category.color }}>{category.icon}</span>
                    <div className="grow"><strong>{category.name}</strong><small>{videos.filter((video) => video.category_id === category.id).length} 个内容 · 排序 {category.sort_order}</small></div>
                    <span className={category.enabled ? "state on" : "state"}>{category.enabled ? "已显示" : "已隐藏"}</span>
                    <button className="text-button" onClick={() => setEditingCategory(category)}>编辑</button>
                    <button className="icon-button danger" aria-label={`删除${category.name}`} onClick={() => void mutate(
                      () => api(`/api/categories?id=${category.id}`, { method: "DELETE" }), "分类已删除",
                    )}>×</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === "sync" && (
            <section className="panel full">
              <PanelHead title="同步任务" subtitle="记录 B站UP主的导入结果" action="新建同步" onAction={() => changeSection("import")} />
              {tasks.length ? <div className="task-list">
                {tasks.map((task) => (
                  <div className="task-line" key={task.id}>
                    <span className={`task-icon ${task.status}`}>{task.status === "success" ? "✓" : task.status === "failed" ? "!" : "↻"}</span>
                    <div className="grow"><strong>{task.category_name || "未分类的同步任务"}</strong><small>{task.source_url}</small><p>{task.message || "正在读取视频列表"}</p></div>
                    <span className={`task-state ${task.status}`}>{task.status === "success" ? "已完成" : task.status === "failed" ? "需重试" : "同步中"}</span>
                  </div>
                ))}
              </div> : <Empty title="还没有同步任务" text="添加一个 B站UP主空间，就能批量建立儿童片库。" action={() => changeSection("import")} />}
            </section>
          )}

          {section === "api" && (
            <section className="api-layout">
              <div className="panel api-main">
                <div className="api-badge"><span /> 已就绪</div>
                <h2>把专属接口添加到 OK影视</h2>
                <p>复制下面的地址，在 OK影视的“配置地址 / 数据源”中粘贴并确认。以后你在这里修改内容，电视端刷新后会自动更新。</p>
                <div className="copy-box"><code>{apiUrl}</code><button onClick={() => void copy(apiUrl, "接口地址已复制")}>复制地址</button></div>
                <div className="steps">
                  <div><span>1</span><p><strong>打开 OK影视</strong><small>进入设置或配置中心</small></p></div>
                  <div><span>2</span><p><strong>粘贴接口地址</strong><small>作为新的配置数据源</small></p></div>
                  <div><span>3</span><p><strong>扫码登录播放源</strong><small>按需登录 B站、夸克或百度</small></p></div>
                </div>
              </div>
              <div className="panel api-side">
                <h3>接口包含</h3>
                <ul>
                  <li><span>✓</span>小树苗儿童片库</li>
                  <li><span>✓</span>B站登录与播放扩展</li>
                  <li><span>✓</span>夸克网盘登录与播放</li>
                  <li><span>✓</span>百度网盘登录与播放</li>
                  <li><span>✓</span>网盘分享链接播放入口</li>
                </ul>
                <div className="api-note"><strong>安全说明</strong><p>电视端登录凭据保存在 OK影视设备本地，不会写入本 CMS。接口只公开你发布的视频目录和链接。</p></div>
                <a className="secondary block" href="/api/ok" target="_blank" rel="noreferrer">查看接口原始内容</a>
              </div>
            </section>
          )}
        </div>
      </main>

      {editingVideo && <Modal title="编辑视频" onClose={() => setEditingVideo(null)}>
        <VideoForm initial={editingVideo} categories={categories} busy={busy} submitText="保存修改" onSubmit={(payload) => void mutate(
          async () => { await api("/api/videos", { method: "PUT", body: JSON.stringify({ ...payload, id: editingVideo.id }) }); setEditingVideo(null); },
          "视频信息已更新",
        )} />
      </Modal>}

      {editingCategory && <Modal title={editingCategory.id ? "编辑分类" : "新建分类"} onClose={() => setEditingCategory(null)}>
        <CategoryForm category={editingCategory} busy={busy} onSubmit={(payload) => void mutate(
          async () => { await api("/api/categories", { method: editingCategory.id ? "PUT" : "POST", body: JSON.stringify(payload) }); setEditingCategory(null); },
          editingCategory.id ? "分类已更新" : "分类已创建",
        )} />
      </Modal>}

      {tokenOpen && <Modal title="家长管理口令" onClose={() => setTokenOpen(false)}>
        <form className="stack-form" onSubmit={saveToken}>
          <p className="form-note">上线后，添加、编辑和删除内容需要管理口令。口令只保存在当前浏览器会话中。</p>
          <label><span>管理口令</span><input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} autoFocus placeholder="请输入管理口令" required /></label>
          <button className="primary" type="submit">进入家长模式</button>
        </form>
      </Modal>}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number; note: string; tone: string }) {
  return <div className={`stat-card ${tone}`}><span className="stat-symbol">{tone === "green" ? "✓" : tone === "orange" ? "▤" : tone === "blue" ? "⌁" : "↻"}</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></div>;
}

function PanelHead({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action: string; onAction: () => void }) {
  return <div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button onClick={onAction}>{action} <span>→</span></button></div>;
}

function VideoRow({ video, compact, onEdit, onDelete }: { video: Video; compact?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const initials = video.title.slice(0, 2);
  return <div className={compact ? "video-row compact" : "video-row"}>
    <div className={`video-poster source-${video.source_type}`} style={video.poster_url ? { backgroundImage: `url("${video.poster_url}")` } : undefined}><span>{initials}</span></div>
    <div className="video-info"><strong>{video.title}</strong><p>{video.category_name || "未分类"} · {sourceLabels[video.source_type] || video.source_type}{video.uploader ? ` · ${video.uploader}` : ""}</p></div>
    <span className={`source-tag ${video.source_type}`}>{sourceLabels[video.source_type] || video.source_type}</span>
    {!compact && <span className={video.status === "published" ? "state on" : "state"}>{video.status === "published" ? "已发布" : "草稿"}</span>}
    {!compact && <div className="row-actions"><button onClick={onEdit}>编辑</button><button className="danger" onClick={onDelete}>删除</button></div>}
  </div>;
}

function Empty({ title, text, action }: { title: string; text: string; action: () => void }) {
  return <div className="empty"><span>＋</span><h3>{title}</h3><p>{text}</p><button className="secondary" onClick={action}>添加内容</button></div>;
}

function VideoForm({ categories, initial, busy, onSubmit, submitText = "添加到片库" }: { categories: Category[]; initial?: Video; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void; submitText?: string }) {
  const [sourceType, setSourceType] = useState(initial?.source_type || "bilibili");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit(Object.fromEntries(data.entries()));
    if (!initial) event.currentTarget.reset();
  }
  return <form className="stack-form" onSubmit={submit}>
    <div className="source-tabs">
      {Object.entries(sourceLabels).map(([id, label]) => <label key={id} className={sourceType === id ? "selected" : ""}><input type="radio" name="source_type" value={id} checked={sourceType === id} onChange={() => setSourceType(id)} />{label}</label>)}
    </div>
    <div className="form-grid">
      <label className="wide"><span>标题</span><input name="title" defaultValue={initial?.title} placeholder="例如：神奇的太阳系" required /></label>
      <label><span>所属分类</span><select name="category_id" defaultValue={initial?.category_id || categories[0]?.id}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span>发布状态</span><select name="status" defaultValue={initial?.status || "published"}><option value="published">立即发布</option><option value="draft">保存为草稿</option></select></label>
      <label className="wide"><span>播放或分享链接</span><input type="url" name="source_url" defaultValue={initial?.source_url} placeholder={sourceType === "bilibili" ? "https://www.bilibili.com/video/BV..." : "粘贴完整分享链接"} required /></label>
      <label className="wide"><span>封面图地址 <em>选填</em></span><input type="url" name="poster_url" defaultValue={initial?.poster_url} placeholder="https://..." /></label>
      <label><span>UP主 / 来源 <em>选填</em></span><input name="uploader" defaultValue={initial?.uploader} placeholder="例如：科学旅行号" /></label>
      <label><span>时长 <em>选填</em></span><input name="duration" defaultValue={initial?.duration} placeholder="例如：12:30" /></label>
      <label className="wide"><span>内容简介 <em>选填</em></span><textarea name="description" defaultValue={initial?.description} placeholder="写给家长看的内容说明" rows={3} /></label>
    </div>
    <button className="primary" disabled={busy}>{busy ? "正在保存…" : submitText}</button>
  </form>;
}

function BiliSyncForm({ categories, busy, onSubmit }: { categories: Category[]; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget).entries()));
  }
  return <form className="stack-form" onSubmit={submit}>
    <label><span>UP主空间链接或 UID</span><input name="url" placeholder="https://space.bilibili.com/123456" required /></label>
    <label><span>同步到分类</span><select name="category_id">{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <button className="primary warm" disabled={busy}>{busy ? "正在读取 B站…" : "同步最近 50 条视频"}</button>
  </form>;
}

function CategoryForm({ category, busy, onSubmit }: { category: Category; busy: boolean; onSubmit: (payload: Record<string, unknown>) => void }) {
  const [enabled, setEnabled] = useState(Boolean(category.enabled));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), id: category.id, enabled });
  }
  return <form className="stack-form" onSubmit={submit}>
    <div className="form-grid">
      <label className="wide"><span>分类名称</span><input name="name" defaultValue={category.name} placeholder="例如：动手实验" required /></label>
      <label><span>标记</span><input name="icon" defaultValue={category.icon} maxLength={2} /></label>
      <label><span>颜色</span><input className="color-input" type="color" name="color" defaultValue={category.color} /></label>
      <label><span>排序数字</span><input type="number" name="sort_order" defaultValue={category.sort_order} /></label>
      <label className="switch-line"><span>在电视端显示</span><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /></label>
    </div>
    <button className="primary" disabled={busy}>{busy ? "正在保存…" : "保存分类"}</button>
  </form>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal"><div className="modal-head"><h2>{title}</h2><button aria-label="关闭" onClick={onClose}>×</button></div>{children}</div></div>;
}
