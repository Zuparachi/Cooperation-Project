"use client";

import { useState } from "react";
import { api } from "../api/client";
import { X } from "lucide-react";

export default function AddNodeModal({
  parentType,
  parentId,
  onClose,
  onCreated,
}) {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [subnet, setSubnet] = useState("");

  const [deviceType, setDeviceType] = useState("Router");
  const [brand, setBrand] = useState("Cisco");
  const [model, setModel] = useState("C1111-4P");

  /* =========================
     Options Configuration
     ========================= */

  const deviceOptions = ["Router", "Switch", "AP", "PC"];

  const brandOptionsByDevice = {
    Router: ["Cisco", "Huawei"],
    Switch: ["Cisco", "Huawei"],
    AP: ["Cisco", "Huawei"],
    PC: ["PC"],
  };

  const modelOptions = {
    Router: {
      Cisco: ["C1111-4P", "C1111-8P", "C2811", "ISR 4321", "ISR4331", "ISR 4351", "C2811", "C2911"],
      Huawei: ["AR2200", "AR1220", "AR1220E", "AR2220"],
    },
    Switch: {
      Cisco: ["C2960", "C2960L", "C9200L", "C9300", "C9500"],
      Huawei: ["S5720", "S5735", "CE6857E", "S5700", "CE12800", "S310-24T4S"],
    },
    AP: {
      Cisco: ["Aironet 1830", "Aironet 1850", "Catalyst 9115", "Catalyst 9120"],
      Huawei: ["AP4050DN", "AP6050DN", "AP6050DN"],
    },
    PC: {
      PC: ["Desktop", "Laptop", "Generic-PC"],
    },
  };

  /* =========================
     Handlers
     ========================= */

  const handleDeviceTypeChange = (dt) => {
    setDeviceType(dt);

    const brands = brandOptionsByDevice[dt];
    const firstBrand = brands[0];
    setBrand(firstBrand);

    const firstModel = modelOptions[dt][firstBrand][0];
    setModel(firstModel);
  };

  const handleBrandChange = (b) => {
    setBrand(b);
    setModel(modelOptions[deviceType][b][0]);
  };

  const handleAdd = async () => {
    if (!name || !ip || !subnet || !deviceType || !brand || !model) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await api.createNode({
        name,
        ip,
        subnet,
        device_type: deviceType,
        brand,
        model,
        parent_type: parentType,
        parent_id: parentId,
        x: 200,
        y: 150,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create node:", err);
      alert("Error adding node.");
    }
  };

  /* =========================
     UI
     ========================= */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-[420px] p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
        >
          <X />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Add Node</h2>

        <div className="space-y-4">
          {/* Hostname */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Hostname</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Router1"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* IP */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">IP Address</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 192.168.1.1"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Subnet */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Subnet Mask</label>
            <input
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              placeholder="e.g. 255.255.255.0"
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Device Type */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Device Type
            </label>
            <select
              value={deviceType}
              onChange={(e) => handleDeviceTypeChange(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white focus:ring-2 focus:ring-orange-500"
            >
              {deviceOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Brand</label>
            <select
              value={brand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white focus:ring-2 focus:ring-orange-500"
            >
              {brandOptionsByDevice[deviceType].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white focus:ring-2 focus:ring-orange-500"
            >
              {modelOptions[deviceType][brand].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white font-medium"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
