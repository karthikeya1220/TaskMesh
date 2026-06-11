import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopNavBar } from "@/components/TopNavBar";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "JobFlow Dashboard",
  description: "Distributed execution tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist:wght@600;800;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen bg-surface text-on-surface antialiased font-body-md">
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <TopNavBar />
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
