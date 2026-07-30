import { env } from "cloudflare:workers";
import { adminAuthorized, ensureSchema, json, listCategories } from "@/db/cms";

export async function GET() {
  return json({ categories: await listCategories(true) });
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();
  const slug = String(body.slug || body.name || "category")
    .trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff-]/g, "");
  await env.DB.prepare("INSERT INTO categories (name, slug, color, icon, sort_order, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(String(body.name || "新分类"), slug, String(body.color || "#4f7c68"), String(body.icon || "◌"), Number(body.sort_order || 0), body.enabled === false ? 0 : 1, now)
    .run();
  return json({ ok: true, categories: await listCategories(true) }, 201);
}

export async function PUT(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  await env.DB.prepare("UPDATE categories SET name = ?, color = ?, icon = ?, sort_order = ?, enabled = ? WHERE id = ?")
    .bind(String(body.name || ""), String(body.color || "#4f7c68"), String(body.icon || "◌"), Number(body.sort_order || 0), body.enabled ? 1 : 0, Number(body.id))
    .run();
  return json({ ok: true, categories: await listCategories(true) });
}

export async function DELETE(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const id = Number(new URL(request.url).searchParams.get("id"));
  const used = await env.DB.prepare("SELECT COUNT(*) AS count FROM videos WHERE category_id = ?").bind(id).first<{ count: number }>();
  if (used?.count) return json({ error: "分类中仍有视频，请先移动或删除视频" }, 409);
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return json({ ok: true, categories: await listCategories(true) });
}

export async function OPTIONS() {
  return json({ ok: true });
}
