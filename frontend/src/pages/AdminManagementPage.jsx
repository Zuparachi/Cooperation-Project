import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function AdminManagementPage() {
  const navigate = useNavigate();
  const roleFromStorage = localStorage.getItem("role");

  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleFromStorage !== "admin") return;
    fetchUsers();
  }, [roleFromStorage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("fetchUsers error:", err);
      alert(err?.response?.data?.detail || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!username.trim() || !password.trim()) {
      alert("Please enter username and password");
      return;
    }

    try {
      await api.createUser({
        username: username.trim(),
        password: password.trim(),
        role,
      });

      setUsername("");
      setPassword("");
      setRole("user");
      fetchUsers();
    } catch (err) {
      console.error("createUser error:", err);
      alert(err?.response?.data?.detail || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId, targetUsername) => {
    const currentUsername = localStorage.getItem("username");

    if (targetUsername === currentUsername) {
      alert("You cannot delete your current login user");
      return;
    }

    if (!confirm(`Delete user "${targetUsername}" ?`)) return;

    try {
      await api.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      console.error("deleteUser error:", err);
      alert(err?.response?.data?.detail || "Failed to delete user");
    }
  };

  if (roleFromStorage !== "admin") {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-medium"
        >
          ← Back
        </button>

        <div className="text-red-500 font-semibold">Access denied</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-medium"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-gray-800">Admin Management</h1>
      </div>

      {/* Add User Form */}
      <div className="bg-white border rounded-xl shadow-sm p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add User</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={handleAddUser}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium"
          >
            Add User
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Password will be hashed with Argon2 before saving into database.
        </p>
      </div>

      {/* User List */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">User List</h2>

        {loading ? (
          <div className="text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-gray-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Username</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.role}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}