import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // ---------- Login ----------
  login: (body) => apiClient.post("/login", body),

  // ---------- Admin ----------
  getUsers: () => apiClient.get("/admin/users"),
  createUser: (body) => apiClient.post("/admin/users", body),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),

  // ---------- Sites ----------
  getSites: () => apiClient.get("/sites"),
  createSite: (body) => apiClient.post("/sites", body),
  getSiteById: (id) => apiClient.get(`/sites/${id}`),
  deleteSite: (id) => apiClient.delete(`/sites/${id}`),

  // ---------- Buildings ----------
  getBuildings: (siteId) =>
    apiClient.get(`/sites/${siteId}/buildings`),

  createBuilding: (siteId, body) =>
    apiClient.post(`/sites/${siteId}/buildings`, body),

  deleteBuilding: (buildingId) =>
    apiClient.delete(`/buildings/${buildingId}`),

  // ---------- Floors ----------
  getFloors: (buildingId) =>
    apiClient.get(`/buildings/${buildingId}/floors`),

  createFloor: (buildingId, body) =>
    apiClient.post(`/buildings/${buildingId}/floors`, body),

  deleteFloor: (floorId) =>
    apiClient.delete(`/floors/${floorId}`),

  // ---------- Nodes ----------
  // parent_type = "site" | "building" | "floor"
  getNodes: (parent_type, parent_id) =>
    apiClient.get("/nodes", { params: { parent_type, parent_id } }),

  createNode: (body) =>
    apiClient.post("/nodes", body),

  deleteNode: (id) =>
    apiClient.delete(`/nodes/${id}`),

  updateNodePosition: (id, pos) =>
    apiClient.patch(`/nodes/${id}/position`, pos),

  // ---------- Dashboard ----------
  getDashboardSummary: () => apiClient.get("/dashboard/summary"),
  getDashboardDeviceStatus: () => apiClient.get("/dashboard/device-status"),
  getSiteDashboard: () => apiClient.get("/dashboard/site-summary"),

  //  touch ตอนเข้า Site
  touchSite: (siteId) => apiClient.post(`/sites/${siteId}/touch`),

  // ---------- Edges ----------
  getEdges: (parent_type, parent_id) =>
    apiClient.get("/edges", { params: { parent_type, parent_id } }),

  createEdge: (body) =>
    apiClient.post("/edges", body),

  deleteEdge: (id) =>
    apiClient.delete(`/edges/${id}`),

  deleteEdgesOfNode: (nodeId) =>
    apiClient.delete(`/edges/node/${nodeId}`),

  testPacketPath: (sourceId, targetId, parent_type, parent_id) =>
    apiClient.get("/packet-test", {
      params: {
        source_id: sourceId,
        target_id: targetId,
        parent_type,
        parent_id,
      },
    }),
};
