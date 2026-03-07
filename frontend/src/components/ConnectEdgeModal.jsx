import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Link2 } from "lucide-react";

export default function ConnectEdgeModal({ parentType, parentId, onClose, onCreated }) {
  const [nodes, setNodes] = useState([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.getNodes(parentType, parentId);
      if (alive) setNodes(res.data || []);
    })();
    return () => (alive = false);
  }, [parentType, parentId]);

  const create = async () => {
    if (!source || !target || source === target) return alert("เลือก node ต้นทาง/ปลายทางให้ถูกต้อง");
    setSaving(true);
    try {
      await api.createEdge({
        source,
        target,
        parent_type: parentType,
        parent_id: parentId,
      });
      onCreated?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-40">
      <div className="bg-white rounded-xl shadow-xl p-5 w-[420px]">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Connect Edge</h3>
        </div>

        <label className="block text-sm mb-1">Source</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        >
          <option value="">-- choose source --</option>
          {nodes.map((n) => (
            <option value={n._id} key={n._id}>
              {n.name} ({n.model || n.brand || n.device_type})
            </option>
          ))}
        </select>

        <label className="block text-sm mb-1">Destination</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        >
          <option value="">-- choose destination --</option>
          {nodes.map((n) => (
            <option value={n._id} key={n._id}>
              {n.name} ({n.model || n.brand || n.device_type})
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-100" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
            onClick={create}
            disabled={saving}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
