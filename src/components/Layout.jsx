import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useProject } from "../lib/project";
import { useT } from "../lib/i18n";
import { Icon, Spinner, ThemeToggle, Logo } from "./ui";
import MailingModal from "./MailingModal";
import InquiriesModal from "./InquiriesModal";
import { supabase } from "../lib/supabase";
import { useEffect } from "react";

function NoProject({ admin }) {
  const { t } = useT();
  return (
    <div className="content">
      <div className="card pad-lg" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🛰️</div>
        <h2 style={{ marginBottom: 10 }}>{t("noproject.title")}</h2>
        <p className="muted">{admin ? "Utwórz projekt i klienta w zakładce Administracja." : t("noproject.text")}</p>
        {admin && <NavLink to="/panel/admin" className="btn primary" style={{ marginTop: 16 }}>{t("tab.admin")}</NavLink>}
      </div>
    </div>
  );
}

export default function Layout() {
  const { profile, role, signOut } = useAuth();
  const { projects, project, projectId, setProjectId, loading } = useProject();
  const { t, lang, setLang } = useT();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mailingOpen, setMailingOpen] = useState(false);
  const [inquiriesOpen, setInquiriesOpen] = useState(false);
  const [unreadInq, setUnreadInq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled((window.scrollY || 0) > 8);
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);

  const isAdmin = role === "admin";

  // live count of new (unhandled) landing inquiries — badge on the "Zgłoszenia" button
  useEffect(() => {
    if (!isAdmin) return;
    const load = () => supabase.from("contact_requests").select("*", { count: "exact", head: true }).eq("status", "new").then((r) => setUnreadInq(r.count || 0));
    load();
    const ch = supabase.channel("inq-badge").on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [isAdmin]);
  const allLinks = [
    { to: "/panel", end: true, icon: Icon.dashboard, label: t("tab.dashboard") },
    { to: "/panel/chatbot", icon: Icon.chat, label: t("tab.chatbot"), feat: "feat_chatbot" },
    { to: "/panel/leads", icon: Icon.leads, label: t("tab.leads"), feat: "feat_leads" },
    { to: "/panel/content", icon: Icon.content, label: t("tab.content"), feat: "feat_content" },
    { to: "/panel/knowledge", icon: Icon.knowledge, label: t("tab.knowledge") },
    { to: "/panel/settings", icon: Icon.settings, label: t("tab.settings") },
  ];
  // clients only see enabled function tabs; admins always see all (to manage)
  const links = allLinks.filter((l) => !l.feat || isAdmin || project?.[l.feat] !== false);
  if (isAdmin) links.push({ to: "/panel/analytics", icon: Icon.chart, label: t("tab.analytics") });
  if (isAdmin) links.push({ to: "/panel/admin", icon: Icon.admin, label: t("tab.admin") });

  const section = loc.pathname.replace("/panel", "").replace("/", "") || "dashboard";
  const needsProject = !["settings", "admin", "analytics"].includes(section);
  const showNoProject = needsProject && !loading && !project;

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)}>
        <div className="brand"><Logo height={30} /></div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
            <span className="ico"><l.icon /></span>{l.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <button className="navlink" onClick={signOut} style={{ border: 0, background: "none", textAlign: "left" }}>
          <span className="ico"><Icon.logout /></span>{t("nav.logout")}
        </button>
      </aside>

      <div className="main">
        <header className={"topbar" + (scrolled ? " scrolled" : "")}>
          <button className="btn ghost sm burger" onClick={() => setMenuOpen((o) => !o)}><Icon.menu /></button>

          {projects.length > 0 && (
            <div className="switcher">
              <label style={{ marginBottom: 3 }}>{isAdmin ? t("switch.viewAs") : t("switch.viewing")}</label>
              <select value={projectId || ""} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="spacer" />
          {isAdmin && (
            <>
              <button className="btn primary sm mailing-btn" onClick={() => setMailingOpen(true)}>
                <Icon.mail /> <span className="mailing-btn-label">Mailing</span>
              </button>
              <button className="btn sm mailing-btn-alt" onClick={() => setInquiriesOpen(true)}>
                <Icon.inbox /> <span className="mailing-btn-label">{t("inq.title")}</span>
                {unreadInq > 0 && <span className="inq-badge">{unreadInq}</span>}
              </button>
            </>
          )}
          <ThemeToggle />
          <button className="btn ghost sm" onClick={() => setLang(lang === "pl" ? "en" : "pl")}>
            <Icon.globe /> {lang === "pl" ? "PL" : "EN"}
          </button>
          <div className="badge indigo">{profile?.full_name || profile?.email}</div>
          {isAdmin && <div className="badge">{t("admin.role.admin")}</div>}
        </header>

        {isAdmin && mailingOpen && <MailingModal onClose={() => setMailingOpen(false)} />}
        {isAdmin && inquiriesOpen && <InquiriesModal onClose={() => setInquiriesOpen(false)} />}

        {loading ? <div className="center-screen"><Spinner /></div>
          : showNoProject ? <NoProject admin={isAdmin} />
          : <div key={projectId || "none"} className="route-wrap"><Outlet /></div>}
      </div>
    </div>
  );
}
