import { cookies } from "next/headers";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata = {
  title: "Hải Đăng – Hệ thống quản lý nhà trọ",
  description: "Quản lý phòng trọ hiệu quả: theo dõi phòng, khách thuê, hợp đồng và tài chính tại một nơi duy nhất.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const isWebView = cookieStore.get('is_webview')?.value === '1';

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <SiteChrome isWebView={isWebView}>{children}</SiteChrome>
      </body>
    </html>
  );
}
