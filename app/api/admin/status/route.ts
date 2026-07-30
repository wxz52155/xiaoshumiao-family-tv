import { env } from "cloudflare:workers";
import { json } from "@/db/cms";

export async function GET() {
  return json({ protected: Boolean((env as unknown as { ADMIN_TOKEN?: string }).ADMIN_TOKEN) });
}
