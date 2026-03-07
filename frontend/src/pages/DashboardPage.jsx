import { useEffect, useState } from "react";
import { api } from "../api/client";
import SiteCard from "../components/dashboard/SiteCard";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [sites, setSites] = useState([]);
  const navigate = useNavigate();

  const fetchSites = async () => {
    const res = await api.getSiteDashboard();
    setSites(res.data);
  };

  useEffect(() => {
    fetchSites();
    const interval = setInterval(fetchSites, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
      </div>

      <div className="space-y-6">
        {sites.map((site, index) => (
          <SiteCard key={site.site_id ?? index} site={site} />
        ))}
      </div>
    </div>
  );
}