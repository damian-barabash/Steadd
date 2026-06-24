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

/* bilingual copy — client offer wording */
const L = {
  pl: {
    panel: "Panel",
    eyebrow: "Agenci AI dla biznesu",
    h1a: "Twój zespół AI.", h1b: "Pracuje, kiedy Ty śpisz.",
    sub: "Wdrażamy agentów AI, którzy odpowiadają klientom, dowożą leady i tworzą treści — automatycznie, dzień i noc. Bez etatów, bez chaosu.",
    cta1: "Umów bezpłatną konsultację", cta2: "Zobacz, jak to działa",
    trust: "Wdrożenie w 2 tygodnie · Bez długich umów · Pełne wsparcie po polsku",

    probEye: "Dla kogo", probH: "Mała firma, a obowiązków jak w korporacji?",
    probP1: "Wiadomości od klientów spływają po godzinach. Wartościowe leady stygną, zanim ktokolwiek oddzwoni. Treści na social media i stronę powstają „kiedyś, jak będzie czas” — czyli nigdy.",
    probP2: "Nie potrzebujesz kolejnego narzędzia, które trzeba obsługiwać. Potrzebujesz kogoś, kto po prostu zrobi robotę. Tym kimś jest agent AI od STEADD.",

    srvEye: "Zakres usług", srvH: "Trzy sposoby, w jakie AI odciąża Twój biznes",
    srv: [
      { t: "Agent AI — obsługa klienta non-stop",
        p: "Inteligentny asystent, który odpowiada na pytania klientów na stronie, w mailu i na social mediach — w Twoim tonie i według Twojej wiedzy. Zna ofertę, umawia spotkania, kwalifikuje zapytania. Klient dostaje odpowiedź w sekundy, a Ty odzyskujesz godziny.",
        pills: ["Odpowiedź w sekundy", "Strona, mail i social media", "Mniej pracy ręcznej"] },
      { t: "Pozyskiwanie leadów B2B",
        p: "Agent, który wyszukuje, kwalifikuje i kontaktuje potencjalnych klientów za Ciebie. Buduje listę firm pasujących do Twojego profilu, personalizuje pierwszą wiadomość i podaje Ci do ręki gotowe, „ciepłe” kontakty. Ty zajmujesz się tylko rozmowami, które mają sens.",
        pills: ["Lista dopasowanych firm", "Spersonalizowana wiadomość", "Ciepłe kontakty"] },
      { t: "Tworzenie treści",
        p: "Posty, opisy produktów, newslettery, teksty na stronę — generowane regularnie i spójnie z Twoją marką. Koniec z pustym kalendarzem publikacji i syndromem białej kartki. Treści gotowe do akceptacji jednym kliknięciem.",
        pills: ["Posty, opisy, newslettery", "Spójny głos marki", "Gotowe jednym kliknięciem"] },
    ],

    howEye: "Jak to działa", howH: "Od rozmowy do działającego agenta — w 3 krokach",
    how: [
      ["Poznajemy Twój biznes", "Krótka rozmowa, w której rozumiemy, jak działasz, kim są Twoi klienci i gdzie tracisz najwięcej czasu."],
      ["Budujemy i wdrażamy agenta", "Konfigurujemy agenta pod Twoje procesy i podłączamy go tam, gdzie są Twoi klienci. Całą techniczną stronę bierzemy na siebie."],
      ["Agent pracuje, Ty rośniesz", "Od pierwszego dnia agent działa w tle. My monitorujemy wyniki i dopracowujemy go, żeby był coraz skuteczniejszy."],
    ],

    whyEye: "Dlaczego STEADD", whyH: "Dlaczego firmy wybierają STEADD",
    why: [
      ["Stworzone dla MŚP, nie dla korporacji", "Żadnych miesięcznych wdrożeń i działów IT. Rozwiązania skrojone na realia małej i średniej firmy."],
      ["Dowozimy efekt, nie technologię", "Nie sprzedajemy „AI”. Sprzedajemy więcej odebranych zapytań, więcej leadów i więcej opublikowanych treści."],
      ["Wsparcie po polsku, na luzie", "Realny człowiek po drugiej stronie, który tłumaczy bez żargonu i jest dostępny, gdy go potrzebujesz."],
      ["Szybki start, elastyczne warunki", "Pierwsze efekty w tygodnie, nie miesiące. Bez wieloletnich zobowiązań."],
    ],

    statEye: "Efekty", statH: "Liczby mówią same za siebie",
    stat: [["24/7", "Twoi klienci obsłużeni o każdej porze"], ["−70%", "czasu na ręczną obsługę zapytań"], ["3×", "więcej wykwalifikowanych leadów miesięcznie"]],
    statNote: "* Wartości poglądowe — do uzupełnienia realnymi wynikami i opiniami klientów.",

    faqEye: "FAQ", faqH: "Najczęstsze pytania",
    faq: [
      ["Czy muszę znać się na AI?", "Nie. Całą konfigurację i obsługę techniczną bierzemy na siebie. Ty korzystasz z gotowego efektu."],
      ["Czy agent będzie brzmiał jak moja firma?", "Tak. Uczymy go Twojego tonu, oferty i zasad, więc komunikacja jest spójna z Twoją marką."],
      ["Ile to kosztuje?", "Wycena zależy od zakresu. Na bezpłatnej konsultacji pokazujemy konkretne rozwiązanie i jasną cenę — bez ukrytych kosztów."],
      ["Jak szybko zobaczę efekty?", "Standardowe wdrożenie zajmuje około 2 tygodni. Pierwsze rezultaty widać od razu po starcie."],
    ],

    ctaEye: "Następny krok", ctaH: "Sprawdź, co STEADD AI może zrobić dla Twojej firmy",
    ctaP: "Umów bezpłatną, niezobowiązującą konsultację. Pokażemy Ci konkretnie, gdzie agent AI odciąży Twój zespół i przyniesie efekty.",
    ctaBtn: "Umów konsultację",

    contact: "Skontaktuj się", contactTitle: "Porozmawiajmy", cName: "Imię", cCompany: "Firma",
    cEmail: "E-mail", cMsg: "Wiadomość", cSend: "Wyślij", cOk: "Dziękujemy! Odezwiemy się wkrótce.",
    footTag: "Agenci AI dla biznesu",
  },
  en: {
    panel: "Panel",
    eyebrow: "AI agents for business",
    h1a: "Your AI team.", h1b: "Working while you sleep.",
    sub: "We deploy AI agents that answer customers, deliver leads and create content — automatically, day and night. No extra headcount, no chaos.",
    cta1: "Book a free consultation", cta2: "See how it works",
    trust: "Live in 2 weeks · No long contracts · Full support in Polish",

    probEye: "Who it's for", probH: "A small company with a corporation's workload?",
    probP1: "Customer messages pile up after hours. Valuable leads go cold before anyone calls back. Content for social media and your website happens “someday, when there's time” — meaning never.",
    probP2: "You don't need another tool to operate. You need someone who simply gets the job done. That someone is an AI agent from STEADD.",

    srvEye: "What we do", srvH: "Three ways AI takes work off your plate",
    srv: [
      { t: "AI agent — customer support non-stop",
        p: "An intelligent assistant that answers customer questions on your site, by email and on social media — in your tone and from your knowledge. It knows your offer, books meetings and qualifies inquiries. Customers get an answer in seconds, and you get hours back.",
        pills: ["Answers in seconds", "Site, email & social", "Less manual work"] },
      { t: "B2B lead generation",
        p: "An agent that finds, qualifies and contacts potential clients for you. It builds a list of companies matching your profile, personalizes the first message and hands you ready, “warm” contacts. You only handle conversations that make sense.",
        pills: ["Matched company list", "Personalized outreach", "Warm contacts"] },
      { t: "Content creation",
        p: "Posts, product descriptions, newsletters, website copy — generated regularly and consistently with your brand. No more empty content calendar or blank-page syndrome. Content ready to approve in one click.",
        pills: ["Posts, copy, newsletters", "Consistent brand voice", "Ready in one click"] },
    ],

    howEye: "How it works", howH: "From a call to a working agent — in 3 steps",
    how: [
      ["We get to know your business", "A short call to understand how you work, who your clients are and where you lose the most time."],
      ["We build and deploy the agent", "We configure the agent around your processes and connect it where your clients are. We handle the entire technical side."],
      ["The agent works, you grow", "From day one the agent runs in the background. We monitor results and keep refining it to be more effective."],
    ],

    whyEye: "Why STEADD", whyH: "Why companies choose STEADD",
    why: [
      ["Built for SMBs, not corporations", "No multi-month rollouts or IT departments. Solutions tailored to the reality of a small and mid-sized company."],
      ["We deliver results, not technology", "We don't sell “AI”. We sell more inquiries answered, more leads and more content published."],
      ["Support in Polish, no jargon", "A real person on the other side who explains without jargon and is there when you need them."],
      ["Fast start, flexible terms", "First results in weeks, not months. No multi-year commitments."],
    ],

    statEye: "Results", statH: "The numbers speak for themselves",
    stat: [["24/7", "Customers served at any hour"], ["−70%", "time spent on manual inquiry handling"], ["3×", "more qualified leads per month"]],
    statNote: "* Indicative values — to be replaced with real results and client testimonials.",

    faqEye: "FAQ", faqH: "Frequently asked questions",
    faq: [
      ["Do I need to know AI?", "No. We handle all configuration and technical operation. You just enjoy the finished result."],
      ["Will the agent sound like my company?", "Yes. We teach it your tone, offer and rules, so communication stays consistent with your brand."],
      ["How much does it cost?", "Pricing depends on scope. In the free consultation we show a concrete solution and a clear price — with no hidden costs."],
      ["How fast will I see results?", "A standard rollout takes about 2 weeks. First results are visible right after launch."],
    ],

    ctaEye: "Next step", ctaH: "See what STEADD AI can do for your business",
    ctaP: "Book a free, no-obligation consultation. We'll show you exactly where an AI agent will relieve your team and bring results.",
    ctaBtn: "Book a consultation",

    contact: "Get in touch", contactTitle: "Let's talk", cName: "Name", cCompany: "Company",
    cEmail: "Email", cMsg: "Message", cSend: "Send", cOk: "Thanks! We'll be in touch soon.",
    footTag: "AI agents for business",
  },
};

