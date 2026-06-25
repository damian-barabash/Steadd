import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Icon, Spinner, Field, useToast, copyText } from "./ui";
import { compile } from "../lib/mailTemplate";

const L = {
  pl: {
    title: "Zgłoszenia", subtitle: "Zapytania z formularza na stronie (kontakt / chcę się umówić).",
    none: "Brak zgłoszeń.", all: "Wszystkie", new: "Nowe", contacted: "W kontakcie", scheduled: "Umówione", done: "Zakończone", rejected: "Odrzucone",
    st_new: "Nowe", st_contacted: "W kontakcie", st_scheduled: "Umówione", st_done: "Zakończone", st_rejected: "Odrzucone",
    company: "Firma", message: "Wiadomość", notes: "Notatki (tylko dla zespołu)", notesPh: "np. oddzwonić w pon., budżet ~5k…",
    status: "Status", reply: "Odpowiedz e-mailem", replyVia: "Wyślij przez platformę", mailto: "Otwórz w poczcie", copy: "Kopiuj e-mail",
    subject: "Temat", body: "Treść", send: "Wyślij", sent: "Wysłano — oznaczono „w kontakcie”.", cancel: "Anuluj",
    delete: "Usuń", confirmDel: "Usunąć to zgłoszenie?", saved: "Zapisano", noMsg: "(bez wiadomości)",
    defSubject: "Re: Twoje zapytanie — Steadd",
  },
  en: {
    title: "Inquiries", subtitle: "Submissions from the website form (contact / book a call).",
    none: "No inquiries yet.", all: "All", new: "New", contacted: "In contact", scheduled: "Scheduled", done: "Closed", rejected: "Rejected",
    st_new: "New", st_contacted: "In contact", st_scheduled: "Scheduled", st_done: "Closed", st_rejected: "Rejected",
    company: "Company", message: "Message", notes: "Notes (team only)", notesPh: "e.g. call back Mon, budget ~5k…",
    status: "Status", reply: "Reply by email", replyVia: "Send via platform", mailto: "Open in mail app", copy: "Copy email",
    subject: "Subject", body: "Message", send: "Send", sent: "Sent — marked “in contact”.", cancel: "Cancel",
    delete: "Delete", confirmDel: "Delete this inquiry?", saved: "Saved", noMsg: "(no message)",
    defSubject: "Re: your inquiry — Steadd",
  },
};
const STATUSES = ["new", "contacted", "scheduled", "done", "rejected"];
const STATUS_KIND = { new: "amber", contacted: "indigo", scheduled: "green", done: "green", rejected: "red" };

