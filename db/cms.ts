import { env } from "cloudflare:workers";

type D1ResultRow = Record<string, unknown>;

export type Category = {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon: string;
  sort_order: number;
  enabled: number;
  created_at: string;
};

export type Video = {
  id: number;
  category_id: number;
  category_name?: string;
  title: string;
  description: string;
  poster_url: string;
  source_type: string;
  source_url: string;
  duration: string;
  uploader: string;
  status: string;
  featured: number;
  created_at: string;
  updated_at: string;
};

const defaultCategories = [
  ["科普世界", "science", "#4f7c68", "✦", 10],
  ["儿童电影", "kids-movies", "#d06b4c", "▶", 20],
  ["英语磨耳朵", "english-listening", "#5177a6", "Aa", 30],
  ["自然纪录片", "nature", "#8a7b45", "⌁", 40],
  ["音乐与艺术", "arts", "#9b637e", "♪", 50],
];

function db() {
  if (!env.DB) throw new Error("D1 database is unavailable");
  return env.DB;
}

export async function ensureSchema() {
  const d1 = db();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#4f7c68',
      icon TEXT NOT NULL DEFAULT '◌',
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      poster_url TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL,
      source_url TEXT NOT NULL,
      duration TEXT NOT NULL DEFAULT '',
      uploader TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS sync_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      source_url TEXT NOT NULL,
      source_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      imported_count INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      last_synced_at TEXT,
      created_at TEXT NOT NULL
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS videos_category_idx ON videos (category_id)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS videos_status_idx ON videos (status)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS videos_source_url_idx ON videos (source_url)"),
  ]);

  const count = await d1.prepare("SELECT COUNT(*) AS count FROM categories").first<{ count: number }>();
  if (!count?.count) {
    const now = new Date().toISOString();
    await d1.batch(
      defaultCategories.map((item) =>
        d1
          .prepare("INSERT OR IGNORE INTO categories (name, slug, color, icon, sort_order, enabled, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
          .bind(...item, now),
      ),
    );
  }
}

export async function listCategories(includeDisabled = true): Promise<Category[]> {
  await ensureSchema();
  const where = includeDisabled ? "" : "WHERE enabled = 1";
  const result = await db()
    .prepare(`SELECT * FROM categories ${where} ORDER BY sort_order ASC, id ASC`)
    .all<Category>();
  return result.results;
}

export async function listVideos(options: { categoryId?: number; search?: string; page?: number; limit?: number; publishedOnly?: boolean } = {}) {
  await ensureSchema();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 24));
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (options.categoryId) {
    conditions.push("v.category_id = ?");
    values.push(options.categoryId);
  }
  if (options.search) {
    conditions.push("(v.title LIKE ? OR v.description LIKE ? OR v.uploader LIKE ?)");
    const term = `%${options.search}%`;
    values.push(term, term, term);
  }
  if (options.publishedOnly) conditions.push("v.status = 'published'");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const totalRow = await db()
    .prepare(`SELECT COUNT(*) AS count FROM videos v ${where}`)
    .bind(...values)
    .first<{ count: number }>();
  const rows = await db()
    .prepare(`SELECT v.*, c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id = v.category_id ${where} ORDER BY v.featured DESC, v.updated_at DESC LIMIT ? OFFSET ?`)
    .bind(...values, limit, (page - 1) * limit)
    .all<Video>();
  return { rows: rows.results, total: totalRow?.count || 0, page, limit };
}

export async function getVideosByIds(ids: number[]) {
  await ensureSchema();
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const result = await db()
    .prepare(`SELECT v.*, c.name AS category_name FROM videos v LEFT JOIN categories c ON c.id = v.category_id WHERE v.id IN (${placeholders})`)
    .bind(...ids)
    .all<Video>();
  return result.results;
}

export function adminAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_TOKEN?: string }).ADMIN_TOKEN;
  if (!expected) return true;
  return request.headers.get("x-admin-token") === expected;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
      "Cache-Control": "no-store",
    },
  });
}

export function rowValue<T>(row: D1ResultRow | null, key: string, fallback: T): T {
  return (row?.[key] as T) ?? fallback;
}
