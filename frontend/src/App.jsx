// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import SiteTopologyPage from "./pages/SiteTopologyPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminManagementPage from "./pages/AdminManagementPage"
import IdleLogoutHandler from "./components/IdleLogoutHandler";

function App() {
  return (
    <Router>
      <IdleLogoutHandler timeout={3 * 60 * 1000} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute> <MainPage /> </ProtectedRoute>} />
        <Route path="/site/:siteId" element={<ProtectedRoute><SiteTopologyPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin-management" element={<ProtectedRoute><AdminManagementPage /></ProtectedRoute>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}
export default App;
