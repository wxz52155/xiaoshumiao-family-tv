import { env } from "cloudflare:workers";
import { adminAuthorized, ensureSchema, json } from "@/db/cms";

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function md5(input: string) {
  // Cloudflare Workers does not expose MD5 in WebCrypto. Bilibili accepts this
  // compact implementation for its WBI query signature.
  function add(x: number, y: number) { return (((x & 0xffff) + (y & 0xffff)) | ((((x >>> 16) + (y >>> 16) + (((x & 0xffff) + (y & 0xffff)) >>> 16)) & 0xffff) << 16)); }
  function rol(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return add(rol(add(add(a, q), add(x, t)), s), b); }
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&c)|(~b&d),a,b,x,s,t)}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&d)|(c&~d),a,b,x,s,t)}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t)}
  const text = unescape(encodeURIComponent(input)); const words:number[] = [];
  for(let i=0;i<text.length;i++) words[i>>2]=(words[i>>2]||0)|(text.charCodeAt(i)<<((i%4)*8));
  words[text.length>>2]=(words[text.length>>2]||0)|(0x80<<((text.length%4)*8));
  words[(((text.length+8)>>6)<<4)+14]=text.length*8;
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
  for(let i=0;i<words.length;i+=16){const oa=a,ob=b,oc=c,od=d;
    a=ff(a,b,c,d,words[i]||0,7,-680876936);d=ff(d,a,b,c,words[i+1]||0,12,-389564586);c=ff(c,d,a,b,words[i+2]||0,17,606105819);b=ff(b,c,d,a,words[i+3]||0,22,-1044525330);
    a=ff(a,b,c,d,words[i+4]||0,7,-176418897);d=ff(d,a,b,c,words[i+5]||0,12,1200080426);c=ff(c,d,a,b,words[i+6]||0,17,-1473231341);b=ff(b,c,d,a,words[i+7]||0,22,-45705983);
    a=ff(a,b,c,d,words[i+8]||0,7,1770035416);d=ff(d,a,b,c,words[i+9]||0,12,-1958414417);c=ff(c,d,a,b,words[i+10]||0,17,-42063);b=ff(b,c,d,a,words[i+11]||0,22,-1990404162);
    a=ff(a,b,c,d,words[i+12]||0,7,1804603682);d=ff(d,a,b,c,words[i+13]||0,12,-40341101);c=ff(c,d,a,b,words[i+14]||0,17,-1502002290);b=ff(b,c,d,a,words[i+15]||0,22,1236535329);
    a=gg(a,b,c,d,words[i+1]||0,5,-165796510);d=gg(d,a,b,c,words[i+6]||0,9,-1069501632);c=gg(c,d,a,b,words[i+11]||0,14,643717713);b=gg(b,c,d,a,words[i]||0,20,-373897302);
    a=gg(a,b,c,d,words[i+5]||0,5,-701558691);d=gg(d,a,b,c,words[i+10]||0,9,38016083);c=gg(c,d,a,b,words[i+15]||0,14,-660478335);b=gg(b,c,d,a,words[i+4]||0,20,-405537848);
    a=gg(a,b,c,d,words[i+9]||0,5,568446438);d=gg(d,a,b,c,words[i+14]||0,9,-1019803690);c=gg(c,d,a,b,words[i+3]||0,14,-187363961);b=gg(b,c,d,a,words[i+8]||0,20,1163531501);
    a=gg(a,b,c,d,words[i+13]||0,5,-1444681467);d=gg(d,a,b,c,words[i+2]||0,9,-51403784);c=gg(c,d,a,b,words[i+7]||0,14,1735328473);b=gg(b,c,d,a,words[i+12]||0,20,-1926607734);
    a=hh(a,b,c,d,words[i+5]||0,4,-378558);d=hh(d,a,b,c,words[i+8]||0,11,-2022574463);c=hh(c,d,a,b,words[i+11]||0,16,1839030562);b=hh(b,c,d,a,words[i+14]||0,23,-35309556);
    a=hh(a,b,c,d,words[i+1]||0,4,-1530992060);d=hh(d,a,b,c,words[i+4]||0,11,1272893353);c=hh(c,d,a,b,words[i+7]||0,16,-155497632);b=hh(b,c,d,a,words[i+10]||0,23,-1094730640);
    a=hh(a,b,c,d,words[i+13]||0,4,681279174);d=hh(d,a,b,c,words[i]||0,11,-358537222);c=hh(c,d,a,b,words[i+3]||0,16,-722521979);b=hh(b,c,d,a,words[i+6]||0,23,76029189);
    a=hh(a,b,c,d,words[i+9]||0,4,-640364487);d=hh(d,a,b,c,words[i+12]||0,11,-421815835);c=hh(c,d,a,b,words[i+15]||0,16,530742520);b=hh(b,c,d,a,words[i+2]||0,23,-995338651);
    a=ii(a,b,c,d,words[i]||0,6,-198630844);d=ii(d,a,b,c,words[i+7]||0,10,1126891415);c=ii(c,d,a,b,words[i+14]||0,15,-1416354905);b=ii(b,c,d,a,words[i+5]||0,21,-57434055);
    a=ii(a,b,c,d,words[i+12]||0,6,1700485571);d=ii(d,a,b,c,words[i+3]||0,10,-1894986606);c=ii(c,d,a,b,words[i+10]||0,15,-1051523);b=ii(b,c,d,a,words[i+1]||0,21,-2054922799);
    a=ii(a,b,c,d,words[i+8]||0,6,1873313359);d=ii(d,a,b,c,words[i+15]||0,10,-30611744);c=ii(c,d,a,b,words[i+6]||0,15,-1560198380);b=ii(b,c,d,a,words[i+13]||0,21,1309151649);
    a=ii(a,b,c,d,words[i+4]||0,6,-145523070);d=ii(d,a,b,c,words[i+11]||0,10,-1120210379);c=ii(c,d,a,b,words[i+2]||0,15,718787259);b=ii(b,c,d,a,words[i+9]||0,21,-343485551);
    a=add(a,oa);b=add(b,ob);c=add(c,oc);d=add(d,od)}
  const hex=(n:number)=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,"0")).join("");
  return hex(a)+hex(b)+hex(c)+hex(d);
}

