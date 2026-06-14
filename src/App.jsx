import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import NeuroBg from "./components/NeuroBg";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/panel/Dashboard";
import Chatbot from "./pages/panel/Chatbot";
import Leads from "./pages/panel/Leads";
import Content from "./pages/panel/Content";
import Knowledge from "./pages/panel/Knowledge";
import Settings from "./pages/panel/Settings";
import Admin from "./pages/panel/Admin";

function Protected({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
    <NeuroBg />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/panel" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="leads" element={<Leads />} />
        <Route path="content" element={<Content />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
