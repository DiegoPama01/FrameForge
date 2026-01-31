import type { Metadata } from "next";
import "./globals.css";
import { ProjectProvider } from "../presentation/context/ProjectContext";
import { Sidebar } from "../presentation/components/Sidebar";
import { Header } from "../presentation/components/Header";

export const metadata: Metadata = {
  title: "FrameForge Dashboard",
  description: "Video Pipeline Orchestration Console",
  icons: {
    icon: "/FF-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased overflow-hidden bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100">
        <ProjectProvider>
          <div className="flex h-screen w-full">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <div className="flex-1 overflow-hidden flex flex-col">
                {children}
              </div>
            </main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
