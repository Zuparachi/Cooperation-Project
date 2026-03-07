import React from "react";
import NavBar from "../components/NavBar";
import SideBarMenu from "../components/SidebarMenu";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:block">
        <SideBarMenu />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <NavBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
