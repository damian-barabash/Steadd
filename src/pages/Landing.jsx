import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { Icon, ThemeToggle, Modal, Field, Spinner, Logo } from "../components/ui";
import { supabase } from "../lib/supabase";
import LandingChat from "../components/LandingChat";
import "./landing.css";

function ContactModal({ c, onClose }) {
  const [f, setF] = useState({ name: "", company: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const send = async () => {
    if (!f.email.trim()) return;
    setBusy(true);
    await supabase.from("contact_requests").insert({ name: f.name, company: f.company, email: f.email, message: f.message });
    setBusy(false); setDone(true);
  };
  return (
    <Modal title={c.contactTitle} onClose={onClose}>
      {done ? (
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>✉️</div>
          <p>{c.cOk}</p>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={onClose}>OK</button>
        </div>
      ) : (
        <>
          <div className="row">
            <div style={{ flex: 1 }}><Field label={c.cName}><input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label={c.cCompany}><input value={f.company} onChange={(e) => set("company", e.target.value)} /></Field></div>
          </div>
          <Field label={c.cEmail}><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label={c.cMsg}><textarea value={f.message} onChange={(e) => set("message", e.target.value)} style={{ minHeight: 100 }} /></Field>
          <button className="btn primary block" onClick={send} disabled={busy || !f.email.trim()}>{busy ? <Spinner /> : c.cSend}</button>
        </>
      )}
    </Modal>
  );
}

/* bilingual copy local to the landing */
const L = {
  pl: {
    panel: "Panel", try: "Wypróbuj demo",
    h1a: "Agenci AI,", h1b: "którzy pracują za Ciebie",
    sub: "Chatbot na wszystkich kanałach, automatyczne pozyskiwanie leadów B2B i generowanie treści — wszystko w jednym panelu, napędzane przez OpenClaw.",
    chips: ["Chatbot omnichannel", "Pozyskiwanie leadów", "Generowanie treści"],
    f1eye: "Chatbot", f1h: "Jeden chatbot. Wszystkie kanały.",
    f1p: "Podłącz Instagram, WhatsApp, Facebook i swoją stronę. Bot zna Twój biznes i odpowiada w Twoim stylu — całą dobę.",
    f1l: ["Wstaw jedną linijkę kodu na stronę", "Archetypy komunikacji i własne instrukcje", "Pełna historia rozmów ze źródłem i archetypem"],
    f2eye: "Leady", f2h: "Leady B2B na autopilocie",
    f2p: "Wpisujesz cel. Agent znajduje firmy, pisze ofertę, czeka na odpowiedź i ją ocenia. Po pierwszej pozytywnej — przejmujesz rozmowę.",
    f2l: ["Google Maps + e-mail (i LinkedIn z konta klienta)", "Gotowy szablon albo AI pisze sam", "Każda wiadomość widoczna w panelu"],
    f3eye: "Treści", f3h: "Treści, które znają Twój biznes",
    f3p: "Opisz temat — AI wygeneruje posty, artykuły i maile w odpowiednim formacie i w Twoim tonie.",
    f3l: ["Instagram, Facebook, LinkedIn, blog, e-mail", "Zna Twoją firmę z bazy wiedzy", "Gotowe do publikacji w kilka sekund"],
    hweye: "Jak to działa", hwh: "Trzy kroki do startu",
    steps: [["Podłącz", "Dodajemy Twój projekt i bazę wiedzy o firmie."], ["Uruchom agentów", "Włączasz chatbota, leady i treści w panelu."], ["Obserwuj na żywo", "Wszystko dzieje się w jednym miejscu, w czasie rzeczywistym."]],
    footcta: "Gotowy, by AI pracowało za Ciebie?",
    contact: "Skontaktuj się", contactTitle: "Porozmawiajmy", cName: "Imię", cCompany: "Firma",
    cEmail: "E-mail", cMsg: "Wiadomość", cSend: "Wyślij", cOk: "Dziękujemy! Odezwiemy się wkrótce.",
  },
  en: {
    panel: "Panel", try: "Try the demo",
    h1a: "AI agents", h1b: "that work for you",
    sub: "An omnichannel chatbot, automated B2B lead generation and content creation — all in one panel, powered by OpenClaw.",
    chips: ["Omnichannel chatbot", "Lead generation", "Content generation"],
    f1eye: "Chatbot", f1h: "One chatbot. Every channel.",
    f1p: "Connect Instagram, WhatsApp, Facebook and your website. The bot knows your business and replies in your voice — around the clock.",
    f1l: ["Paste one line of code on your site", "Communication archetypes & custom instructions", "Full conversation history with source & archetype"],
    f2eye: "Leads", f2h: "B2B leads on autopilot",
    f2p: "You set the goal. The agent finds companies, writes the offer, waits for a reply and scores it. After the first positive — you take over.",
    f2l: ["Google Maps + email (and LinkedIn from the client's account)", "A ready template or the AI writes it", "Every message visible in the panel"],
    f3eye: "Content", f3h: "Content that knows your business",
    f3p: "Describe a topic — the AI generates posts, articles and emails in the right format and your tone.",
    f3l: ["Instagram, Facebook, LinkedIn, blog, email", "Knows your business from the knowledge base", "Ready to publish in seconds"],
    hweye: "How it works", hwh: "Three steps to launch",
    steps: [["Connect", "We add your project and the knowledge base about your business."], ["Run agents", "Turn on the chatbot, leads and content in the panel."], ["Watch live", "Everything happens in one place, in real time."]],
    footcta: "Ready to let AI work for you?",
    contact: "Get in touch", contactTitle: "Let's talk", cName: "Name", cCompany: "Company",
    cEmail: "Email", cMsg: "Message", cSend: "Send", cOk: "Thanks! We'll be in touch soon.",
  },
};

/* ---------------- Neural canvas ---------------- */
function NeuralCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let raf, W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -999, y: -999 };
    let nodes = [];
    const N = window.innerWidth < 700 ? 38 : 66;
    function resize() {
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    }
    function init() {
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
      }));
    }
    const D = 150 * dpr;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        const mx = (mouse.x * dpr) - n.x, my = (mouse.y * dpr) - n.y;
        const md = Math.hypot(mx, my);
        if (md < 120 * dpr && md > 0) { n.x -= (mx / md) * 1.1; n.y -= (my / md) * 1.1; }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < D) {
            ctx.strokeStyle = `rgba(91,94,246,${(1 - d / D) * 0.32})`;
            ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = "rgba(150,154,255,0.75)";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.7 * dpr, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    resize(); init(); frame();
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onResize = () => { resize(); init(); };
    addEventListener("mousemove", onMove); addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener("mousemove", onMove); removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} className="lp-canvas" />;
}

