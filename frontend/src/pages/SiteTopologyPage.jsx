// src/pages/SiteTopologyPage.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  applyNodeChanges,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";

import NavBar from "../components/NavBar";
import { api } from "../api/client";
import { Plus, ChevronLeft, Trash2, Monitor, Router as RIcon, Server, Cpu, MousePointer, Link2, Trash } from "lucide-react";

import AddNodeModal from "../components/AddNodeModal";
import AddBuildingModal from "../components/AddBuildingModal";
import AddFloorModal from "../components/AddFloorModal";
import ConnectEdgeModal from "../components/ConnectEdgeModal";


// ---------- Custom node ----------
function DeviceNode({ data, selected }) {
  let Icon = Cpu, color = "border-gray-300 bg-white";
  const t = (data.device_type || "").toLowerCase();
  if (t === "router") { Icon = RIcon; color = "border-red-300 bg-red-50"; }
  else if (t === "switch") { Icon = Server; color = "border-blue-300 bg-blue-50"; }
  else if (t === "pc") { Icon = Monitor; color = "border-green-300 bg-green-50"; }

  const handleStyle = { background: "#333", width: 10, height: 10, borderRadius: "50%" };

  return (
    <div
      className={`relative rounded border ${color} shadow-sm text-center px-3 py-2`}
      style={{ width: 160 }}
      title={`Hostname: ${data.name}\nIP: ${data.ip}\nSubnet: ${data.subnet}\nBrand: ${data.brand}\nModel: ${data.model}`}
    >
      {/* 4 ด้าน */}
      <Handle type="source" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="target" position={Position.Right} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Left} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div className={`flex justify-center mb-1 ${selected ? "opacity-100" : "opacity-80"}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="font-semibold">{data.name}</div>
      <div className="text-xs text-gray-500">{data.model || data.brand}</div>
    </div>
  );
}
const nodeTypes = { deviceNode: DeviceNode };

export default function SiteTopologyPage() {
  const { siteId } = useParams();

  // hierarchy
  const [level, setLevel] = useState("site"); // 'site' | 'building' | 'floor'
  const [parentId, setParentId] = useState(siteId);
  const [site, setSite] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // rf states
  const [rfNodes, setRfNodes] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");

  // modals
  const [showMenu, setShowMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [menuNodeId, setMenuNodeId] = useState(null);

  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showConnectEdge, setShowConnectEdge] = useState(false);

  const [testMode, setTestMode] = useState(false);
  const [testSource, setTestSource] = useState(null); // React Flow node object
  const [testTarget, setTestTarget] = useState(null);
  const [testResult, setTestResult] = useState(null); // เก็บ response จาก backend

  // touch 
  const touchedRef = useRef(false);

  // ---------- data loading ----------
  const hydrateFlow = (nodes = [], edges = []) => {
    setRfNodes(
      nodes.map((n) => ({
        id: n._id,
        type: "deviceNode",
        position: { x: n.x ?? Math.random() * 600, y: n.y ?? Math.random() * 300 },
        data: { ...n },
      }))
    );
    setRfEdges(
      edges.map((e) => ({
        id: e._id,
        source: e.source,
        target: e.target,
        type: "straight",
        style: { stroke: "#444", strokeWidth: 2 },
      }))
    );
  };

  const loadContext = useCallback(async () => {
    if (level === "site") {
      const [s, b, n, e] = await Promise.all([
        api.getSiteById(siteId),
        api.getBuildings(siteId),
        api.getNodes("site", siteId),
        api.getEdges("site", siteId),
      ]);
      setSite(s.data);
      setBuildings(b.data || []);
      setSelectedBuilding(null);
      setSelectedFloor(null);
      hydrateFlow(n.data, e.data);
      return;
    }
    if (level === "building") {
      const [f, n, e] = await Promise.all([
        api.getFloors(parentId),
        api.getNodes("building", parentId),
        api.getEdges("building", parentId),
      ]);
      setFloors(f.data || []);
      hydrateFlow(n.data, e.data);
      return;
    }
    if (level === "floor") {
      const [n, e] = await Promise.all([
        api.getNodes("floor", parentId),
        api.getEdges("floor", parentId),
      ]);
      hydrateFlow(n.data, e.data);
    }
  }, [level, parentId, siteId]);

  useEffect(() => { loadContext(); }, [loadContext]);

  useEffect(() => {
    const touch = async () => {
      if (touchedRef.current) return;
      touchedRef.current = true;

      try {
        await api.touchSite(siteId);
      } catch (err) {
        console.error("touchSite error:", err?.response?.status, err);
      }
    };

    if (siteId) touch();
  }, [siteId]);

  useEffect(() => {
    api.touchSite(siteId).catch((err) => console.error("touchSite error:", err));
  }, [siteId]);

  // persist position
  const onNodesChangePersist = useCallback(
    async (changes) => {
      // อัปเดตตำแหน่ง/สถานะ node ใน ReactFlow
      setRfNodes((nds) => applyNodeChanges(changes, nds));

      // เซฟตำแหน่งลง backend เฉพาะตอน drag เสร็จ
      for (const ch of changes) {
        if (ch.type === "position" && ch.dragging === false) {
          const n = rfNodes.find((x) => x.id === ch.id);
          if (n) {
            await api.updateNodePosition(ch.id, {
              x: n.position.x,
              y: n.position.y,
            });
          }
        }
      }
    },
    [rfNodes]
  );

  // connect by drag (ยังคงรองรับไว้ เผื่อใช้)
  const onConnect = useCallback(
    async (params) => {
      const body = { source: params.source, target: params.target, parent_type: level, parent_id: parentId };
      const res = await api.createEdge(body);
      setRfEdges((eds) => addEdge({ ...params, id: res.data._id, type: "straight", style: { stroke: "#444", strokeWidth: 2 } }, eds));
    },
    [level, parentId]
  );

  // context menu on right click node
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault();
    setMenuNodeId(node.id);
    setContextPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const enterBuilding = (b) => { setSelectedBuilding(b); setLevel("building"); setParentId(b._id); };
  const enterFloor = (f) => { setSelectedFloor(f); setLevel("floor"); setParentId(f._id); };
  const back = () => {
    if (level === "floor") { setLevel("building"); setParentId(selectedBuilding._id); }
    else if (level === "building") { setLevel("site"); setParentId(siteId); }
  };

  const deleteNode = async (id) => { if (!confirm("Delete this node?")) return; await api.deleteNode(id); loadContext(); };
  const deleteEdge = async (edgeId) => { if (!edgeId) return alert("ยังไม่ได้เลือกเส้น"); if (!confirm("Delete this edge?")) return; await api.deleteEdge(edgeId); loadContext(); };
  // Disabled packet test in server deployment//

  // const sendTestPacket = useCallback(async () => {
  //   if (!testSource || !testTarget) {
  //     alert("กรุณาเลือก Source และ Target Node ก่อน (คลิกขวา → Set as Source/Target)");
  //     return;
  //   }

  //   try {
  //     const res = await api.testPacketPath(
  //       testSource.id,
  //       testTarget.id,
  //       level,
  //       parentId
  //     );

  //     setTestResult(res.data);

  //     // highlight edges ตาม path ที่ backend ส่งมา (optional)
  //     const pathIds = res.data.path_node_ids || [];
  //     setRfEdges((eds) => {
  //       const pathEdgeSet = new Set();
  //       for (let i = 1; i < pathIds.length; i++) {
  //         const a = pathIds[i - 1];
  //         const b = pathIds[i];
  //         eds.forEach((e) => {
  //           if (
  //             (e.source === a && e.target === b) ||
  //             (e.source === b && e.target === a)
  //           ) {
  //             pathEdgeSet.add(e.id);
  //           }
  //         });
  //       }

  //       return eds.map((e) => ({
  //         ...e,
  //         style: {
  //           ...e.style,
  //           stroke: pathEdgeSet.has(e.id) ? "#f97316" : "#94a3b8",
  //           strokeWidth: pathEdgeSet.has(e.id) ? 3 : 2,
  //         },
  //       }));
  //     });
  //   } catch (err) {
  //     console.error("sendTestPacket error", err);
  //     alert("เกิดข้อผิดพลาดระหว่างทดสอบ packet");
  //   }
  // }, [testSource, testTarget, level, parentId, setRfEdges]);

  const connectSSH = useCallback(() => {
    if (!menuNodeId) {
      alert("ไม่พบ node ที่เลือก");
      return;
    }

    // หา node จาก rfNodes ตาม id ที่คลิกเมนู
    const node = rfNodes.find((n) => n.id === menuNodeId);
    if (!node) {
      alert("ไม่พบข้อมูล node ใน topology");
      return;
    }

    const host = node.data.ip;
    if (!host) {
      alert("Node นี้ยังไม่มี IP");
      return;
    }

    // ถ้ามี plan จะเก็บ username/port ต่อในอนาคตค่อยมาเพิ่ม
    const username = "admin";
    const port = 22;

    // SecureCRT URL scheme
    const url = `ssh://${username}@${host}:${port}`;

    // ให้ browser เรียก SecureCRT
    window.location.href = url;

    // ปิดเมนู
    setShowMenu(false);
  }, [menuNodeId, rfNodes]);
  // UI
  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setShowMenu(false)}>
      <NavBar />

      <div className="max-w-[1400px] mx-auto py-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {level !== "site" && (
              <button onClick={back} className="flex items-center gap-1 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
              {/* <button
                onClick={() => {
                  if (!testMode) {
                    setTestMode(true);
                    setTestSource(null);
                    setTestTarget(null);
                    setTestResult(null);
                  } else {
                    setTestMode(false);
                    setTestSource(null);
                    setTestTarget(null);
                    setTestResult(null);
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  testMode
                    ? "bg-emerald-500 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {testMode ? "Exit Test Packet" : "Test Packet Mode"}
              </button>            */}
            <h1 className="text-xl font-semibold">
              {level === "site" && `Site: ${site?.site_name ?? ""}`}
              {level === "building" && ` ${selectedBuilding?.name}`}
              {level === "floor" && ` ${selectedFloor?.name}`}
            </h1>
          </div>

          {/* Add dropdown */}
          <div className="relative">
            <button onClick={() => setShowAddNode(true)} className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md shadow-md">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Left rail */}
          <div className="w-[300px] bg-white rounded-md border shadow-sm p-3">
            <div className="font-semibold text-gray-700 mb-2"> Buildings & Floors</div>

            {level === "site" && (
              <div className="space-y-2">
                {buildings.map((b) => (
                  <div key={b._id} className="border rounded p-2">
                    <div className="flex items-center justify-between">
                      <button onClick={() => enterBuilding(b)} className="text-left font-medium hover:underline">{b.name}</button>
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer" onClick={async () => { if (!confirm("Delete building?")) return; await api.deleteBuilding(b._id); loadContext(); }} />
                    </div>
                    <div className="text-xs text-gray-500">{b.floor_count} floors • {b.node_count} nodes</div>
                  </div>
                ))}
                {buildings.length === 0 && <div className="text-gray-400 italic">No buildings yet.</div>}
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 border rounded" onClick={() => setShowAddBuilding(true)}>+ Building</button>
                  <button className="px-2 py-1 border rounded" onClick={() => setShowAddFloor(true)}>+ Floor</button>
                </div>
              </div>
            )}

            {level === "building" && (
              <div className="space-y-2">
                <div className="text-sm text-gray-500 mb-1">Building: {selectedBuilding?.name}</div>
                {floors.map((f) => (
                  <div key={f._id} className="flex items-center justify-between border rounded p-2">
                    <button className="text-left hover:underline" onClick={() => enterFloor(f)}>{f.name}</button>
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer" onClick={async () => { if (!confirm("Delete floor?")) return; await api.deleteFloor(f._id); loadContext(); }} />
                  </div>
                ))}
                <div className="mt-2">
                  <button className="px-2 py-1 border rounded" onClick={() => setShowAddFloor(true)}>+ Floor</button>
                </div>
              </div>
            )}

            {level === "floor" && (
              <div className="text-sm text-gray-500">
                Building: {selectedBuilding?.name}<br />Floor: {selectedFloor?.name}
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 h-[72vh] bg-white border rounded shadow-sm">
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChangePersist}
              onNodeClick={(e, node) => {setSelectedNode(node);}}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
              fitView
              defaultEdgeOptions={{ type: "straight", style: { stroke: "#444", strokeWidth: 2 } }}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={16} size={1} />
            </ReactFlow>
          </div>
         
        </div>
      </div>
      

      {/* Context menu */}


      {showMenu && (
        <div
          className="fixed z-40 bg-white rounded-md shadow-lg border w-56 py-2"
          style={{ left: contextPos.x, top: contextPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
          onClick={connectSSH}
          >
            <MousePointer className="w-4 h-4" /> Connect SSH
          </button>
          <button
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
            onClick={() => { setShowConnectEdge(true); setShowMenu(false); }}
          >
            <Link2 className="w-4 h-4" /> Connect Edge…
          </button>
          <button
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
            onClick={() => { deleteNode(menuNodeId); setShowMenu(false); }}
          >
            <Trash className="w-4 h-4" /> Delete Node
          </button>
          <button
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
            onClick={() => { deleteEdge(selectedEdgeId); setShowMenu(false); }}
          >
            <Trash className="w-4 h-4" /> Delete Edge {selectedEdgeId ? `(${selectedEdgeId.slice(0,6)}…)` : ""}
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddNode && (
        <AddNodeModal
          parentType={level}
          parentId={parentId}
          onClose={() => setShowAddNode(false)}
          onCreated={() => loadContext()}
        />
      )}
      {showAddBuilding && (
        <AddBuildingModal siteId={siteId} onClose={() => setShowAddBuilding(false)} onCreated={() => loadContext()} />
      )}
      {showAddFloor && (
        <AddFloorModal
          buildingId={level === "building" ? parentId : selectedBuilding?._id}
          onClose={() => setShowAddFloor(false)}
          onCreated={() => loadContext()}
        />
      )}
      {showConnectEdge && (
        <ConnectEdgeModal
          parentType={level}
          parentId={parentId}
          onClose={() => setShowConnectEdge(false)}
          onCreated={() => loadContext()}
        />
      )}
    </div>
  );
}
