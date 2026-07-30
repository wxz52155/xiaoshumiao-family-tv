export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const config = {
    spider: "https://raw.githubusercontent.com/qist/tvbox/master/xiaosa/spider.jar",
    sites: [
      { key: "family_cms", name: "小树苗 · 儿童中心", type: 1, api: `${origin}/api/vod`, searchable: 1, quickSearch: 1, filterable: 1, changeable: 0, style: { type: "rect", ratio: 1.5 } },
      { key: "family_bili", name: "哔哩 · 登录与播放", type: 3, api: "csp_BiliYS", searchable: 1, quickSearch: 0, filterable: 0, changeable: 0, ext: { cookie: "http://127.0.0.1:9978/file/TVBox/bili_cookie.txt" } },
      { key: "family_quark", name: "夸克 · 登录与播放", type: 3, api: "csp_PanQuark", searchable: 0, filterable: 0, changeable: 0, style: { type: "list", ratio: 1.433 } },
      { key: "family_baidu", name: "百度 · 登录与播放", type: 3, api: "csp_PanBaidu", searchable: 0, filterable: 0, changeable: 0, style: { type: "list", ratio: 1.433 } },
      { key: "family_push", name: "网盘 · 分享链接播放", type: 3, api: "csp_PushAgent", searchable: 0, quickSearch: 0, filterable: 0 },
    ],
    parses: [{ name: "聚合", type: 3, url: "Web" }],
    flags: ["bilibili", "哔哩", "哔哩哔哩", "iqiyi", "qiyi", "爱奇艺", "qq", "腾讯", "腾讯视频"],
    lives: [],
    rules: [],
    note: "网盘及B站账号登录由OK影视本机扩展完成，账号信息不会上传到儿童CMS。",
  };
  return Response.json(config, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}
