import {Geist, Geist_Mono} from "next/font/google";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import {SiteChrome} from "@/components/SiteChrome";

const fontSans = Be_Vietnam_Pro({
    subsets: ["vietnamese"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-sans",
});
const fontMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Hải Đăng – Hệ thống quản lý nhà trọ",
    description: "Quản lý phòng trọ hiệu quả: theo dõi phòng, khách thuê, hợp đồng và tài chính tại một nơi duy nhất.",
};

export default function RootLayout({children}) {
    return (
        <html
            lang="vi"
            className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
        >
        <body className="min-h-full flex flex-col font-sans">
        <SiteChrome>{children}</SiteChrome>
        </body>
        </html>
    );
}
