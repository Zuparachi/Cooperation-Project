export default function DownDeviceBox({ title, items = [] }) {
  const hasItems = items.length > 0;

  return (
    <div className="border rounded-xl p-4 w-52 min-h-[180px] bg-gray-50 shadow-sm">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>

      {hasItems ? (
        <div className="max-h-[120px] overflow-y-auto space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="text-sm text-red-600 font-medium border-b border-gray-200 pb-1"
            >
              • {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">No down device</div>
      )}
    </div>
  );
}