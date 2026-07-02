import { useEffect, useState, useRef } from "react";
import { supabase, FUNCTIONS_URL, SUPABASE_ANON } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useT } from "../../lib/i18n";
import { Field, Modal, Spinner, useToast, copyText, Icon, SkeletonList, PageHead, EmptyState } from "../../components/ui";

const CHANNELS = [
  { type: "web", idField: null },
  { type: "instagram", idField: "ig_user_id" },
  { type: "whatsapp", idField: "phone_number_id" },
  { type: "facebook", idField: "page_id" },
];

/* ---------------- Web widget appearance preview ---------------- */
function WidgetPreview({ cfg }) {
  const sideStyle = cfg.position === "left" ? { left: 16 } : { right: 16 };
  return (
    <div style={{ position: "relative", height: 300, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-2)", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 80, ...sideStyle, width: 220, background: "#0f1122", color: "#eef0fb", border: "1px solid rgba(120,124,200,.22)", borderRadius: cfg.radius, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.45)", fontSize: 12 }}>
        <div style={{ padding: "10px 12px", background: cfg.color, color: "#fff", fontWeight: 600 }}>{cfg.title || "Napisz do nas"}</div>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ alignSelf: "flex-start", background: "#14172c", border: "1px solid rgba(120,124,200,.18)", padding: "7px 10px", borderRadius: 12, borderBottomLeftRadius: 4, maxWidth: "85%" }}>{cfg.welcome || "Cześć! W czym mogę pomóc?"}</div>
          <div style={{ alignSelf: "flex-end", background: cfg.color, color: "#fff", padding: "7px 10px", borderRadius: 12, borderBottomRightRadius: 4, maxWidth: "85%" }}>Czy macie wolny termin?</div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 16, ...sideStyle, width: 52, height: 52, borderRadius: "50%", background: cfg.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
        <Icon.chat />
      </div>
    </div>
  );
}