/* ---------------- Chat demo ---------------- */
const CHAT = {
  pl: [["u", "Cześć! Macie wolny termin w sobotę?"], ["a", "Cześć! 👋 Tak, mamy wolne o 12:00 i 15:30. Którą wybierasz?"], ["u", "15:30 proszę"], ["a", "Zarezerwowane na 15:30 ✅ Do zobaczenia!"]],
  en: [["u", "Hi! Any free slot on Saturday?"], ["a", "Hi! 👋 Yes — 12:00 and 15:30 are open. Which one?"], ["u", "15:30 please"], ["a", "Booked for 15:30 ✅ See you!"]],
};
function ChatDemo({ lang }) {
  const data = CHAT[lang] || CHAT.pl;
  const [n, setN] = useState(0);
  const [ch, setCh] = useState(0);
  const channels = ["Web", "Instagram", "WhatsApp", "Facebook"];
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= data.length ? 0 : x + 1)), 1400);
    return () => clearInterval(id);
  }, [data.length]);
  useEffect(() => { const id = setInterval(() => setCh((x) => (x + 1) % channels.length), 1800); return () => clearInterval(id); }, []);
  return (
    <div className="lp-demo">
      <div className="lp-demo-head"><span className="d" /><span className="d" /><span className="d" /></div>
      <div className="lpc">{data.slice(0, n).map((m, i) => <div key={i} className={"lpc-b " + m[0]}>{m[1]}</div>)}</div>
      <div className="lpc-channels">{channels.map((c, i) => <span key={c} className={"lpc-ch" + (i === ch ? " on" : "")}>{c}</span>)}</div>
    </div>
  );
}