/* ---------------- Hero neural canvas (white lines on the blue band) ---------------- */
function HeroCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, host = cv.parentElement, ctx = cv.getContext("2d");
    const coarse = matchMedia("(pointer: coarse)").matches;
    let raf, W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -999, y: -999 };
    let nodes = [];
    function resize() {
      const r = host.getBoundingClientRect();
      W = cv.width = r.width * dpr; H = cv.height = r.height * dpr;
      cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
      const N = r.width < 700 ? 30 : 54;
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .22 * dpr, vy: (Math.random() - .5) * .22 * dpr,
      }));
    }
    const D = () => 150 * dpr;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const d = D();
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        if (!coarse) {
          const mx = (mouse.x * dpr) - n.x, my = (mouse.y * dpr) - n.y, md = Math.hypot(mx, my);
          if (md < 130 * dpr && md > 0) { n.x -= (mx / md) * 1.1; n.y -= (my / md) * 1.1; }
        }
      }
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j], dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < d) {
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dd / d) * 0.30})`;
            ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      for (const n of nodes) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.7 * dpr, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    resize(); frame();
    const onMove = (e) => { const r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -999; mouse.y = -999; };
    if (!coarse) { host.addEventListener("mousemove", onMove); host.addEventListener("mouseleave", onLeave); }
    addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); host.removeEventListener("mousemove", onMove); host.removeEventListener("mouseleave", onLeave); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="lp-hero-canvas" aria-hidden="true" />;
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

/* ---------------- Service pillar ---------------- */
function Pillar({ i, rev, item, demo }) {
  return (
    <div className={"lp-pillar" + (rev ? " rev" : "")}>
      <div className="lp-pillar-text">
        <div className="lp-num">0{i + 1}</div>
        <h3 className="lp-pillar-h">{item.t}</h3>
        <p>{item.p}</p>
        <div className="lp-pills">{item.pills.map((x) => <span key={x} className="lp-pill">{x}</span>)}</div>
      </div>
      <div className="lp-pillar-demo">{demo}</div>
    </div>
  );
}

/* ---------------- FAQ accordion ---------------- */
function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="lp-faq">
      {items.map(([q, a], i) => (
        <div key={i} className={"lp-faq-item" + (open === i ? " open" : "")}>
          <button className="lp-faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{q}</span>
            <span className="lp-faq-ic" aria-hidden="true">+</span>
          </button>
          <div className="lp-faq-a"><div>{a}</div></div>
        </div>
      ))}
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
  const demos = [<ChatDemo lang={lang} />, <LeadDemo lang={lang} />, <ContentDemo lang={lang} />];

  return (
    <div className="lp">
      <nav className={"lp-nav" + (scrolled ? " scrolled" : "")}>
        <Logo height={40} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
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
        {/* ===== HERO (blue band) ===== */}
        <header className="lp-band lp-hero">
          <HeroCanvas />
          <div className="lp-hero-inner">
            <div className="lp-eyebrow onband">{c.eyebrow}</div>
            <h1 className="lp-h1">{c.h1a}<br />{c.h1b}</h1>
            <p className="lp-sub onband">{c.sub}</p>
            <div className="lp-cta">
              <button className="btn lp-big lp-btn-light" onClick={() => setContactOpen(true)}><Icon.bolt /> {c.cta1}</button>
              <a href="#services" className="btn lp-big lp-btn-ghostlight">{c.cta2} ↓</a>
            </div>
            <div className="lp-trust">{c.trust}</div>
          </div>
        </header>

        <div className="lp-wrap">
          {/* ===== PROBLEM ===== */}
          <section className="lp-sec lp-narrow">
            <div className="lp-eyebrow">{c.probEye}</div>
            <h2 className="lp-h2">{c.probH}</h2>
            <p className="lp-lead">{c.probP1}</p>
            <p className="lp-lead" style={{ marginTop: 16 }}>{c.probP2}</p>
          </section>

          {/* ===== SERVICES ===== */}
          <section id="services" className="lp-sec">
            <div className="lp-sec-head">
              <div className="lp-eyebrow">{c.srvEye}</div>
              <h2 className="lp-h2">{c.srvH}</h2>
            </div>
            <div className="lp-pillars">
              {c.srv.map((item, i) => <Pillar key={i} i={i} rev={i % 2 === 1} item={item} demo={demos[i]} />)}
            </div>
          </section>

          {/* ===== HOW IT WORKS ===== */}
          <section className="lp-sec">
            <div className="lp-sec-head">
              <div className="lp-eyebrow">{c.howEye}</div>
              <h2 className="lp-h2">{c.howH}</h2>
            </div>
            <div className="lp-steps3">
              {c.how.map(([t, d], i) => (
                <div key={i} className="lp-step3"><div className="n">0{i + 1}</div><h3>{t}</h3><p className="muted">{d}</p></div>
              ))}
            </div>
          </section>

          {/* ===== WHY STEADD ===== */}
          <section className="lp-sec">
            <div className="lp-sec-head">
              <div className="lp-eyebrow">{c.whyEye}</div>
              <h2 className="lp-h2">{c.whyH}</h2>
            </div>
            <div className="lp-why">
              {c.why.map(([t, d], i) => (
                <div key={i} className="lp-why-card"><div className="lp-why-bar" /><h3>{t}</h3><p className="muted">{d}</p></div>
              ))}
            </div>
          </section>

          {/* ===== STATS ===== */}
          <section className="lp-sec">
            <div className="lp-sec-head">
              <div className="lp-eyebrow">{c.statEye}</div>
              <h2 className="lp-h2">{c.statH}</h2>
            </div>
            <div className="lp-stats3">
              {c.stat.map(([v, l], i) => (
                <div key={i} className="lp-statcard"><div className="v">{v}</div><div className="l">{l}</div></div>
              ))}
            </div>
            <p className="lp-note">{c.statNote}</p>
          </section>

          {/* ===== FAQ ===== */}
          <section className="lp-sec lp-narrow">
            <div className="lp-eyebrow">{c.faqEye}</div>
            <h2 className="lp-h2" style={{ marginBottom: 22 }}>{c.faqH}</h2>
            <Faq items={c.faq} />
          </section>
        </div>

        {/* ===== FINAL CTA (blue band) ===== */}
        <section className="lp-band lp-cta-band">
          <div className="lp-eyebrow onband">{c.ctaEye}</div>
          <h2 className="lp-h2 onband-h">{c.ctaH}</h2>
          <p className="lp-sub onband" style={{ margin: "0 auto 28px" }}>{c.ctaP}</p>
          <button className="btn lp-big lp-btn-light" onClick={() => setContactOpen(true)}><Icon.chat /> {c.ctaBtn} →</button>
          <div className="lp-contactline">
            <a href="mailto:jakub@steadd.pl">jakub@steadd.pl</a>
            <span>·</span>
            <a href="tel:+48797176416">+48 797 176 416</a>
            <span>·</span>
            <a href="https://steadd.pl">steadd.pl</a>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <Logo height={28} style={{ marginBottom: 12, opacity: .9 }} />
        <div className="small">© 2026 STEADD · {c.footTag}</div>
      </footer>

      {contactOpen && <ContactModal c={c} onClose={() => setContactOpen(false)} />}
      <LandingChat />
    </div>
  );
}
