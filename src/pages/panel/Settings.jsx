import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useProject } from "../../lib/project";
import { useT } from "../../lib/i18n";
import { Field, Modal, useToast, Icon, PageHead } from "../../components/ui";

const ACCOUNT_KINDS = ["linkedin", "email", "instagram", "facebook", "whatsapp", "google", "other"];

function EmailSettings() {
  const { project } = useProject();
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ from_name: "", from_email: "", resend_api_key: "", has_key: false });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!project) return;
    supabase.from("email_settings").select("from_name,from_email,resend_api_key").eq("project_id", project.id).maybeSingle()
      .then(({ data }) => setF({ from_name: data?.from_name || "", from_email: data?.from_email || "", resend_api_key: "", has_key: !!data?.resend_api_key }));
  }, [project]);
  if (!project) return null;
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const save = async () => {
    setBusy(true);
    const patch = { project_id: project.id, from_name: f.from_name, from_email: f.from_email };
    if (f.resend_api_key) patch.resend_api_key = f.resend_api_key;
    const { error } = await supabase.from("email_settings").upsert(patch, { onConflict: "project_id" });
    setBusy(false);
    if (error) toast(error.message, "err"); else { toast(t("common.save")); if (f.resend_api_key) setF((c) => ({ ...c, resend_api_key: "", has_key: true })); }
  };
  return (
    <div className="card">
      <div className="section-title">{t("email.title")}</div>
      <p className="small muted" style={{ marginBottom: 12 }}>{t("email.hint")}</p>
      <div className="row">
        <div style={{ flex: 1 }}><Field label={t("email.fromName")}><input value={f.from_name} onChange={(e) => set("from_name", e.target.value)} placeholder="Firma Klienta" /></Field></div>
        <div style={{ flex: 1 }}><Field label={t("email.fromEmail")}><input value={f.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="kontakt@twojadomena.pl" /></Field></div>
      </div>
      <Field label={t("email.apiKey")} hint={f.has_key ? t("email.keySet") : t("email.keyHint")}>
        <input type="password" value={f.resend_api_key} onChange={(e) => set("resend_api_key", e.target.value)} placeholder={f.has_key ? "•••••••• (puste = bez zmian)" : "re_..."} />
      </Field>
      <button className="btn primary" onClick={save} disabled={busy}>{t("common.save")}</button>
    </div>
  );
}

function ProjectAccounts() {
  const { project } = useProject();
  const { user } = useAuth();
  const { t } = useT();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => { if (project) supabase.from("project_accounts").select("*").eq("project_id", project.id).order("created_at").then((r) => setItems(r.data || [])); };
  useEffect(() => { load(); }, [project]);
  if (!project) return null;

  const save = async (a) => {
    const secret = {};
    if (a.password) secret.password = a.password;
    if (a.token) secret.token = a.token;
    const row = { project_id: project.id, kind: a.kind, label: a.label, username: a.username, status: a.status || "active" };
    if (a.id) {
      const patch = { ...row };
      if (a.password || a.token) patch.secret = { ...(a.secret || {}), ...secret };
      await supabase.from("project_accounts").update(patch).eq("id", a.id);
    } else {
      await supabase.from("project_accounts").insert({ ...row, secret, created_by: user.id });
    }
    setEdit(null); load(); toast(t("common.save"));
  };
  const del = async (id) => { if (confirm(t("admin.confirmDelete"))) { await supabase.from("project_accounts").delete().eq("id", id); load(); } };

  return (
    <div className="card">
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>{t("acc.title")} — {project.name}</div>
        <button className="btn primary sm" onClick={() => setEdit({ kind: "linkedin", label: "", username: "", password: "", token: "" })}><Icon.plus /> {t("acc.add")}</button>
      </div>
      <p className="small muted" style={{ marginBottom: 12 }}>{t("acc.hint")}</p>
      {items.length === 0 ? <p className="muted small">{t("common.none")}</p> : (
        <div className="grid" style={{ gap: 8 }}>
          {items.map((a) => (
            <div key={a.id} className="list-item">
              <span className="badge indigo">{a.kind}</span>
              <div style={{ flex: 1 }}><strong>{a.label}</strong>{a.username && <span className="muted small"> · {a.username}</span>}</div>
              <span className="badge">{a.status}</span>
              <button className="btn ghost sm" onClick={() => setEdit(a)}>{t("common.edit")}</button>
              <button className="btn ghost sm danger" onClick={() => del(a.id)}><Icon.trash /></button>
            </div>
          ))}
        </div>
      )}
      {edit && <AccountForm a={edit} onClose={() => setEdit(null)} onSave={save} t={t} />}
    </div>
  );
}

function AccountForm({ a, onClose, onSave, t }) {
  const [f, setF] = useState({ ...a });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={t("acc.add")} onClose={onClose}>
      <Field label={t("acc.kind")}>
        <select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
          {ACCOUNT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label={t("common.name")}><input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="np. LinkedIn firmowy" /></Field>
      <Field label={t("acc.login")}><input value={f.username || ""} onChange={(e) => set("username", e.target.value)} /></Field>
      <Field label={t("common.password")} hint={t("acc.secretHint")}><input type="password" value={f.password || ""} onChange={(e) => set("password", e.target.value)} placeholder={a.id ? "•••• (puste = bez zmian)" : ""} /></Field>
      <Field label={t("acc.token")} hint={t("common.optional")}><input value={f.token || ""} onChange={(e) => set("token", e.target.value)} /></Field>
      <button className="btn primary" onClick={() => onSave(f)} disabled={!f.label.trim()}>{t("common.save")}</button>
    </Modal>
  );
}

export default function Settings() {
  const { profile, reloadProfile } = useAuth();
  const { t, lang, setLang } = useT();
  const toast = useToast();
  const [pw, setPw] = useState("");

  const changeLang = async (l) => {
    setLang(l);
    if (profile) await supabase.from("profiles").update({ language: l }).eq("id", profile.id);
    reloadProfile?.();
  };
  const changePw = async () => {
    if (pw.length < 6) { toast("min. 6", "err"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast(error.message, "err"); else { toast(t("common.save")); setPw(""); }
  };

  return (
    <div className="content">
      <PageHead title={t("set.title")} sub={t("page.sub.settings")} />
      <div className="grid" style={{ maxWidth: 640 }}>
        <EmailSettings />
        <ProjectAccounts />
        <div className="card">
          <div className="section-title">{t("set.account")}</div>
          <div className="between"><span className="muted">{t("common.email")}</span><strong>{profile?.email}</strong></div>
          <div className="between" style={{ marginTop: 8 }}><span className="muted">{t("admin.role")}</span>
            <span className="badge indigo">{profile?.role === "admin" ? t("admin.role.admin") : t("admin.role.client")}</span></div>
        </div>

        <div className="card">
          <div className="section-title">{t("set.language")}</div>
          <div className="row">
            <button className={"btn " + (lang === "pl" ? "primary" : "")} onClick={() => changeLang("pl")}>Polski</button>
            <button className={"btn " + (lang === "en" ? "primary" : "")} onClick={() => changeLang("en")}>English</button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">{t("set.changePassword")}</div>
          <Field label={t("set.newPassword")}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <button className="btn primary" onClick={changePw} disabled={!pw}>{t("common.save")}</button>
        </div>
      </div>
    </div>
  );
}
