import { adminProtectionEnabled, json } from "@/db/cms";

export async function GET() {
  return json({ protected: adminProtectionEnabled() });
}
