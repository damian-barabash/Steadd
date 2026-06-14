import { useEffect, useState, useCallback } from "react";
import { supabase, callFn } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { Field, Modal, Spinner, useToast, Icon, SkeletonList } from "../../components/ui";

function slugify(s) {
  return (s || "proj").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
}

export default function Admin() {
  const { t } = useT();
  const { user } = useAuth();
  const { reload: reloadProjects } = useProject();
  const toast = useToast();
  const [tab, setTab] = useState("clients");
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {kind, ...}

  const loadAll = useCallback(async () => {
    const [p, pr, m] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("project_members").select("*"),
    ]);
    setProfiles(p.data || []); setProjects(pr.data || []); setMembers(m.data || []); setLoading(false);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const clients = profiles.filter((p) => p.role === "client");
  const admins = profiles.filter((p) => p.role === "admin");
  const projsForUser = (uid) => members.filter((m) => m.user_id === uid).map((m) => projects.find((p) => p.id === m.project_id)).filter(Boolean);
  const clientsForProject = (pid) => members.filter((m) => m.project_id === pid).map((m) => profiles.find((p) => p.id === m.user_id)).filter(Boolean);

  const createUser = async (role, { email, full_name, password }) => {
    setBusy(true);
    try {
      await callFn("admin-users", { action: "create", email, full_name, password, role });
      toast(t("common.create")); setModal(null); await loadAll();
    } catch (e) { toast(String(e.message || e), "err"); }
    setBusy(false);
  };
  const delUser = async (id) => {
    if (!confirm(t("admin.confirmDelete"))) return;
    try { await callFn("admin-users", { action: "delete", user_id: id }); await loadAll(); toast(t("common.delete")); }
    catch (e) { toast(String(e.message || e), "err"); }
  };
  const resetPw = async (id) => {
    const np = prompt(t("set.newPassword"));
    if (!np) return;
    try { await callFn("admin-users", { action: "reset_password", user_id: id, password: np }); toast(t("common.save")); }
    catch (e) { toast(String(e.message || e), "err"); }
  };
  const createProject = async (name) => {
    const { error } = await supabase.from("projects").insert({ name, slug: slugify(name), created_by: user.id, status: "active" });
    if (error) toast(error.message, "err"); else { toast(t("common.create")); setModal(null); await loadAll(); reloadProjects(); }
  };
  const delProject = async (id) => {
    if (!confirm(t("admin.confirmDelete"))) return;
    await supabase.from("projects").delete().eq("id", id); await loadAll(); reloadProjects();
  };
  const toggleFeat = async (p, key) => {
    await supabase.from("projects").update({ [key]: !(p[key] !== false) }).eq("id", p.id);
    await loadAll(); reloadProjects();
  };
  const toggleMember = async (pid, uid, on) => {
    if (on) await supabase.from("project_members").insert({ project_id: pid, user_id: uid, added_by: user.id });
    else await supabase.from("project_members").delete().eq("project_id", pid).eq("user_id", uid);
    await loadAll(); reloadProjects();
  };

  return (
    <div className="content">
      <h1 className="page-title">{t("admin.title")}</h1>
      <div className="subtabs" style={{ marginTop: 14 }}>
        <button className={"subtab" + (tab === "clients" ? " active" : "")} onClick={() => setTab("clients")}>{t("admin.clients")}</button>
        <button className={"subtab" + (tab === "projects" ? " active" : "")} onClick={() => setTab("projects")}>{t("admin.projects")}</button>
        <button className={"subtab" + (tab === "admins" ? " active" : "")} onClick={() => setTab("admins")}>{t("admin.admins")}</button>
      </div>

      {loading && <SkeletonList n={5} h={52} />}

      {!loading && tab === "clients" && (
        <div>
          <div className="between" style={{ marginBottom: 14 }}>
            <span className="muted small">{clients.length}</span>
            <button className="btn primary sm" onClick={() => setModal({ kind: "user", role: "client" })}><Icon.plus /> {t("admin.newClient")}</button>
          </div>
          {clients.length === 0 ? <p className="muted small">{t("admin.noClients")}</p> : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="tbl">
                <thead><tr><th>{t("common.name")}</th><th>{t("common.email")}</th><th>{t("admin.projects")}</th><th></th></tr></thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.full_name || "—"}</strong></td>
                      <td className="muted">{c.email}</td>
                      <td>
                        <div className="row wrap" style={{ gap: 5 }}>
                          {projsForUser(c.id).map((p) => <span key={p.id} className="badge indigo">{p.name}</span>)}
                          <button className="btn ghost sm" onClick={() => setModal({ kind: "assign", user: c })}>{t("admin.linkProject")}</button>
                        </div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn ghost sm" onClick={() => resetPw(c.id)}>{t("admin.resetPw")}</button>
                          <button className="btn ghost sm danger" onClick={() => delUser(c.id)}><Icon.trash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "projects" && (
        <div>
          <div className="between" style={{ marginBottom: 14 }}>
            <span className="muted small">{projects.length}</span>
            <button className="btn primary sm" onClick={() => setModal({ kind: "project" })}><Icon.plus /> {t("admin.newProject")}</button>
          </div>
          {projects.length === 0 ? <p className="muted small">{t("admin.noProjects")}</p> : (
            <div className="grid">
              {projects.map((p) => (
                <div key={p.id} className="card">
                  <div className="between">
                    <div>
                      <strong>{p.name}</strong>
                      <div className="small muted mono">{p.slug}</div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn ghost sm" onClick={() => setModal({ kind: "members", project: p })}>{t("admin.members")} ({clientsForProject(p.id).length})</button>
                      <button className="btn ghost sm danger" onClick={() => delProject(p.id)}><Icon.trash /></button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="small muted" style={{ marginBottom: 6 }}>{t("admin.features")}</div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {[["feat_chatbot", t("tab.chatbot")], ["feat_leads", t("tab.leads")], ["feat_content", t("tab.content")]].map(([k, lbl]) => (
                        <button key={k} className={"badge " + (p[k] !== false ? "green" : "red")} style={{ cursor: "pointer" }} onClick={() => toggleFeat(p, k)}>
                          {p[k] !== false ? "✓ " : "✕ "}{lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "admins" && (
        <div>
          <div className="between" style={{ marginBottom: 14 }}>
            <span className="muted small">{admins.length}</span>
            <button className="btn primary sm" onClick={() => setModal({ kind: "user", role: "admin" })}><Icon.plus /> {t("admin.newAdmin")}</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="tbl">
              <thead><tr><th>{t("common.name")}</th><th>{t("common.email")}</th><th></th></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.full_name || "—"}</strong> {a.id === user.id && <span className="badge">you</span>}</td>
                    <td className="muted">{a.email}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn ghost sm" onClick={() => resetPw(a.id)}>{t("admin.resetPw")}</button>
                        {a.id !== user.id && <button className="btn ghost sm danger" onClick={() => delUser(a.id)}><Icon.trash /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- modals ---- */}
      {modal?.kind === "user" && <UserModal role={modal.role} busy={busy} onClose={() => setModal(null)} onSave={(d) => createUser(modal.role, d)} t={t} />}
      {modal?.kind === "project" && <ProjectModal onClose={() => setModal(null)} onSave={createProject} t={t} />}
      {modal?.kind === "members" && (
        <Modal title={`${t("admin.members")} — ${modal.project.name}`} onClose={() => setModal(null)}>
          {clients.length === 0 ? <p className="muted small">{t("admin.noClients")}</p> : clients.map((c) => {
            const on = members.some((m) => m.project_id === modal.project.id && m.user_id === c.id);
            return (
              <label key={c.id} className="list-item" style={{ marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={on} onChange={(e) => toggleMember(modal.project.id, c.id, e.target.checked)} />
                <div style={{ flex: 1 }}><strong>{c.full_name || c.email}</strong><div className="small muted">{c.email}</div></div>
              </label>
            );
          })}
        </Modal>
      )}
      {modal?.kind === "assign" && (
        <Modal title={`${t("admin.linkProject")} — ${modal.user.full_name || modal.user.email}`} onClose={() => setModal(null)}>
          {projects.length === 0 ? <p className="muted small">{t("admin.noProjects")}</p> : projects.map((p) => {
            const on = members.some((m) => m.project_id === p.id && m.user_id === modal.user.id);
            return (
              <label key={p.id} className="list-item" style={{ marginBottom: 8, cursor: "pointer" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={on} onChange={(e) => toggleMember(p.id, modal.user.id, e.target.checked)} />
                <div style={{ flex: 1 }}><strong>{p.name}</strong></div>
              </label>
            );
          })}
        </Modal>
      )}
    </div>
  );
}

function UserModal({ role, busy, onClose, onSave, t }) {
  const [f, setF] = useState({ email: "", full_name: "", password: "" });
  return (
    <Modal title={role === "admin" ? t("admin.newAdmin") : t("admin.newClient")} onClose={onClose}>
      <Field label={t("admin.fullName")}><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
      <Field label={t("common.email")}><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label={t("common.password")}><input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <button className="btn primary" onClick={() => onSave(f)} disabled={busy || !f.email || f.password.length < 6}>{busy ? <Spinner /> : t("common.create")}</button>
    </Modal>
  );
}

function ProjectModal({ onClose, onSave, t }) {
  const [name, setName] = useState("");
  return (
    <Modal title={t("admin.newProject")} onClose={onClose}>
      <Field label={t("admin.projectName")}><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <button className="btn primary" onClick={() => onSave(name)} disabled={!name.trim()}>{t("common.create")}</button>
    </Modal>
  );
}
