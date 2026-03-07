import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function DonutChart({ online, total, label }) {
  const safeTotal = Number(total) || 0;
  const safeOnline = Number(online) || 0;

  // ✅ ถ้าไม่มีอุปกรณ์เลย
  if (safeTotal === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
          Not in use
        </div>
        <div className="text-sm font-semibold mt-3">{label}</div>
      </div>
    );
  }

  const safeOffline = Math.max(safeTotal - safeOnline, 0);
  const data = [
    { name: "Online", value: safeOnline },
    { name: "Offline", value: safeOffline },
  ];

  const COLORS = ["#22c55e", "#e5e7eb"];
  const percentage = Math.round((safeOnline / safeTotal) * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={42}
              outerRadius={62}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm font-semibold mt-3">{label}</div>
      <div className="text-xs text-gray-500">{safeOnline}/{safeTotal}</div>
      <div className="text-xs text-green-600 font-medium">{percentage}%</div>
    </div>
  );
}