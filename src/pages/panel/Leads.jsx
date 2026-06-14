import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { Field, Modal, Spinner, useToast, Icon, SkeletonList } from "../../components/ui";

const SOURCES = ["maps", "email", "linkedin", "facebook"];

const statusKind = {
  found: "", contacted: "indigo", awaiting_reply: "amber",
  replied_positive: "green", replied_negative: "red", done: "green",
  handed_off: "indigo", rejected: "red",
};

function Campaigns({ project, onRan }) {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ name: "", goal_prompt: "", region: "", outreach_template: "", channels: ["maps", "email"], daily_cap: 20, auto_daily: false });

  const load = () => supabase.from("lead_campaigns").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).then((r) => { setItems(r.data || []); setLoading(false); });
  useEffect(() => { load(); }, [project.id]);

  const create = async () => {
    const { data, error } = await supabase.from("lead_campaigns").insert({
      project_id: project.id, name: f.name, goal_prompt: f.goal_prompt, region: f.region,
      outreach_template: f.outreach_template, channels: f.channels, daily_cap: Number(f.daily_cap) || 20, auto_daily: f.auto_daily, created_by: user.id,
    }).select().single();
    if (error) { toast(error.message, "err"); return; }
    setOpen(false); setF({ name: "", goal_prompt: "", region: "", outreach_template: "", channels: ["maps", "email"], daily_cap: 20 });
    load(); run(data);
  };

  const run = async (c) => {
    await supabase.from("jobs").insert({
      project_id: project.id, type: "lead_find", status: "queued",
      payload: { campaign_id: c.id, goal_prompt: c.goal_prompt, region: c.region, channels: c.channels, cap: c.daily_cap },
      ref_table: "lead_campaigns", ref_id: c.id, created_by: user.id,
    });
    toast(t("leads.run") + " ✓");
    onRan?.();
  };

  const toggleCh = (s) => setF((x) => ({ ...x, channels: x.channels.includes(s) ? x.channels.filter((c) => c !== s) : [...x.channels, s] }));

  return (
    <div>
      <div className="card" style={{ marginBottom: 18, borderColor: "var(--border-2)" }}>
        <p className="small muted">{t("leads.flow")}</p>
      </div>
      <div className="between" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ margin: 0 }}>{t("leads.campaigns")}</div>
        <button className="btn primary sm" onClick={() => setOpen(true)}><Icon.plus /> {t("leads.newCampaign")}</button>
      </div>
      {loading ? <SkeletonList n={2} h={88} /> : items.length === 0 ? <p className="muted small">{t("common.none")}</p> : (
        <div className="grid">
          {items.map((c) => (
            <div key={c.id} className="card">
              <div className="between">
                <div>
                  <strong>{c.name}</strong>
                  <div className="small muted" style={{ marginTop: 4 }}>{c.goal_prompt}</div>
                  <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    {c.region && <span className="badge">{c.region}</span>}
                    {(c.channels || []).map((s) => <span key={s} className="badge indigo">{s}</span>)}
                    {c.auto_daily && <span className="badge green">{t("leads.autoDaily")}</span>}
                  </div>
                </div>
                <button className="btn sm" onClick={() => run(c)}><Icon.bolt /> {t("leads.run")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <Modal title={t("leads.newCampaign")} onClose={() => setOpen(false)}>
          <Field label={t("common.name")}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={t("leads.goal")}><textarea value={f.goal_prompt} onChange={(e) => setF({ ...f, goal_prompt: e.target.value })} placeholder="np. salony fryzjerskie w Warszawie zainteresowane systemem rezerwacji" /></Field>
          <div className="row">
            <div style={{ flex: 1 }}><Field label={t("leads.region")}><input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} placeholder="Warszawa" /></Field></div>
            <div style={{ width: 110 }}><Field label={t("leads.dailyCap")}><input type="number" value={f.daily_cap} onChange={(e) => setF({ ...f, daily_cap: e.target.value })} /></Field></div>
          </div>
          <Field label={t("leads.channels")}>
            <div className="row wrap" style={{ gap: 8 }}>
              {SOURCES.map((s) => (
                <button key={s} type="button" className={"badge " + (f.channels.includes(s) ? "indigo" : "")} style={{ cursor: "pointer" }} onClick={() => toggleCh(s)}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label={t("leads.template")} hint={t("leads.templateHint")}><textarea value={f.outreach_template} onChange={(e) => setF({ ...f, outreach_template: e.target.value })} style={{ minHeight: 70 }} /></Field>
          <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={f.auto_daily} onChange={(e) => setF({ ...f, auto_daily: e.target.checked })} /> {t("leads.autoDaily")}
          </label>
          <button className="btn primary" onClick={create} disabled={!f.name.trim() || !f.goal_prompt.trim()}>{t("leads.run")}</button>
        </Modal>
      )}
    </div>
  );
}

function LeadsList({ project }) {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => supabase.from("leads").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(200).then((r) => { setItems(r.data || []); setLoading(false); });
  useEffect(() => {
    load();
    const ch = supabase.channel(`leads-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `project_id=eq.${project.id}` }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [project.id]);

  const openLead = async (l) => {
    setOpen(l);
    const { data } = await supabase.from("lead_messages").select("*").eq("lead_id", l.id).order("created_at");
    setThread(data || []);
  };
  const outreach = async (l) => {
    await supabase.from("jobs").insert({
      project_id: project.id, type: "lead_outreach", status: "queued",
      payload: { lead_id: l.id }, ref_table: "leads", ref_id: l.id, created_by: user.id,
    });
    toast(t("leads.run") + " ✓");
  };

  if (loading) return <SkeletonList n={4} h={56} />;
  if (items.length === 0) return <p className="muted small">{t("leads.noLeads")}</p>;
  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>{t("leads.company")}</th><th>{t("leads.contact")}</th><th>{t("bot.source")}</th><th>{t("common.status")}</th><th></th></tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.company || l.name || "—"}</strong>{l.website && <div className="small muted">{l.website}</div>}</td>
                <td className="muted small">{l.email || l.phone || l.linkedin_url || "—"}</td>
                <td><span className="badge indigo">{l.source}</span></td>
                <td><span className={"badge " + (statusKind[l.status] || "")}>{t("leads.st." + l.status)}</span></td>
                <td>
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" onClick={() => openLead(l)}>{t("leads.thread")}</button>
                    {["found", "contacted"].includes(l.status) && <button className="btn sm" onClick={() => outreach(l)}><Icon.send /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title={open.company || open.name || t("leads.thread")} onClose={() => setOpen(null)} width={560}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <span className="badge indigo">{open.source}</span>
            <span className={"badge " + (statusKind[open.status] || "")}>{t("leads.st." + open.status)}</span>
          </div>
          {thread.length === 0 ? <p className="muted small">{t("leads.noThread")}</p> : (
            <div className="grid" style={{ gap: 10 }}>
              {thread.map((m) => (
                <div key={m.id} className="card" style={{ padding: 12, background: m.direction === "outbound" ? "var(--accent-soft)" : "var(--surface-2)" }}>
                  <div className="small muted" style={{ marginBottom: 4 }}>{m.direction === "outbound" ? "→ " + t("leads.st.contacted") : "← " + t("leads.contact")} · {m.channel}</div>
                  {m.subject && <strong style={{ display: "block", marginBottom: 4 }}>{m.subject}</strong>}
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{m.body}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default function Leads() {
  const { project } = useProject();
  const { t } = useT();
  const [tab, setTab] = useState("campaigns");
  if (!project) return null;
  return (
    <div className="content">
      <h1 className="page-title">{t("leads.title")}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>{project.name}</p>
      <div className="subtabs">
        <button className={"subtab" + (tab === "campaigns" ? " active" : "")} onClick={() => setTab("campaigns")}>{t("leads.campaigns")}</button>
        <button className={"subtab" + (tab === "leads" ? " active" : "")} onClick={() => setTab("leads")}>{t("leads.list")}</button>
      </div>
      {tab === "campaigns" ? <Campaigns project={project} onRan={() => setTab("leads")} /> : <LeadsList project={project} />}
    </div>
  );
}
