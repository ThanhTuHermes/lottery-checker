import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Dò Vé Số Kiến Thiết — Tra Cứu Kết Quả Xổ Số 3 Miền Tự Động",
  description: "Hệ thống dò vé số kiến thiết tự động, nhanh chóng và chính xác cho các đài Miền Nam, Miền Trung, Miền Bắc. Nhập số vé để đối chiếu kết quả ngay.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
