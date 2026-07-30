import { env } from "cloudflare:workers";
import { ensureSchema, json } from "@/db/cms";

export async function GET() {
  await ensureSchema();
  const result = await env.DB.prepare("SELECT s.*, c.name AS category_name FROM sync_tasks s LEFT JOIN categories c ON c.id = s.category_id ORDER BY s.id DESC LIMIT 20").all();
  return json({ tasks: result.results });
}
