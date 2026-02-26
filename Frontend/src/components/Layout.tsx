import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cv-shell">
      <Sidebar />
      <main className="cv-main">
        <Header />
        <div style={{ height: 14 }} />
        {children}
      </main>
    </div>
  );
}