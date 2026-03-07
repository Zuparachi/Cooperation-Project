import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import SidebarMenu from "./SidebarMenu";
import { useNavigate } from "react-router-dom";
import NetOneLogo from "../assets/netone-logo.png";
import KMITLLogo from "../assets/kmitl-logo.png";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <header className="flex justify-between items-center bg-neutral-800 text-white px-8 py-3 shadow-md">
        {/* LEFT */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-md"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div
            onClick={() => navigate("/")}
            className="cursor-pointer text-2xl font-semibold"
          >
            Network <span className="text-amber-500">Manager</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center space-x-4">
          <img src={KMITLLogo} className="h-8" />
          <img src={NetOneLogo} className="h-8" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-md text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <SidebarMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
