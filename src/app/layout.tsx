import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.scss";
import { AppProvider } from "@/context/AppContext";
import { Header } from "@/components/Layout/Header";
import { Footer } from "@/components/Layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoLab - Алгоритмические модели",
  description: "Интерактивное обучение алгоритмам через визуализацию",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <AppProvider>
          <Header />
          <main className="main-content">
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
