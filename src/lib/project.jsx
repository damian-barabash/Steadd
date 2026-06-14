import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

const ProjectContext = createContext(null);

// Loads the set of projects the current user can see (RLS does the filtering:
// admins see all, clients see their linked projects). `project` is the active one;
// the top-bar switcher changes it — which is the admin "view as client" mechanism.
export function ProjectProvider({ children }) {
  const { session, role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectIdState] = useState(() => localStorage.getItem("steadd_project") || null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) { setProjects([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: true });
    const list = data || [];
    setProjects(list);
    setProjectIdState((cur) => {
      if (cur && list.some((p) => p.id === cur)) return cur;
      return list[0]?.id || null;
    });
    setLoading(false);
  }, [session]);

  useEffect(() => { reload(); }, [reload, role]);

  const setProjectId = useCallback((id) => {
    localStorage.setItem("steadd_project", id || "");
    setProjectIdState(id);
  }, []);

  const project = projects.find((p) => p.id === projectId) || null;

  return (
    <ProjectContext.Provider value={{ projects, project, projectId, setProjectId, loading, reload }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => {
  const c = useContext(ProjectContext);
  if (!c) throw new Error("useProject outside ProjectProvider");
  return c;
};