/* ---------------- Lead demo ---------------- */
function LeadDemo({ lang }) {
  const steps = lang === "en"
    ? ["Finding companies", "Writing the offer", "Awaiting reply", "Positive reply — take over"]
    : ["Znajduję firmy", "Piszę ofertę", "Czekam na odpowiedź", "Pozytywna odpowiedź — przejmij"];
  const [active, setActive] = useState(0);
  useEffect(() => { const id = setInterval(() => setActive((x) => (x + 1) % (steps.length + 1)), 1300); return () => clearInterval(id); }, [steps.length]);
  return (
    <div className="lp-demo">
      <div className="lp-demo-head"><span className="d" /><span className="d" /><span className="d" /></div>
      <div className="lpl-steps">
        {steps.map((s, i) => (
          <div key={i} className={"lpl-step" + (i < active ? " done" : i === active ? " on" : "")}>
            <span className="lpl-num">{i < active ? "✓" : i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Content demo ---------------- */
const CONTENT = {
  pl: {
    Instagram: "🌸 Wiosna w pełni! -20% na cały zabieg do końca tygodnia. Rezerwuj online w 30 sekund 👉 #beauty #wiosna",
    Facebook: "Masz ochotę na metamorfozę? ✨ Tylko teraz -20% na wszystkie zabiegi. Napisz do nas — dobierzemy idealny termin!",
    LinkedIn: "Jak zwiększyliśmy liczbę rezerwacji o 38% dzięki automatyzacji? 3 wnioski z ostatniego kwartału ⬇️",
  },
  en: {
    Instagram: "🌸 Spring is here! -20% on the full treatment till Sunday. Book online in 30s 👉 #beauty #spring",
    Facebook: "Fancy a makeover? ✨ -20% on all treatments, now only. Message us — we'll find the perfect slot!",
    LinkedIn: "How we grew bookings by 38% with automation — 3 takeaways from last quarter ⬇️",
  },
};
function ContentDemo({ lang }) {
  const map = CONTENT[lang] || CONTENT.pl;
  const formats = Object.keys(map);
  const [fi, setFi] = useState(0);
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const full = map[formats[fi]];
    let i = 0; setTxt("");
    const type = setInterval(() => {
      i++; setTxt(full.slice(0, i));
      if (i >= full.length) { clearInterval(type); setTimeout(() => setFi((x) => (x + 1) % formats.length), 1800); }
    }, 28);
    return () => clearInterval(type);
  }, [fi, lang]);
  return (
    <div className="lp-demo">
      <div className="lpct-tabs">{formats.map((f, i) => <span key={f} className={"lpct-tab" + (i === fi ? " on" : "")}>{f}</span>)}</div>
      <div className="lpct-body">{txt}<span className="lpct-cursor" /></div>
    </div>
  );
}

const Check = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

function Feature({ rev, eye, h, p, list, demo }) {
  return (
    <div className={"lp-feat" + (rev ? " rev" : "")}>
      <div className="lp-feat-text">
        <div className="lp-eyebrow">{eye}</div>
        <h2 className="lp-h2">{h}</h2>
        <p>{p}</p>
        <ul className="lp-feat-list">{list.map((x, i) => <li key={i}><Check />{x}</li>)}</ul>
      </div>
      <div>{demo}</div>
    </div>
  );
}

export default function Landing() {
  const { lang, setLang } = useT();
  const c = L[lang] || L.pl;
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { const f = () => setScrolled(scrollY > 10); addEventListener("scroll", f); return () => removeEventListener("scroll", f); }, []);

  return (
    <div className="lp">
      <nav className={"lp-nav" + (scrolled ? " scrolled" : "")}>
        <Logo height={42} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
        <div className="spacer" style={{ flex: 1 }} />
        <div className="lp-actions">
          <ThemeToggle />
          <button className="btn ghost sm" onClick={() => setLang(lang === "pl" ? "en" : "pl")}><Icon.globe /> {lang === "pl" ? "PL" : "EN"}</button>
          <Link to="/login" className="btn primary">{c.panel}</Link>
        </div>
        <button className="lp-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu"><Icon.menu /></button>
        {navOpen && (
          <div className="lp-menu" onClick={() => setNavOpen(false)}>
            <button className="btn ghost block" onClick={() => setLang(lang === "pl" ? "en" : "pl")}><Icon.globe /> {lang === "pl" ? "Polski" : "English"}</button>
            <button className="btn ghost block" onClick={toggle}>{theme === "dark" ? <><Icon.sun /> Light</> : <><Icon.moon /> Dark</>}</button>
            <Link to="/login" className="btn primary block">{c.panel}</Link>
          </div>
        )}
      </nav>

      <main className="lp-main">
        <header className="lp-hero">
          <h1 className="lp-h1">{c.h1a} <span className="lp-grad">{c.h1b}</span></h1>
          <p className="lp-sub">{c.sub}</p>
          <div className="lp-cta">
            <Link to="/login" className="btn primary lp-big"><Icon.bolt /> {c.panel}</Link>
            <a href="#chatbot" className="btn lp-big">{c.try}</a>
          </div>
          <div className="lp-chips">{c.chips.map((x) => <span key={x} className="lp-chip">{x}</span>)}</div>
        </header>

        <div className="lp-wrap">
          <section id="chatbot" className="lp-sec">
            <Feature eye={c.f1eye} h={c.f1h} p={c.f1p} list={c.f1l} demo={<ChatDemo lang={lang} />} />
          </section>
          <section className="lp-sec">
            <Feature rev eye={c.f2eye} h={c.f2h} p={c.f2p} list={c.f2l} demo={<LeadDemo lang={lang} />} />
          </section>
          <section className="lp-sec">
            <Feature eye={c.f3eye} h={c.f3h} p={c.f3p} list={c.f3l} demo={<ContentDemo lang={lang} />} />
          </section>

          <section className="lp-sec">
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div className="lp-eyebrow">{c.hweye}</div>
              <h2 className="lp-h2">{c.hwh}</h2>
            </div>
            <div className="lp-steps3">
              {c.steps.map(([t1, t2], i) => (
                <div key={i} className="lp-step3"><div className="n">0{i + 1}</div><h3 style={{ margin: "8px 0 6px", fontSize: 18 }}>{t1}</h3><p className="muted small">{t2}</p></div>
              ))}
            </div>
          </section>

          <section className="lp-sec" style={{ textAlign: "center" }}>
            <h2 className="lp-h2" style={{ marginBottom: 22 }}>{c.footcta}</h2>
            <button className="btn primary lp-big" onClick={() => setContactOpen(true)}><Icon.chat /> {c.contact}</button>
          </section>
        </div>
      </main>

      <footer className="lp-foot">
        <Logo height={28} style={{ marginBottom: 12, opacity: .9 }} />
        <div className="small">© 2026 STEADD · Agenci AI dla biznesu</div>
      </footer>

      {contactOpen && <ContactModal c={c} onClose={() => setContactOpen(false)} />}
      <LandingChat />
    </div>
  );
}
