import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { Field, Modal, useToast, Icon, SkeletonList } from "../../components/ui";

function Business({ project, reload }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({
    business_name: project.business_name || "", industry: project.industry || "",
    website: project.website || "", description: project.description || "",
    brand_tone: project.brand_tone || "", audience: project.audience || "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("projects").update(f).eq("id", project.id);
    setBusy(false);
    if (error) toast(error.message, "err"); else { toast(t("kb.saved")); reload?.(); }
  };
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="card pad-lg" style={{ maxWidth: 640 }}>
      <div className="row">
        <div style={{ flex: 1 }}><Field label={t("kb.businessName")}><input value={f.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label={t("kb.industry")}><input value={f.industry} onChange={(e) => set("industry", e.target.value)} /></Field></div>
      </div>
      <Field label={t("kb.website")}><input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
      <Field label={t("kb.description")}><textarea value={f.description} onChange={(e) => set("description", e.target.value)} style={{ minHeight: 90 }} /></Field>
      <div className="row">
        <div style={{ flex: 1 }}><Field label={t("kb.tone")}><input value={f.brand_tone} onChange={(e) => set("brand_tone", e.target.value)} placeholder="np. ciepły, profesjonalny" /></Field></div>
        <div style={{ flex: 1 }}><Field label={t("kb.audience")}><input value={f.audience} onChange={(e) => set("audience", e.target.value)} /></Field></div>
      </div>
      <button className="btn primary" onClick={save} disabled={busy}>{t("common.save")}</button>
    </div>
  );
}

function Docs({ project }) {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const load = () => supabase.from("knowledge_docs").select("id,title,content,created_at,embedding").eq("project_id", project.id).order("created_at", { ascending: false }).then((r) => { setItems(r.data || []); setLoading(false); });
  useEffect(() => { load(); }, [project.id]);

  const add = async () => {
    const { data, error } = await supabase.from("knowledge_docs")
      .insert({ project_id: project.id, title: f.title, content: f.content, source: "manual", created_by: user.id })
      .select().single();
    if (error) { toast(error.message, "err"); return; }
    // queue embedding (RAG) — the Mac worker picks it up
    await supabase.from("jobs").insert({
      project_id: project.id, type: "embed_doc", payload: { doc_id: data.id }, ref_table: "knowledge_docs", ref_id: data.id, created_by: user.id,
    });
    setF({ title: "", content: "" }); setOpen(false); load(); toast(t("kb.saved"));
  };
  const del = async (id) => { if (confirm(t("admin.confirmDelete"))) { await supabase.from("knowledge_docs").delete().eq("id", id); load(); } };

  return (
    <div>
      <div className="between" style={{ marginBottom: 14 }}>
        <p className="small muted">{t("kb.noDocs")}</p>
        <button className="btn primary sm" onClick={() => setOpen(true)}><Icon.plus /> {t("kb.addDoc")}</button>
      </div>
      {loading && <SkeletonList n={3} h={70} />}
      <div className="grid">
        {!loading && items.map((d) => (
          <div key={d.id} className="card">
            <div className="between">
              <strong>{d.title}</strong>
              <button className="btn ghost sm danger" onClick={() => del(d.id)}><Icon.trash /></button>
            </div>
            <p className="small muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{d.content.slice(0, 300)}{d.content.length > 300 ? "…" : ""}</p>
          </div>
        ))}
      </div>
      {open && (
        <Modal title={t("kb.addDoc")} onClose={() => setOpen(false)}>
          <Field label={t("kb.docTitle")}><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t("kb.docContent")}><textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} style={{ minHeight: 160 }} /></Field>
          <button className="btn primary" onClick={add} disabled={!f.title.trim() || !f.content.trim()}>{t("common.add")}</button>
        </Modal>
      )}
    </div>
  );
}

export default function Knowledge() {
  const { project, reload } = useProject();
  const { t } = useT();
  const [tab, setTab] = useState("business");
  if (!project) return null;
  return (
    <div className="content">
      <h1 className="page-title">{t("kb.title")}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>{project.name}</p>
      <div className="subtabs">
        <button className={"subtab" + (tab === "business" ? " active" : "")} onClick={() => setTab("business")}>{t("kb.business")}</button>
        <button className={"subtab" + (tab === "docs" ? " active" : "")} onClick={() => setTab("docs")}>{t("kb.docs")}</button>
      </div>
      {tab === "business" ? <Business project={project} reload={reload} /> : <Docs project={project} />}
    </div>
  );
}
