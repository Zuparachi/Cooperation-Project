import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { api } from "../api/client";
import AddSiteModal from "../components/AddSiteModal";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";

export default function MainPage() {
  const [sites, setSites] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // ✅ โหลด Site ทั้งหมด
  const loadSites = async () => {
    try {
      const res = await api.getSites();
      setSites(res.data);
    } catch (err) {
      console.error("Error fetching sites:", err);
    }
  };

  // ✅ ลบ Site
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // ป้องกันคลิกแล้วเด้งเข้าเพจ
    if (!confirm("Delete this site?")) return;
    try {
      await api.deleteSite(id);
      loadSites(); // refresh list
    } catch (err) {
      console.error("Error deleting site:", err);
    }
  };

  // ✅ โหลดอัตโนมัติเมื่อเปิดหน้า
  useEffect(() => {
    loadSites();
  }, []);

  // ✅ ฟิลเตอร์ search
  const filteredSites = sites.filter(
    (s) =>
      s.site_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.job_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* 🔍 Search + Create */}
      <div className="flex justify-center mt-8 space-x-3">
        <div className="flex bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 w-[320px]">
          <input
            type="text"
            placeholder="Find existing site"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 focus:outline-none"
          />
          <Search className="text-gray-500 w-5 h-5 mt-[3px]" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-md shadow-md"
        >
          Create site
        </button>
      </div>

      {/* 🧱 รายการ Site */}
      <div className="mt-6 flex flex-col items-center space-y-4">
        {filteredSites.length > 0 ? (
          filteredSites.map((site) => (
            <div
              key={site._id}
              onClick={() => navigate(`/site/${site._id}`)}
              className="flex justify-between items-center w-[600px] bg-white rounded-md shadow-sm px-4 py-3 hover:shadow-md transition cursor-pointer border border-gray-100"
            >
              {/* Left: Site Info */}
              <div className="flex items-center space-x-4">
                <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md font-semibold">
                  {site.job_number}
                </span>
                <span className="font-medium">{site.site_name}</span>
              </div>

              {/* Right: Date + Delete */}
              <div className="flex items-center space-x-6 text-gray-600">
                <span>{site.date_modify || "—"}</span>
                <Trash2
                  className="w-5 h-5 text-gray-500 hover:text-red-500 cursor-pointer"
                  onClick={(e) => handleDelete(site._id, e)}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 mt-10">No sites found.</p>
        )}
      </div>

      {/* 📦 Modal สร้าง Site */}
      {showModal && (
        <AddSiteModal
          onClose={() => setShowModal(false)}
          onCreated={loadSites}
        />
      )}
    </div>
  );
}
