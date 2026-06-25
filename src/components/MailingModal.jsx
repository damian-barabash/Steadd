import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Icon, Spinner, Field, useToast } from "./ui";
import { compile, fillPreview, parseRecipients, recipientsFromRows } from "../lib/mailTemplate";

/* ---- co-located PL/EN strings (this feature is admin-only) ---- */
const L = {
  pl: {
    title: "Mailing", compose: "Nowa wysyłka", lists: "Bazy", history: "Historia", settings: "Ustawienia",
    recipients: "Odbiorcy", srcList: "Zapisana baza", srcPaste: "Wpisz / wklej", srcFile: "Plik",
    pasteHint: "Jeden adres w wierszu. Można „Imię <email>” albo CSV (imię, email).",
    chooseFile: "Wybierz plik CSV / XLSX / TXT", pickList: "Wybierz bazę…",
    valid: "{n} prawidłowych adresów", parsing: "Wczytuję…", saveAsList: "Zapisz jako bazę",
    listName: "Nazwa bazy", subject: "Temat", subjectHint: "Możesz użyć {{name}}.",
    modeRich: "Kreator (branding)", modeHtml: "Własny HTML",
    preheader: "Tekst podglądu (preheader)", brandColor: "Kolor", signature: "Podpis", footer: "Stopka",
    addBlock: "Dodaj blok", bText: "Tekst", bHeading: "Nagłówek", bImage: "Zdjęcie", bButton: "Przycisk", bDivider: "Linia",
    btnLabel: "Tekst przycisku", url: "Link (URL)", imgUrl: "URL zdjęcia", imgUpload: "Wgraj",
    rawHtml: "Kod HTML", rawHtmlHint: "Wyślemy dokładnie ten kod — dodamy tylko link rezygnacji w stopce.",
    preview: "Podgląd", fromName: "Nazwa nadawcy", from: "Z adresu",
    throttle: "Odstęp między mailami (sek.)", throttleHint: "Większy odstęp = mniejsze ryzyko spamu.",
    dailyCap: "Limit dzienny (opc.)", send: "Wyślij rozsyłkę", sending: "Wysyłam…",
    confirm: "Wysłać wiadomość do {n} odbiorców?",
    qTotal: "Razem", qSent: "Wysłane", qFailed: "Błędy", qSkipped: "Pominięte", qPending: "W kolejce",
    progress: "Postęp wysyłki", pause: "Wstrzymaj", resume: "Wznów", backToList: "← Wstecz",
    st_draft: "Szkic", st_queued: "W kolejce", st_sending: "Wysyłanie", st_paused: "Wstrzymane", st_done: "Zakończone", st_error: "Błąd",
    workerNote: "Wysyłka działa na serwerze z odstępami — okno można zamknąć, będzie kontynuować.",
    queued: "Dodano do kolejki — wysyłka ruszyła.",
    noCampaigns: "Brak wysyłek.", noLists: "Brak zapisanych baz.", contacts: "kontaktów", newList: "Nowa baza",
    keyApi: "Klucz API Resend", keySet: "Zapisany — wpisz nowy, aby zmienić.", fromEmail: "Adres nadawcy", replyTo: "Odpowiedzi do",
    suppression: "Wypisani / wykluczeni", addEmail: "Dodaj adres", supprHint: "Te adresy nigdy nie dostaną maila.",
    save: "Zapisz", saved: "Zapisano", delete: "Usuń", close: "Zamknij",
    needRecip: "Dodaj odbiorców.", needSubject: "Wpisz temat.", needContent: "Dodaj treść.",
    failedList: "Adresy z błędem", domainNote: "Domena steadd.pl zweryfikowana w Resend ✓",
  },
  en: {
    title: "Mailing", compose: "New send", lists: "Lists", history: "History", settings: "Settings",
    recipients: "Recipients", srcList: "Saved list", srcPaste: "Type / paste", srcFile: "File",
    pasteHint: "One address per line. „Name <email>” or CSV (name, email) works too.",
    chooseFile: "Choose CSV / XLSX / TXT file", pickList: "Choose a list…",
    valid: "{n} valid addresses", parsing: "Reading…", saveAsList: "Save as list",
    listName: "List name", subject: "Subject", subjectHint: "You can use {{name}}.",
    modeRich: "Builder (branded)", modeHtml: "Custom HTML",
    preheader: "Preview text (preheader)", brandColor: "Color", signature: "Signature", footer: "Footer",
    addBlock: "Add block", bText: "Text", bHeading: "Heading", bImage: "Image", bButton: "Button", bDivider: "Divider",
    btnLabel: "Button text", url: "Link (URL)", imgUrl: "Image URL", imgUpload: "Upload",
    rawHtml: "HTML code", rawHtmlHint: "We send exactly this code — only an unsubscribe link is appended to the footer.",
    preview: "Preview", fromName: "Sender name", from: "From",
    throttle: "Interval between emails (sec)", throttleHint: "Larger interval = lower spam risk.",
    dailyCap: "Daily cap (opt.)", send: "Send campaign", sending: "Sending…",
    confirm: "Send the message to {n} recipients?",
    qTotal: "Total", qSent: "Sent", qFailed: "Failed", qSkipped: "Skipped", qPending: "Pending",
    progress: "Sending progress", pause: "Pause", resume: "Resume", backToList: "← Back",
    st_draft: "Draft", st_queued: "Queued", st_sending: "Sending", st_paused: "Paused", st_done: "Done", st_error: "Error",
    workerNote: "Sending runs on the server with delays — you can close this window, it continues.",
    queued: "Queued — sending has started.",
    noCampaigns: "No campaigns yet.", noLists: "No saved lists.", contacts: "contacts", newList: "New list",
    keyApi: "Resend API key", keySet: "Saved — type a new one to change.", fromEmail: "Sender address", replyTo: "Replies to",
    suppression: "Unsubscribed / excluded", addEmail: "Add address", supprHint: "These addresses never get an email.",
    save: "Save", saved: "Saved", delete: "Delete", close: "Close",
    needRecip: "Add recipients.", needSubject: "Enter a subject.", needContent: "Add some content.",
    failedList: "Failed addresses", domainNote: "Domain steadd.pl verified in Resend ✓",
  },
};

