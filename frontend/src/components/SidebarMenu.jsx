import { X, LayoutDashboard, UserStar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SidebarMenu({ open, onClose }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const menuItems = [
    { name: "Dashboard", icon: <LayoutDashboard />, path: "/dashboard" },
    ...(role === "admin"
      ? [{ name: "Admin Management", icon: <UserStar />, path: "/admin-management" }]
      : []),
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-700">Menu</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
          </button>
        </div>

        {/* Menu List */}
        <nav className="flex flex-col mt-2 space-y-2 px-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.path)}
              className="flex items-center space-x-3 px-5 py-2 text-gray-700 hover:bg-orange-500 hover:text-white transition rounded-md text-left"
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}