function midFromUrl(value: string) {
  const direct = value.match(/space\.bilibili\.com\/(\d+)/);
  if (direct) return direct[1];
  if (/^\d+$/.test(value.trim())) return value.trim();
  return null;
}

async function fetchBiliVideos(mid: string, page = 1) {
  const cookie = (env as unknown as { BILI_COOKIE?: string }).BILI_COOKIE || "";
  const headers = { "User-Agent": "Mozilla/5.0", Referer: `https://space.bilibili.com/${mid}`, Cookie: cookie };
  const nav = await fetch("https://api.bilibili.com/x/web-interface/nav", { headers }).then((r) => r.json()) as any;
  const imgKey = nav?.data?.wbi_img?.img_url?.split("/").pop()?.split(".")[0];
  const subKey = nav?.data?.wbi_img?.sub_url?.split("/").pop()?.split(".")[0];
  if (!imgKey || !subKey) throw new Error("B站访问受限，请稍后重试或配置 BILI_COOKIE");
  const raw = imgKey + subKey;
  const mixin = mixinKeyEncTab.map((i) => raw[i]).join("").slice(0, 32);
  const params: Record<string, string> = { mid, pn: String(page), ps: "50", order: "pubdate", wts: String(Math.floor(Date.now() / 1000)) };
  const query = Object.keys(params).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k].replace(/[!'()*]/g, ""))}`).join("&");
  const signed = `${query}&w_rid=${md5(query + mixin)}`;
  const response = await fetch(`https://api.bilibili.com/x/space/wbi/arc/search?${signed}`, { headers }).then((r) => r.json()) as any;
  if (response.code !== 0) throw new Error(response.message || "B站同步失败");
  return response.data;
}

export async function POST(request: Request) {
  if (!adminAuthorized(request)) return json({ error: "管理口令不正确" }, 401);
  await ensureSchema();
  const body = await request.json() as { url?: string; category_id?: number };
  const mid = midFromUrl(body.url || "");
  if (!mid) return json({ error: "请填写 B站UP主空间链接或 UID" }, 400);
  const now = new Date().toISOString();
  const task = await env.DB.prepare("INSERT INTO sync_tasks (category_id, source_url, source_type, status, created_at) VALUES (?, ?, 'bilibili_up', 'running', ?) RETURNING id")
    .bind(Number(body.category_id), body.url, now).first<{ id: number }>();
  try {
    const data = await fetchBiliVideos(mid);
    const items = data?.list?.vlist || [];
    let imported = 0;
    for (const item of items) {
      const url = `https://www.bilibili.com/video/${item.bvid}`;
      const result = await env.DB.prepare(`INSERT OR IGNORE INTO videos
        (category_id, title, description, poster_url, source_type, source_url, duration, uploader, status, featured, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'bilibili', ?, ?, ?, 'published', 0, ?, ?)`)
        .bind(Number(body.category_id), item.title, item.description || "", item.pic?.startsWith("//") ? `https:${item.pic}` : (item.pic || ""), url, item.length || "", item.author || "", now, now).run();
      imported += result.meta.changes || 0;
    }
    await env.DB.prepare("UPDATE sync_tasks SET status = 'success', imported_count = ?, message = ?, last_synced_at = ? WHERE id = ?")
      .bind(imported, `读取 ${items.length} 条，新增 ${imported} 条`, now, task?.id).run();
    return json({ ok: true, imported, total: items.length, message: `已同步 ${items.length} 条视频，新增 ${imported} 条` });
  } catch (error) {
    await env.DB.prepare("UPDATE sync_tasks SET status = 'failed', message = ? WHERE id = ?").bind(String(error), task?.id).run();
    return json({ error: error instanceof Error ? error.message : "同步失败" }, 502);
  }
}
