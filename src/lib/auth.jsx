import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    // IMPORTANT: do NOT await Supabase queries inside this callback — supabase-js v2 holds an
    // auth lock during it, and an awaited query here deadlocks the first load (blank page until
    // refresh). Just update the session synchronously; the profile loads in the effect below.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load the profile whenever the signed-in user changes — outside the auth callback, so no lock.
  const uid = session?.user?.id || null;
  useEffect(() => { loadProfile(uid); }, [uid, loadProfile]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const reloadProfile = useCallback(() => loadProfile(session?.user?.id), [session, loadProfile]);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user || null, profile,
      role: profile?.role || null, loading, signOut, reloadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
