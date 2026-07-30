import { env } from "cloudflare:workers";
import { adminAuthorized, ensureSchema, json, listVideos } from "@/db/cms";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listVideos({
    categoryId: Number(url.searchParams.get("category")) || undefined,
    search: url.searchParams.get("q") || undefined,
    page: Number(url.searchParams.get("page")) || 1,
    limit: Number(url.searchParams.get("limit")) || 50,
  });
  return json(result);
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const sourceUrl = String(body.source_url || "").trim();
  if (!sourceUrl) return json({ error: "请填写播放或分享链接" }, 400);
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(`INSERT INTO videos
      (category_id, title, description, poster_url, source_type, source_url, duration, uploader, status, featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(Number(body.category_id), String(body.title || "未命名视频"), String(body.description || ""), String(body.poster_url || ""), String(body.source_type || "bilibili"), sourceUrl, String(body.duration || ""), String(body.uploader || ""), String(body.status || "published"), body.featured ? 1 : 0, now, now)
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) return json({ error: "这个链接已经导入过了" }, 409);
    throw error;
  }
  return json({ ok: true, ...(await listVideos({ page: 1, limit: 50 })) }, 201);
}

export async function PUT(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  await env.DB.prepare(`UPDATE videos SET category_id = ?, title = ?, description = ?, poster_url = ?, source_type = ?, source_url = ?, duration = ?, uploader = ?, status = ?, featured = ?, updated_at = ? WHERE id = ?`)
    .bind(Number(body.category_id), String(body.title || ""), String(body.description || ""), String(body.poster_url || ""), String(body.source_type || "bilibili"), String(body.source_url || ""), String(body.duration || ""), String(body.uploader || ""), String(body.status || "published"), body.featured ? 1 : 0, new Date().toISOString(), Number(body.id))
    .run();
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const id = Number(new URL(request.url).searchParams.get("id"));
  await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

export async function OPTIONS() {
  return json({ ok: true });
}
