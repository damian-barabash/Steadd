import { useState, useRef, useEffect } from "react";
import { FUNCTIONS_URL, SUPABASE_ANON } from "../lib/supabase";
import { Icon, Spinner } from "./ui";
import { useT } from "../lib/i18n";

// Live demo chatbot on the landing — exactly the widget clients embed, wired to the
// STEADD project so visitors see how it works (answers about the platform).
const PID = "3802a415-fd69-4e7c-acbb-ab3cbad0b7db";

export default function LandingChat() {
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const conv = useRef(null);
  const greeted = useRef(false);
  const box = useRef(null);

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs, busy, open]);

  const toggle = () => setOpen((o) => {
    const n = !o;
    if (n && !greeted.current) {
      greeted.current = true;
      setMsgs([{ role: "bot", content: lang === "en" ? "Hi! 👋 I'm the STEADD assistant — ask me anything about the platform." : "Cześć! 👋 Jestem asystentem STEADD — pytaj o platformę." }]);
    }
    return n;
  });

  const send = async () => {
    if (!text.trim() || busy) return;
    const m = text; setText(""); setMsgs((x) => [...x, { role: "visitor", content: m }]); setBusy(true);
    try {
      const r = await fetch(`${FUNCTIONS_URL}/widget-chat`, {
        method: "POST", headers: { "content-type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ project_id: PID, conversation_id: conv.current, message: m }),
      });
      const d = await r.json();
      conv.current = d.conversation_id;
      setMsgs((x) => [...x, { role: "bot", content: d.reply || "…" }]);
    } catch {
      setMsgs((x) => [...x, { role: "bot", content: lang === "en" ? "Connection error." : "Błąd połączenia." }]);
    }
    setBusy(false);
  };

  return (
    <>
      <button className="lchat-btn" onClick={toggle} aria-label="Chat">
        {open ? <span style={{ fontSize: 22, lineHeight: 1 }}>×</span> : <Icon.chat />}
      </button>
      {open && (
        <div className="lchat-panel">
          <div className="lchat-head">
            <span>{lang === "en" ? "STEADD — live demo" : "STEADD — demo na żywo"}</span>
            <button onClick={toggle} aria-label="Close" style={{ fontSize: 18, opacity: .7 }}>×</button>
          </div>
          <div className="chat-msgs" ref={box}>
            {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === "visitor" ? "visitor" : "bot"}`}>{(m.content || "").replace(/\*\*/g, "").replace(/^\s*[*#]+\s/gm, "• ")}</div>)}
            {busy && <div className="bubble bot"><Spinner /></div>}
          </div>
          <div className="chat-input">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={lang === "en" ? "Type a message…" : "Napisz wiadomość…"} />
            <button className="btn primary" onClick={send} disabled={busy}><Icon.send /></button>
          </div>
        </div>
      )}
    </>
  );
}
