import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "一个练习网站", description: "完成复习计划，再用一局游戏轻松充电。", openGraph: { title: "一个练习网站", description: "学习一下，玩一局再出发", images: ["/og.png"] }, twitter: { card: "summary_large_image", title: "一个练习网站", images: ["/og.png"] } };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
