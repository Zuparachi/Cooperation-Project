import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../api/client";

export default function AddSiteModal({ onClose, onCreated }) {
  const [site_name, setSiteName] = useState("");
  const [date_modify, setDateModify] = useState("");
  const [job_number, setJobNumber] = useState("");

  const handleAdd = async () => {
    if (!site_name || !job_number || !date_modify) {
      alert("Please fill all fields");
      return;
    }
    try {
      await api.createSite({ site_name, job_number, date_modify });
      onCreated();
      onClose();
    } catch (err) {
      console.error("Error creating site:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-gray-100 p-6 rounded-md w-[500px] relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
        >
          <X />
        </button>
        <h2 className="text-lg font-semibold mb-4">Create New Site</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Site Name"
            value={site_name}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full border rounded-md px-3 py-2 focus:outline-none"
          />
          <div className="flex space-x-3">
            <input
              type="date"
              value={date_modify}
              onChange={(e) => setDateModify(e.target.value)}
              className="w-1/2 border rounded-md px-3 py-2"
            />
            <input
              type="text"
              placeholder="Job Number"
              value={job_number}
              onChange={(e) => setJobNumber(e.target.value)}
              className="w-1/2 border rounded-md px-3 py-2"
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-md mt-2"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
