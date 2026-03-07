import DonutChart from "./DonutChart";
import DownDeviceBox from "./DownDeviceBox";

const fmt = (v) => {
  if (!v || v === "-") return "-";
  let s = String(v).trim().replace(" ", "T");
  
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += "Z";

  const d = new Date(s);
  if (isNaN(d.getTime())) return String(v);

  return d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
};

const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

export default function SiteCard({ site }) {
  if (!site) return null;

  return (
    <div className="relative overflow-hidden border rounded-xl shadow-sm bg-white">
      {/* Left Accent Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-500" />

      <div className="p-8 pl-10">
        <div className="flex items-start justify-between gap-10">
          {/* Left */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-8">Site : {site.site_name}</h2>

            <div className="flex flex-wrap gap-16">
              <DonutChart
                label="Router"
                online={num(site.router_online)}
                total={num(site.router_total)}
              />
              <DonutChart
                label="Switch"
                online={num(site.switch_online)}
                total={num(site.switch_total)}
              />
              <DonutChart
                label="Access Point"
                online={num(site.ap_online)}
                total={num(site.ap_total)}
              />
            </div>
          </div>

          {/* Middle - Down Device Panels */}
          <div className="flex gap-4 flex-wrap">
            <DownDeviceBox title="Router" items={site.router_down_list || []} />
            <DownDeviceBox title="Switch" items={site.switch_down_list || []} />
            <DownDeviceBox title="AP" items={site.ap_down_list || []} />
          </div>

          {/* Right */}
          <div className="text-sm text-gray-700 text-right min-w-[220px] space-y-6">
            <div>
              <div className="font-semibold text-gray-900">Recently Editor</div>
              <div className="text-gray-600">{site.recent_editor ?? "-"}</div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Last Update</div>
              <div>{fmt(site.last_update)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}