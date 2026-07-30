import { getVideosByIds, json, listCategories, listVideos, type Video } from "@/db/cms";

function brief(video: Video) {
  return {
    vod_id: String(video.id),
    vod_name: video.title,
    vod_pic: video.poster_url,
    vod_remarks: video.duration || video.source_type.toUpperCase(),
  };
}

function detail(video: Video) {
  const labelMap: Record<string, string> = {
    bilibili: "哔哩哔哩",
    quark: "夸克网盘",
    baidu: "百度网盘",
    iqiyi: "爱奇艺",
    tencent: "腾讯视频",
    direct: "直连播放",
  };
  const from = labelMap[video.source_type] || "家庭片库";
  return {
    ...brief(video),
    type_name: video.category_name || "",
    vod_content: video.description,
    vod_play_from: from,
    vod_play_url: `播放$${video.source_url}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids");
  if (ids) {
    const rows = await getVideosByIds(ids.split(",").map(Number).filter(Boolean));
    return json({ code: 1, msg: "数据列表", page: 1, pagecount: 1, limit: rows.length, total: rows.length, list: rows.map(detail) });
  }

  const categories = await listCategories(false);
  const typeId = Number(url.searchParams.get("t")) || undefined;
  const wd = url.searchParams.get("wd") || undefined;
  const page = Number(url.searchParams.get("pg")) || 1;
  const result = await listVideos({ categoryId: typeId, search: wd, page, limit: 24, publishedOnly: true });
  const payload = {
    code: 1,
    msg: "数据列表",
    page: result.page,
    pagecount: Math.max(1, Math.ceil(result.total / result.limit)),
    limit: result.limit,
    total: result.total,
    class: categories.map((item) => ({ type_id: String(item.id), type_name: item.name })),
    list: result.rows.map(brief),
  };
  return json(payload);
}

export async function OPTIONS() {
  return json({ ok: true });
}
