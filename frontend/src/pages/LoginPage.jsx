import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NetOneLogo from "../assets/netone-logo.png";
import KMITLLogo from "../assets/kmitl-logo.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await api.login({ username, password });
      localStorage.clear();
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role",res.data.role);
      navigate("/");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center
                    bg-gradient-to-b from-red-200 via-red-300 to-red-400">

      <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">
        Network Management System
      </h1>
      <div className="bg-white rounded-xl shadow-xl p-8 w-[360px]">
        <div className="flex justify-center items-center gap-4 mb-6">
          <img src={NetOneLogo} className="h-10" />
          <img src={KMITLLogo} className="h-10" />
        </div>
      <form
        onSubmit={(e) => {
         e.preventDefault();
         handleLogin(); 
        }}
      >
        <input
          autoFocus
          type="text"
          placeholder="username"
          className="w-full border rounded-md px-4 py-2 mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="password"
          className="w-full border rounded-md px-4 py-2 mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md font-semibold"
        >
          Login
        </button>
      </form>
      </div>
    </div>
  );
}
