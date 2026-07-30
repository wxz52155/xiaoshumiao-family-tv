import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "小树苗 · 家庭儿童视频中心",
    description: "为孩子管理安全、可控的视频内容，并向 OK影视 提供专属接口。",
    openGraph: {
      title: "小树苗 · 家庭儿童视频中心",
      description: "好内容，由家长亲自挑选。",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "小树苗家庭儿童视频中心" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "小树苗 · 家庭儿童视频中心",
      description: "好内容，由家长亲自挑选。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