function WebChannelCard({ project, channel, onSave, onTest, statusBadge, t, toast }) {
  const widgetSrc = new URL("widget.js", document.baseURI).href;
  const [cfg, setCfg] = useState({ color: "#0e108b", radius: 16, position: "right", title: "Napisz do nas", welcome: "Cześć! W czym mogę pomóc?" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { const c = channel?.config || {}; setCfg((x) => ({ ...x, ...c })); }, [channel?.id]);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const attrs = `data-steadd="${project.id}" data-color="${cfg.color}" data-radius="${cfg.radius}" data-pos="${cfg.position}" data-title="${cfg.title}" data-welcome="${cfg.welcome}"`;
  const embed = `<script src="${widgetSrc}" ${attrs}></script>`;
  const save = async () => { setBusy(true); await onSave("web", cfg, channel?.status || "connected"); setBusy(false); };
  return (
    <div className="card">
      <div className="between" style={{ marginBottom: 14 }}>
        <strong>🌐 Strona WWW / Website</strong>
        <div className="row" style={{ gap: 8 }}>
          {statusBadge(channel?.status || "connected")}
          <button className="btn sm" onClick={onTest}>{t("bot.testWidget")}</button>
        </div>
      </div>

      <div className="cols-2">
        <div>
          <div className="section-title">{t("bot.appearance")}</div>
          <div className="row" style={{ gap: 12, marginBottom: 12 }}>
            <div>
              <label>{t("bot.color")}</label>
              <input type="color" value={cfg.color} onChange={(e) => set("color", e.target.value)} style={{ width: 52, height: 38, padding: 3 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{t("bot.radius")}: {cfg.radius}px</label>
              <input type="range" min="0" max="28" value={cfg.radius} onChange={(e) => set("radius", Number(e.target.value))} />
            </div>
            <div>
              <label>{t("bot.position")}</label>
              <select value={cfg.position} onChange={(e) => set("position", e.target.value)}>
                <option value="right">{t("bot.posRight")}</option>
                <option value="left">{t("bot.posLeft")}</option>
              </select>
            </div>
          </div>
          <Field label={t("bot.wTitle")}><input value={cfg.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label={t("bot.wWelcome")}><input value={cfg.welcome} onChange={(e) => set("welcome", e.target.value)} /></Field>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : t("bot.saveAppearance")}</button>
        </div>
        <div>
          <div className="section-title">{t("bot.preview")}</div>
          <WidgetPreview cfg={cfg} />
        </div>
      </div>

      <div className="hr" />
      <div className="section-title">{t("bot.embed")}</div>
      <p className="small muted" style={{ marginBottom: 8 }}>{t("bot.embedHint")}</p>
      <div className="codeblock">{embed}</div>
      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => { copyText(embed); toast(t("common.copied")); }}><Icon.content /> {t("common.copy")}</button>
    </div>
  );
}

/* ---------------- Channels ---------------- */
function Channels({ project }) {
  const { t } = useT();
  const toast = useToast();
  const [channels, setChannels] = useState([]);
  const [edit, setEdit] = useState(null);
  const [testOpen, setTestOpen] = useState(false);

  const widgetSrc = new URL("widget.js", document.baseURI).href;
  const embed = `<script src="${widgetSrc}" data-steadd="${project.id}"></script>`;
  const webhookUrl = `${FUNCTIONS_URL}/meta-webhook`;

  const load = () => supabase.from("channels").select("*").eq("project_id", project.id).then((r) => setChannels(r.data || []));
  useEffect(() => { load(); }, [project.id]);

  // auto-ensure a web channel exists
  useEffect(() => {
    supabase.from("channels").select("id").eq("project_id", project.id).eq("type", "web").maybeSingle()
      .then(({ data }) => { if (!data) supabase.from("channels").insert({ project_id: project.id, type: "web", status: "connected", display_name: "Strona WWW" }).then(load); });
  }, [project.id]);

  const get = (type) => channels.find((c) => c.type === type);

  const saveChannel = async (type, config, status) => {
    const existing = get(type);
    if (existing) await supabase.from("channels").update({ config, status }).eq("id", existing.id);
    else await supabase.from("channels").insert({ project_id: project.id, type, config, status });
    setEdit(null); load(); toast(t("common.save"));
  };

  const statusBadge = (s) => s === "connected" ? <span className="badge green">{t("bot.connected")}</span>
    : s === "pending" ? <span className="badge amber">{t("bot.pending")}</span>
    : <span className="badge red">{t("bot.disconnected")}</span>;

  return (
    <div className="grid">
      {/* WEB — appearance customizer + preview + embed */}
      <WebChannelCard project={project} channel={get("web")} onSave={saveChannel} onTest={() => setTestOpen(true)} statusBadge={statusBadge} t={t} toast={toast} />

      {/* META CHANNELS */}
      {CHANNELS.filter((c) => c.type !== "web").map((c) => {
        const ch = get(c.type);
        return (
          <div key={c.type} className="card">
            <div className="between">
              <strong style={{ textTransform: "capitalize" }}>{c.type === "whatsapp" ? "WhatsApp" : c.type}</strong>
              <div className="row" style={{ gap: 8 }}>
                {statusBadge(ch?.status || "pending")}
                <button className="btn sm" onClick={() => setEdit({ type: c.type, idField: c.idField, config: ch?.config || {} })}>{t("bot.connect")}</button>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              Webhook: <span className="mono">{webhookUrl}</span> · gotowe do podłączenia po weryfikacji aplikacji Meta.
            </p>
          </div>
        );
      })}

      {edit && (
        <Modal title={`${t("bot.connect")} — ${edit.type}`} onClose={() => setEdit(null)}>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Po przejściu weryfikacji biznesowej i App Review w Meta wpisz ID kanału i token dostępu. Webhook URL: <span className="mono">{webhookUrl}</span>
          </p>
          <ChannelForm edit={edit} onSave={saveChannel} t={t} />
        </Modal>
      )}

      {testOpen && <TestWidget project={project} onClose={() => setTestOpen(false)} />}
    </div>
  );
}

function ChannelForm({ edit, onSave, t }) {
  const [config, setConfig] = useState(edit.config || {});
  const set = (k, v) => setConfig((c) => ({ ...c, [k]: v }));
  return (
    <div>
      {edit.idField && (
        <Field label={edit.idField}>
          <input value={config[edit.idField] || ""} onChange={(e) => set(edit.idField, e.target.value)} />
        </Field>
      )}
      <Field label="Access token" hint="przechowywany w konfiguracji kanału (do produkcji: Vault)">
        <input value={config.access_token || ""} onChange={(e) => set("access_token", e.target.value)} />
      </Field>
      <Field label="Wiadomość powitalna" hint={t("common.optional")}>
        <input value={config.welcome || ""} onChange={(e) => set("welcome", e.target.value)} />
      </Field>
      <div className="row">
        <button className="btn primary" onClick={() => onSave(edit.type, config, config[edit.idField] && config.access_token ? "connected" : "pending")}>{t("common.save")}</button>
      </div>
    </div>
  );
}

function TestWidget({ project, onClose }) {
  const { t } = useT();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const convId = useRef(null);
  const send = async () => {
    if (!text.trim()) return;
    const m = text; setText(""); setMsgs((x) => [...x, { role: "visitor", content: m }]); setBusy(true);
    try {
      const r = await fetch(`${FUNCTIONS_URL}/widget-chat`, {
        method: "POST", headers: { "content-type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ project_id: project.id, conversation_id: convId.current, message: m }),
      });
      const d = await r.json();
      convId.current = d.conversation_id;
      setMsgs((x) => [...x, { role: "bot", content: d.reply || "…" }]);
    } catch { setMsgs((x) => [...x, { role: "bot", content: "Błąd połączenia." }]); }
    setBusy(false);
  };
  return (
    <Modal title={t("bot.testWidget")} onClose={onClose}>
      <div className="chat-wrap" style={{ height: 380 }}>
        <div className="chat-msgs">
          {msgs.length === 0 && <div className="bubble system">Napisz coś, by przetestować chatbota tego projektu.</div>}
          {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
          {busy && <div className="bubble bot"><Spinner /></div>}
        </div>
        <div className="chat-input">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Wiadomość…" />
          <button className="btn primary" onClick={send} disabled={busy}><Icon.send /></button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Archetypes ---------------- */
function Archetypes({ project }) {
  const { t } = useT();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => supabase.from("chat_archetypes").select("*").eq("project_id", project.id).order("created_at").then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, [project.id]);

  const save = async (a) => {
    if (a.is_default) await supabase.from("chat_archetypes").update({ is_default: false }).eq("project_id", project.id);
    if (a.id) await supabase.from("chat_archetypes").update({ name: a.name, description: a.description, system_instructions: a.system_instructions, is_default: a.is_default }).eq("id", a.id);
    else await supabase.from("chat_archetypes").insert({ project_id: project.id, name: a.name, description: a.description, system_instructions: a.system_instructions, is_default: a.is_default });
    setEdit(null); load(); toast(t("common.save"));
  };
  const del = async (id) => { if (confirm(t("admin.confirmDelete"))) { await supabase.from("chat_archetypes").delete().eq("id", id); load(); } };

  return (
    <div>
      <div className="between" style={{ marginBottom: 14 }}>
        <p className="small muted" style={{ maxWidth: 600 }}>{t("bot.instructions")} — {t("bot.archetypes")}</p>
        <button className="btn primary sm" onClick={() => setEdit({ name: "", description: "", system_instructions: "", is_default: items.length === 0 })}><Icon.plus /> {t("bot.newArchetype")}</button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Icon.chat} title={t("bot.emptyArchTitle")} text={t("bot.emptyArchText")}
          action={<><Icon.plus /> {t("bot.newArchetype")}</>}
          onAction={() => setEdit({ name: "", description: "", system_instructions: "", is_default: true })} />
      ) : (
        <div className="grid">
          {items.map((a) => (
            <div key={a.id} className="card">
              <div className="between">
                <div className="row" style={{ alignItems: "center", gap: 8 }}>
                  <strong>{a.name}</strong>
                  {a.is_default && <span className="badge indigo">{t("bot.default")}</span>}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn ghost sm" onClick={() => setEdit(a)}>{t("common.edit")}</button>
                  <button className="btn ghost sm danger" onClick={() => del(a.id)}><Icon.trash /></button>
                </div>
              </div>
              {a.description && <p className="small muted" style={{ marginTop: 6 }}>{a.description}</p>}
            </div>
          ))}
        </div>
      )}
      {edit && <ArchetypeForm a={edit} onSave={save} onClose={() => setEdit(null)} t={t} />}
    </div>
  );
}

function ArchetypeForm({ a, onSave, onClose, t }) {
  const [f, setF] = useState(a);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={a.id ? t("common.edit") : t("bot.newArchetype")} onClose={onClose}>
      <Field label={t("bot.archName")}><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Doradca, Sprzedawca, Wsparcie…" /></Field>
      <Field label={t("bot.archDesc")} hint={t("common.optional")}><input value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label={t("bot.archInstr")}><textarea value={f.system_instructions} onChange={(e) => set("system_instructions", e.target.value)} style={{ minHeight: 120 }} placeholder="Mów ciepło, zadawaj pytania, kieruj do rezerwacji…" /></Field>
      <label className="row" style={{ alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={!!f.is_default} onChange={(e) => set("is_default", e.target.checked)} /> {t("bot.default")}
      </label>
      <button className="btn primary" onClick={() => onSave(f)} disabled={!f.name.trim()}>{t("common.save")}</button>
    </Modal>
  );
}

/* ---------------- Contacts (customer base) ---------------- */
function Contacts({ project }) {
  const { t } = useT();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const load = () => supabase.from("contacts").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(500).then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, [project.id]);

  const importRows = async () => {
    const rows = raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const c = l.split(/\t|,|;/).map((x) => x.trim());
      return { project_id: project.id, full_name: c[0] || null, email: c[1] || null, phone: c[2] || null, company: c[3] || null, source: "import" };
    });
    if (rows.length) { await supabase.from("contacts").insert(rows); toast(`+${rows.length}`); }
    setRaw(""); setOpen(false); load();
  };

  return (
    <div>
      <div className="between" style={{ marginBottom: 14 }}>
        <p className="small muted">{t("bot.contacts")} ({items.length})</p>
        <button className="btn primary sm" onClick={() => setOpen(true)}><Icon.plus /> {t("bot.importContacts")}</button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Icon.users} title={t("bot.emptyContactsTitle")} text={t("bot.emptyContactsText")}
          action={<><Icon.plus /> {t("bot.importContacts")}</>} onAction={() => setOpen(true)} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>{t("common.name")}</th><th>{t("common.email")}</th><th>Tel.</th><th>{t("leads.company")}</th></tr></thead>
            <tbody>{items.map((c) => <tr key={c.id}><td>{c.full_name}</td><td className="muted">{c.email}</td><td className="muted">{c.phone}</td><td className="muted">{c.company}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal title={t("bot.importContacts")} onClose={() => setOpen(false)}>
          <Field label={t("bot.contacts")} hint={t("bot.contactsHint")}>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} style={{ minHeight: 160 }} placeholder={"Jan Kowalski, jan@firma.pl, +48..., Firma Sp. z o.o."} />
          </Field>
          <button className="btn primary" onClick={importRows}>{t("common.add")}</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Conversations ---------------- */
function Conversations({ project }) {
  const { t } = useT();
  const [items, setItems] = useState([]);
  const [archMap, setArchMap] = useState({});
  const [open, setOpen] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => supabase.from("conversations").select("*").eq("project_id", project.id).order("last_message_at", { ascending: false }).limit(100).then((r) => { setItems(r.data || []); setLoading(false); });
  useEffect(() => {
    load();
    supabase.from("chat_archetypes").select("id,name").eq("project_id", project.id).then((r) => {
      const m = {}; (r.data || []).forEach((a) => m[a.id] = a.name); setArchMap(m);
    });
    const ch = supabase.channel(`conv-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `project_id=eq.${project.id}` }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [project.id]);

  const openConv = async (c) => {
    setOpen(c);
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", c.id).order("created_at");
    setMsgs((data || []).filter((m) => !m.meta?.internal));
  };

  return (
    <div>
      {loading ? <SkeletonList n={4} h={62} /> : items.length === 0 ? (
        <EmptyState icon={Icon.chat} title={t("bot.emptyConvTitle")} text={t("bot.emptyConvText")} />
      ) : (
        <div className="grid">
          {items.map((c) => (
            <div key={c.id} className="list-item clickable" onClick={() => openConv(c)}>
              <span className="ico"><Icon.chat /></span>
              <div style={{ flex: 1 }}>
                <strong>{c.visitor_name || "—"}</strong>
                <div className="small muted">{t("bot.source")}: {c.channel_type} · {t("bot.archetype")}: {archMap[c.archetype_id] || "—"}</div>
              </div>
              <span className="badge">{c.status}</span>
            </div>
          ))}
        </div>
      )}
      {open && (
        <Modal title={open.visitor_name || t("bot.conversations")} onClose={() => setOpen(null)} width={560}>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <span className="badge indigo">{t("bot.source")}: {open.channel_type}</span>
            <span className="badge">{t("bot.archetype")}: {archMap[open.archetype_id] || "—"}</span>
          </div>
          <div className="chat-wrap" style={{ height: 400 }}>
            <div className="chat-msgs">
              {msgs.map((m) => <div key={m.id} className={`bubble ${m.role === "visitor" ? "visitor" : m.role === "system" ? "system" : "bot"}`}>{m.content}</div>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function Chatbot() {
  const { project } = useProject();
  const { t } = useT();
  const [tab, setTab] = useState("channels");
  if (!project) return null;
  const tabs = [
    { k: "channels", label: t("bot.channels") },
    { k: "archetypes", label: t("bot.archetypes") },
    { k: "contacts", label: t("bot.contacts") },
    { k: "conversations", label: t("bot.conversations") },
  ];
  return (
    <div className="content">
      <PageHead title={t("bot.title")} sub={t("page.sub.chatbot")} project={project.name} />
      <div className="subtabs">
        {tabs.map((x) => <button key={x.k} className={"subtab" + (tab === x.k ? " active" : "")} onClick={() => setTab(x.k)}>{x.label}</button>)}
      </div>
      {tab === "channels" && <Channels project={project} />}
      {tab === "archetypes" && <Archetypes project={project} />}
      {tab === "contacts" && <Contacts project={project} />}
      {tab === "conversations" && <Conversations project={project} />}
    </div>
  );
}