const STATUS_KIND = { draft: "", queued: "amber", sending: "indigo", paused: "amber", done: "green", error: "red" };

async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return recipientsFromRows(XLSX.utils.sheet_to_json(ws, { header: 1 }));
  }
  return parseRecipients(await file.text());
}

/* ====================== root ====================== */
export default function MailingModal({ onClose }) {
  const { lang } = useT();
  const t = (k, v) => { let s = L[lang]?.[k] ?? L.pl[k] ?? k; if (v) for (const x in v) s = s.replace(`{${x}}`, v[x]); return s; };
  const [view, setView] = useState("compose");
  const [activeCampaign, setActiveCampaign] = useState(null);

  const nav = [
    { id: "compose", icon: Icon.send, label: t("compose") },
    { id: "lists", icon: Icon.users, label: t("lists") },
    { id: "history", icon: Icon.history, label: t("history") },
    { id: "settings", icon: Icon.settings, label: t("settings") },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal mailing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ml-head">
          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <Icon.mail /> <strong style={{ fontSize: 17 }}>{t("title")}</strong>
          </div>
          <div className="ml-tabs">
            {nav.map((n) => (
              <button key={n.id} className={"ml-tab" + (view === n.id ? " active" : "")}
                onClick={() => { setView(n.id); setActiveCampaign(null); }}>
                <n.icon /> <span>{n.label}</span>
              </button>
            ))}
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="close"><Icon.x /></button>
        </div>

        <div className="ml-body">
          {activeCampaign ? (
            <CampaignProgress t={t} id={activeCampaign} onBack={() => setActiveCampaign(null)} />
          ) : view === "compose" ? (
            <Compose t={t} onSent={(id) => { setActiveCampaign(id); }} />
          ) : view === "lists" ? (
            <Lists t={t} />
          ) : view === "history" ? (
            <History t={t} onOpen={(id) => setActiveCampaign(id)} />
          ) : (
            <SettingsView t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================== compose ====================== */
const emptyState = {
  mode: "rich", subject: "", preheader: "", brandColor: "#1726d6",
  blocks: [{ type: "heading", text: "Dzień dobry {{name}}," }, { type: "text", text: "" }],
  signature: "", footer: "Steadd · steadd.pl · Jakub@steadd.pl", rawHtml: "",
};

function Compose({ t, onSent }) {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  // recipients
  const [src, setSrc] = useState("paste"); // paste | list | file
  const [paste, setPaste] = useState("");
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState("");
  const [fileRecips, setFileRecips] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [listContacts, setListContacts] = useState([]);

  // content
  const [s, setS] = useState(emptyState);
  const [settings, setSettings] = useState({ mail_from_name: "Steadd", mail_from_email: "Jakub@steadd.pl", mail_reply_to: "Jakub@steadd.pl", mail_throttle_seconds: "8" });
  const [fromName, setFromName] = useState("");
  const [throttle, setThrottle] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("mail_lists").select("id,name").order("created_at", { ascending: false }).then((r) => setLists(r.data || []));
    supabase.from("platform_settings").select("key,value").then(({ data }) => {
      const o = {}; (data || []).forEach((r) => (o[r.key] = r.value));
      setSettings((c) => ({ ...c, ...o }));
      setFromName(o.mail_from_name || "Steadd");
      setThrottle(o.mail_throttle_seconds || "8");
    });
  }, []);
  useEffect(() => {
    if (src === "list" && listId) supabase.from("mail_list_contacts").select("email,name").eq("list_id", listId).then((r) => setListContacts(r.data || []));
  }, [src, listId]);

  const recipients = useMemo(() => {
    if (src === "paste") return parseRecipients(paste);
    if (src === "file") return fileRecips || [];
    if (src === "list") return listContacts;
    return [];
  }, [src, paste, fileRecips, listContacts]);

  const onFile = async (file) => {
    if (!file) return;
    setParsing(true);
    try { setFileRecips(await parseFile(file)); }
    catch (e) { toast(String(e?.message || e), "err"); }
    setParsing(false);
  };

  const compiled = useMemo(() => compile(s), [s]);
  const previewHtml = useMemo(() => fillPreview(compiled.html), [compiled.html]);

  /* ----- block editor helpers ----- */
  const setBlock = (i, patch) => setS((c) => ({ ...c, blocks: c.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const addBlock = (type) => setS((c) => ({ ...c, blocks: [...c.blocks, type === "button" ? { type, label: "", url: "" } : type === "image" ? { type, url: "" } : type === "divider" ? { type } : { type, text: "" }] }));
  const delBlock = (i) => setS((c) => ({ ...c, blocks: c.blocks.filter((_, j) => j !== i) }));
  const moveBlock = (i, d) => setS((c) => { const a = [...c.blocks]; const j = i + d; if (j < 0 || j >= a.length) return c; [a[i], a[j]] = [a[j], a[i]]; return { ...c, blocks: a }; });

  const uploadImg = async (i, file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `mailing/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("generated").upload(path, file, { contentType: file.type });
    if (error) { toast(error.message, "err"); return; }
    setBlock(i, { url: supabase.storage.from("generated").getPublicUrl(path).data.publicUrl });
  };

  const hasContent = s.mode === "html" ? s.rawHtml.trim().length > 10 : s.blocks.some((b) => (b.text || b.url || b.label));

  const send = async () => {
    if (!recipients.length) return toast(t("needRecip"), "err");
    if (!s.subject.trim()) return toast(t("needSubject"), "err");
    if (!hasContent) return toast(t("needContent"), "err");
    if (!confirm(t("confirm", { n: recipients.length }))) return;
    setSending(true);
    try {
      const { html, text } = compile(s);
      const { data: camp, error } = await supabase.from("mail_campaigns").insert({
        name: s.subject.slice(0, 90), subject: s.subject, mode: s.mode,
        source: { ...s }, html_compiled: html, text_body: text,
        from_name: fromName || "Steadd", from_email: settings.mail_from_email, reply_to: settings.mail_reply_to,
        status: "queued", throttle_seconds: Number(throttle) || 8, daily_cap: dailyCap ? Number(dailyCap) : null,
        total: recipients.length, created_by: user.id,
      }).select().single();
      if (error) throw error;
      // insert recipients in chunks
      const rows = recipients.map((r) => ({ campaign_id: camp.id, email: r.email, name: r.name || null }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error: e2 } = await supabase.from("mail_recipients").insert(rows.slice(i, i + 500));
        if (e2) throw e2;
      }
      toast(t("queued"));
      onSent(camp.id);
    } catch (e) { toast(String(e?.message || e), "err"); }
    setSending(false);
  };

  const saveList = async () => {
    const name = prompt(t("listName"));
    if (!name) return;
    const { data: list, error } = await supabase.from("mail_lists").insert({ name, created_by: user.id }).select().single();
    if (error) return toast(error.message, "err");
    const rows = recipients.map((r) => ({ list_id: list.id, email: r.email, name: r.name || null }));
    for (let i = 0; i < rows.length; i += 500) await supabase.from("mail_list_contacts").insert(rows.slice(i, i + 500));
    setLists((c) => [{ id: list.id, name }, ...c]);
    toast(t("saved"));
  };

  return (
    <div className="ml-compose">
      {/* LEFT: editor */}
      <div className="ml-edit">
        {/* recipients */}
        <div className="section-title">{t("recipients")}</div>
        <div className="ml-seg" style={{ marginBottom: 10 }}>
          {[["paste", t("srcPaste")], ["list", t("srcList")], ["file", t("srcFile")]].map(([id, lab]) => (
            <button key={id} className={"ml-segbtn" + (src === id ? " active" : "")} onClick={() => setSrc(id)}>{lab}</button>
          ))}
        </div>
        {src === "paste" && <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t("pasteHint")} style={{ minHeight: 110 }} />}
        {src === "list" && (
          <select value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">{t("pickList")}</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {src === "file" && (
          <div>
            <button className="btn sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
              {parsing ? <Spinner /> : <Icon.upload />} {t("chooseFile")}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        )}
        <div className="row between" style={{ marginTop: 8, alignItems: "center" }}>
          <span className="badge indigo">{t("valid", { n: recipients.length })}</span>
          {recipients.length > 0 && <button className="btn ghost sm" onClick={saveList}><Icon.plus /> {t("saveAsList")}</button>}
        </div>

        <div className="hr" />

        {/* subject + mode */}
        <Field label={t("subject")} hint={t("subjectHint")}>
          <input value={s.subject} onChange={(e) => setS({ ...s, subject: e.target.value })} placeholder="np. Twój zespół AI…" />
        </Field>
        <div className="ml-seg" style={{ marginBottom: 14 }}>
          <button className={"ml-segbtn" + (s.mode === "rich" ? " active" : "")} onClick={() => setS({ ...s, mode: "rich" })}><Icon.type /> {t("modeRich")}</button>
          <button className={"ml-segbtn" + (s.mode === "html" ? " active" : "")} onClick={() => setS({ ...s, mode: "html" })}><Icon.code /> {t("modeHtml")}</button>
        </div>

        {s.mode === "rich" ? (
          <>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}><Field label={t("preheader")}><input value={s.preheader} onChange={(e) => setS({ ...s, preheader: e.target.value })} /></Field></div>
              <div style={{ width: 84 }}><Field label={t("brandColor")}><input type="color" value={s.brandColor} onChange={(e) => setS({ ...s, brandColor: e.target.value })} style={{ height: 38, padding: 3 }} /></Field></div>
            </div>

            <div className="ml-blocks">
              {s.blocks.map((b, i) => (
                <div key={i} className="ml-block">
                  <div className="ml-block-bar">
                    <span className="badge">{t("b" + (b.type[0].toUpperCase() + b.type.slice(1)))}</span>
                    <div className="spacer" />
                    <button className="iconbtn sm" onClick={() => moveBlock(i, -1)}><Icon.up /></button>
                    <button className="iconbtn sm" onClick={() => moveBlock(i, 1)}><Icon.down /></button>
                    <button className="iconbtn sm" onClick={() => delBlock(i)}><Icon.trash /></button>
                  </div>
                  {b.type === "heading" && <input value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder={t("bHeading")} />}
                  {b.type === "text" && <textarea value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder={t("bText")} />}
                  {b.type === "image" && (
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input value={b.url} onChange={(e) => setBlock(i, { url: e.target.value })} placeholder={t("imgUrl")} />
                      <label className="btn sm" style={{ cursor: "pointer" }}><Icon.upload /> {t("imgUpload")}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => uploadImg(i, e.target.files?.[0])} /></label>
                    </div>
                  )}
                  {b.type === "button" && (
                    <div className="row" style={{ gap: 8 }}>
                      <input value={b.label} onChange={(e) => setBlock(i, { label: e.target.value })} placeholder={t("btnLabel")} />
                      <input value={b.url} onChange={(e) => setBlock(i, { url: e.target.value })} placeholder={t("url")} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
              {[["text", t("bText")], ["heading", t("bHeading")], ["image", t("bImage")], ["button", t("bButton")], ["divider", t("bDivider")]].map(([type, lab]) => (
                <button key={type} className="btn ghost sm" onClick={() => addBlock(type)}><Icon.plus /> {lab}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}><Field label={t("signature")}><textarea value={s.signature} onChange={(e) => setS({ ...s, signature: e.target.value })} style={{ minHeight: 54 }} /></Field></div>
              <div style={{ flex: 1 }}><Field label={t("footer")}><textarea value={s.footer} onChange={(e) => setS({ ...s, footer: e.target.value })} style={{ minHeight: 54 }} /></Field></div>
            </div>
          </>
        ) : (
          <Field label={t("rawHtml")} hint={t("rawHtmlHint")}>
            <textarea className="mono" value={s.rawHtml} onChange={(e) => setS({ ...s, rawHtml: e.target.value })} style={{ minHeight: 220, fontSize: 12.5 }} placeholder="<!doctype html>…" />
          </Field>
        )}

        <div className="hr" />
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><Field label={t("fromName")}><input value={fromName} onChange={(e) => setFromName(e.target.value)} /></Field></div>
          <div style={{ flex: 1 }}><Field label={t("from")}><input value={settings.mail_from_email} disabled style={{ opacity: .7 }} /></Field></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><Field label={t("throttle")} hint={t("throttleHint")}><input type="number" min="0" value={throttle} onChange={(e) => setThrottle(e.target.value)} /></Field></div>
          <div style={{ flex: 1 }}><Field label={t("dailyCap")}><input type="number" min="0" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="—" /></Field></div>
        </div>
        <button className="btn primary block" onClick={send} disabled={sending}>{sending ? <Spinner /> : <><Icon.send /> {t("send")}</>}</button>
        <p className="small muted" style={{ marginTop: 8 }}>{t("workerNote")}</p>
      </div>

      {/* RIGHT: live preview */}
      <div className="ml-preview">
        <div className="section-title">{t("preview")}</div>
        <div className="ml-frame">
          <iframe title="preview" sandbox="" srcDoc={previewHtml} />
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>{t("domainNote")}</p>
      </div>
    </div>
  );
}

/* ====================== campaign progress ====================== */
function CampaignProgress({ t, id, onBack }) {
  const [c, setC] = useState(null);
  const [failed, setFailed] = useState([]);
  const load = () => supabase.from("mail_campaigns").select("*").eq("id", id).single().then((r) => setC(r.data));
  useEffect(() => {
    load();
    const ch = supabase.channel(`mc-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mail_campaigns", filter: `id=eq.${id}` }, (p) => setC(p.new))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id]);
  useEffect(() => {
    if (c && ["done", "error"].includes(c.status) && c.failed > 0)
      supabase.from("mail_recipients").select("email,error").eq("campaign_id", id).eq("status", "failed").limit(50).then((r) => setFailed(r.data || []));
  }, [c?.status, c?.failed]);

  if (!c) return <div className="center-screen" style={{ minHeight: 200 }}><Spinner /></div>;
  const done = (c.sent || 0) + (c.failed || 0) + (c.skipped || 0);
  const pct = c.total ? Math.round((done / c.total) * 100) : 0;
  const setStatus = (status) => supabase.from("mail_campaigns").update({ status }).eq("id", id);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="row between" style={{ marginBottom: 16 }}>
        <button className="btn ghost sm" onClick={onBack}>{t("backToList")}</button>
        <span className={"badge " + (STATUS_KIND[c.status] || "")}>{t("st_" + c.status)}</span>
      </div>
      <h3 style={{ marginBottom: 4 }}>{c.subject}</h3>
      <p className="small muted" style={{ marginBottom: 18 }}>{c.from_name} &lt;{c.from_email}&gt;</p>

      <div className="ml-bar"><div className="ml-bar-fill" style={{ width: pct + "%" }} /></div>
      <p className="small muted" style={{ margin: "8px 0 18px" }}>{done} / {c.total} · {pct}%</p>

      <div className="stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat"><div className="n">{c.sent || 0}</div><div className="l">{t("qSent")}</div></div>
        <div className="stat"><div className="n">{c.failed || 0}</div><div className="l">{t("qFailed")}</div></div>
        <div className="stat"><div className="n">{c.skipped || 0}</div><div className="l">{t("qSkipped")}</div></div>
        <div className="stat"><div className="n">{Math.max(0, (c.total || 0) - done)}</div><div className="l">{t("qPending")}</div></div>
      </div>

      {["queued", "sending"].includes(c.status) && (
        <button className="btn sm" style={{ marginTop: 16 }} onClick={() => setStatus("paused")}><Icon.pause /> {t("pause")}</button>
      )}
      {c.status === "paused" && (
        <button className="btn primary sm" style={{ marginTop: 16 }} onClick={() => setStatus("sending")}><Icon.bolt /> {t("resume")}</button>
      )}
      {c.error && <p className="small" style={{ color: "var(--red)", marginTop: 14 }}>{c.error}</p>}

      {failed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-title">{t("failedList")}</div>
          <div className="card" style={{ padding: 0, maxHeight: 200, overflow: "auto" }}>
            {failed.map((f, i) => (
              <div key={i} className="row between" style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)", gap: 10 }}>
                <span className="small">{f.email}</span><span className="small muted" style={{ textAlign: "right" }}>{f.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================== lists ====================== */
function Lists({ t }) {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [paste, setPaste] = useState("");
  const [fileRecips, setFileRecips] = useState(null);

  const recips = fileRecips || parseRecipients(paste);
  const load = () => supabase.from("mail_lists").select("id,name,created_at,mail_list_contacts(count)").order("created_at", { ascending: false }).then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim() || !recips.length) return;
    const { data: list, error } = await supabase.from("mail_lists").insert({ name, created_by: user.id }).select().single();
    if (error) return toast(error.message, "err");
    const rows = recips.map((r) => ({ list_id: list.id, email: r.email, name: r.name || null }));
    for (let i = 0; i < rows.length; i += 500) await supabase.from("mail_list_contacts").insert(rows.slice(i, i + 500));
    setCreating(false); setName(""); setPaste(""); setFileRecips(null); load(); toast(t("saved"));
  };
  const del = async (l) => { if (!confirm(t("delete") + " — " + l.name + "?")) return; await supabase.from("mail_lists").delete().eq("id", l.id); load(); };
  const onFile = async (f) => { if (!f) return; try { setFileRecips(await parseFile(f)); } catch (e) { toast(String(e?.message || e), "err"); } };

  if (items === null) return <div className="center-screen" style={{ minHeight: 160 }}><Spinner /></div>;
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ margin: 0 }}>{t("lists")}</div>
        <button className="btn primary sm" onClick={() => setCreating((v) => !v)}><Icon.plus /> {t("newList")}</button>
      </div>
      {creating && (
        <div className="card" style={{ marginBottom: 16 }}>
          <Field label={t("listName")}><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t("srcPaste")} hint={t("pasteHint")}><textarea value={paste} onChange={(e) => { setPaste(e.target.value); setFileRecips(null); }} /></Field>
          <div className="row between" style={{ alignItems: "center" }}>
            <button className="btn ghost sm" onClick={() => fileRef.current?.click()}><Icon.upload /> {t("srcFile")}</button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
            <span className="badge indigo">{t("valid", { n: recips.length })}</span>
          </div>
          <button className="btn primary block" style={{ marginTop: 14 }} onClick={create} disabled={!name.trim() || !recips.length}>{t("save")}</button>
        </div>
      )}
      {items.length === 0 ? <p className="muted small">{t("noLists")}</p> : (
        <div className="grid">
          {items.map((l) => (
            <div key={l.id} className="list-item">
              <Icon.users />
              <div style={{ flex: 1 }}><strong>{l.name}</strong><div className="small muted">{l.mail_list_contacts?.[0]?.count ?? 0} {t("contacts")}</div></div>
              <button className="iconbtn" onClick={() => del(l)}><Icon.trash /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====================== history ====================== */
function History({ t, onOpen }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    supabase.from("mail_campaigns").select("id,subject,status,total,sent,failed,created_at").order("created_at", { ascending: false }).limit(100)
      .then((r) => setItems(r.data || []));
  }, []);
  if (items === null) return <div className="center-screen" style={{ minHeight: 160 }}><Spinner /></div>;
  if (!items.length) return <p className="muted small" style={{ textAlign: "center", marginTop: 40 }}>{t("noCampaigns")}</p>;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>{t("subject")}</th><th>{t("qSent")}</th><th>{t("qFailed")}</th><th>{t("qTotal")}</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => onOpen(c.id)}>
                <td><strong>{c.subject}</strong><div className="small muted">{new Date(c.created_at).toLocaleString()}</div></td>
                <td>{c.sent || 0}</td><td>{c.failed || 0}</td><td>{c.total || 0}</td>
                <td><span className={"badge " + (STATUS_KIND[c.status] || "")}>{t("st_" + c.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====================== settings ====================== */
function SettingsView({ t }) {
  const toast = useToast();
  const [f, setF] = useState({ mail_from_name: "", mail_from_email: "", mail_reply_to: "", mail_throttle_seconds: "8" });
  const [keySet, setKeySet] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [suppr, setSuppr] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSuppr = () => supabase.from("mail_suppression").select("email,reason,created_at").order("created_at", { ascending: false }).limit(200).then((r) => setSuppr(r.data || []));
  useEffect(() => {
    supabase.from("platform_settings").select("key,value").then(({ data }) => {
      const o = {}; (data || []).forEach((r) => (o[r.key] = r.value));
      setF({ mail_from_name: o.mail_from_name || "Steadd", mail_from_email: o.mail_from_email || "Jakub@steadd.pl", mail_reply_to: o.mail_reply_to || "Jakub@steadd.pl", mail_throttle_seconds: o.mail_throttle_seconds || "8" });
      setKeySet(!!o.resend_api_key);
    });
    loadSuppr();
  }, []);

  const save = async () => {
    setBusy(true);
    const rows = Object.entries(f).map(([key, value]) => ({ key, value: String(value ?? "") }));
    if (newKey.trim()) rows.push({ key: "resend_api_key", value: newKey.trim() });
    const { error } = await supabase.from("platform_settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return toast(error.message, "err");
    if (newKey.trim()) { setKeySet(true); setNewKey(""); }
    toast(t("saved"));
  };
  const addSuppr = async () => {
    const e = newEmail.trim().toLowerCase(); if (!e) return;
    await supabase.from("mail_suppression").upsert({ email: e, reason: "manual" }, { onConflict: "email" });
    setNewEmail(""); loadSuppr();
  };
  const delSuppr = async (email) => { await supabase.from("mail_suppression").delete().eq("email", email); loadSuppr(); };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Resend</div>
        <Field label={t("keyApi")} hint={keySet ? t("keySet") : ""}>
          <input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder={keySet ? "••••••••••••" : "re_…"} />
        </Field>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><Field label={t("fromName")}><input value={f.mail_from_name} onChange={(e) => setF({ ...f, mail_from_name: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label={t("fromEmail")}><input value={f.mail_from_email} onChange={(e) => setF({ ...f, mail_from_email: e.target.value })} /></Field></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><Field label={t("replyTo")}><input value={f.mail_reply_to} onChange={(e) => setF({ ...f, mail_reply_to: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label={t("throttle")}><input type="number" min="0" value={f.mail_throttle_seconds} onChange={(e) => setF({ ...f, mail_throttle_seconds: e.target.value })} /></Field></div>
        </div>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : t("save")}</button>
      </div>

      <div className="card">
        <div className="section-title">{t("suppression")}</div>
        <p className="small muted" style={{ marginTop: -4, marginBottom: 12 }}>{t("supprHint")}</p>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="adres@firma.pl" />
          <button className="btn sm" onClick={addSuppr}><Icon.plus /> {t("addEmail")}</button>
        </div>
        {suppr.length === 0 ? <p className="muted small">{t("close") && "—"}</p> : (
          <div style={{ maxHeight: 240, overflow: "auto" }}>
            {suppr.map((sx) => (
              <div key={sx.email} className="row between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", gap: 10 }}>
                <span className="small">{sx.email}</span>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span className="badge">{sx.reason}</span>
                  <button className="iconbtn sm" onClick={() => delSuppr(sx.email)}><Icon.x /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
