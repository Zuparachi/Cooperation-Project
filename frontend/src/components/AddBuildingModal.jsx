// src/components/AddBuildingModal.jsx
import { useState } from "react";
import { api } from "../api/client";

export default function AddBuildingModal({ siteId, onClose, onCreated }) {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return alert("Please enter a building name");
    try {
      await api.createBuilding(siteId, { name });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Error adding building:", err);
      alert("Error adding building");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-[400px]">
        <h2 className="text-xl font-semibold mb-4">Add Building</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Building Name"
          className="w-full border px-3 py-2 rounded"
        />
        <div className="flex justify-end mt-5 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