function Row({ t, item, onChange, onDelete }) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [replying, setReplying] = useState(false);
  const [subject, setSubject] = useState(t("defSubject"));
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const setStatus = async (status) => { await supabase.from("contact_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", item.id); onChange(); };
  const saveNotes = async () => { if (notes === (item.notes || "")) return; await supabase.from("contact_requests").update({ notes, updated_at: new Date().toISOString() }).eq("id", item.id); toast(t("saved")); };

  const sendReply = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const greeting = item.name ? `Dzień dobry ${item.name},` : "Dzień dobry,";
      const { html, text } = compile({ mode: "rich", brandColor: "#1726d6", preheader: subject, blocks: [{ type: "text", text: greeting }, { type: "text", text: body }], signature: "", footer: "Steadd · steadd.pl · Jakub@steadd.pl" });
      const { data: camp, error } = await supabase.from("mail_campaigns").insert({
        name: "Reply: " + (item.email || "").slice(0, 60), subject, mode: "rich",
        source: { inquiry_id: item.id }, html_compiled: html, text_body: text,
        from_name: "Steadd", from_email: "Jakub@steadd.pl", reply_to: "Jakub@steadd.pl",
        status: "queued", throttle_seconds: 0, total: 1, created_by: user.id,
      }).select().single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("mail_recipients").insert({ campaign_id: camp.id, email: item.email, name: item.name || null });
      if (e2) throw e2;
      await supabase.from("contact_requests").update({ status: "contacted", updated_at: new Date().toISOString() }).eq("id", item.id);
      toast(t("sent")); setReplying(false); setBody(""); onChange();
    } catch (e) { toast(String(e?.message || e), "err"); }
    setSending(false);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="row between" style={{ padding: "12px 16px", cursor: "pointer", alignItems: "flex-start", gap: 12 }} onClick={() => setOpen((v) => !v)}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{item.name || item.email || "—"}</strong>
            {item.company && <span className="small muted">· {item.company}</span>}
            <span className={"badge " + (STATUS_KIND[item.status] || "")}>{t("st_" + item.status)}</span>
          </div>
          <div className="small muted" style={{ marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.email} — {item.message ? item.message.slice(0, 90) : t("noMsg")}
          </div>
        </div>
        <span className="small muted mono" style={{ whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleDateString()}</span>
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          <div className="row wrap" style={{ gap: 14, margin: "14px 0", alignItems: "center" }}>
            <a className="badge indigo" href={`mailto:${item.email}`} style={{ textDecoration: "none" }}><Icon.mail /> {item.email}</a>
            <button className="btn ghost sm" onClick={() => { copyText(item.email); toast(t("copy")); }}><Icon.code /> {t("copy")}</button>
          </div>

          {item.message && (
            <div className="card" style={{ background: "var(--surface-2)", marginBottom: 14 }}>
              <div className="section-title">{t("message")}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{item.message}</div>
            </div>
          )}

          <Field label={t("status")}>
            <div className="row wrap" style={{ gap: 6 }}>
              {STATUSES.map((s) => (
                <button key={s} type="button" className={"badge " + (item.status === s ? (STATUS_KIND[s] || "indigo") : "")} style={{ cursor: "pointer" }} onClick={() => setStatus(s)}>{t("st_" + s)}</button>
              ))}
            </div>
          </Field>

          <Field label={t("notes")}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder={t("notesPh")} style={{ minHeight: 54 }} />
          </Field>

          {!replying ? (
            <div className="row wrap" style={{ gap: 8 }}>
              <button className="btn primary sm" onClick={() => setReplying(true)}><Icon.send /> {t("reply")}</button>
              <a className="btn sm" href={`mailto:${item.email}?subject=${encodeURIComponent(t("defSubject"))}`}><Icon.mail /> {t("mailto")}</a>
              <div className="spacer" />
              <button className="btn ghost sm danger" onClick={() => { if (confirm(t("confirmDel"))) onDelete(item.id); }}><Icon.trash /></button>
            </div>
          ) : (
            <div className="card" style={{ background: "var(--surface-2)" }}>
              <Field label={t("subject")}><input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
              <Field label={t("body")}><textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 120 }} autoFocus /></Field>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary sm" onClick={sendReply} disabled={sending || !body.trim()}>{sending ? <Spinner /> : <><Icon.send /> {t("replyVia")}</>}</button>
                <button className="btn ghost sm" onClick={() => setReplying(false)}>{t("cancel")}</button>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>{t("subtitle") && `${t("replyVia")} → Jakub@steadd.pl`}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InquiriesModal({ onClose }) {
  const { lang } = useT();
  const t = (k) => L[lang]?.[k] ?? L.pl[k] ?? k;
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () => supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(500).then((r) => setItems(r.data || []));
  useEffect(() => {
    load();
    const ch = supabase.channel("inq-modal").on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const del = async (id) => { await supabase.from("contact_requests").delete().eq("id", id); load(); };
  const counts = useMemo(() => {
    const c = { all: items?.length || 0 };
    STATUSES.forEach((s) => (c[s] = (items || []).filter((i) => i.status === s).length));
    return c;
  }, [items]);
  const shown = (items || []).filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal mailing-modal" style={{ width: 760 }} onClick={(e) => e.stopPropagation()}>
        <div className="ml-head">
          <div className="row" style={{ alignItems: "center", gap: 10 }}><Icon.inbox /> <strong style={{ fontSize: 17 }}>{t("title")}</strong></div>
          <div className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="close"><Icon.x /></button>
        </div>
        <div className="ml-body">
          <p className="muted small" style={{ marginTop: -4, marginBottom: 14 }}>{t("subtitle")}</p>
          <div className="ml-seg" style={{ marginBottom: 16, flexWrap: "wrap" }}>
            {["all", ...STATUSES].map((s) => (
              <button key={s} className={"ml-segbtn" + (filter === s ? " active" : "")} onClick={() => setFilter(s)}>
                {t(s === "all" ? "all" : "st_" + s)} {counts[s] ? `(${counts[s]})` : ""}
              </button>
            ))}
          </div>
          {items === null ? <div className="center-screen" style={{ minHeight: 160 }}><Spinner /></div>
            : shown.length === 0 ? <p className="muted small" style={{ textAlign: "center", marginTop: 30 }}>{t("none")}</p>
            : <div className="grid">{shown.map((it) => <Row key={it.id} t={t} item={it} onChange={load} onDelete={del} />)}</div>}
        </div>
      </div>
    </div>
  );
}
