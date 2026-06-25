import { createContext, useContext, useState, useCallback } from "react";

const DICT = {
  pl: {
    // generic
    "app.tagline": "Agenci AI dla Twojego biznesu",
    "nav.panel": "Panel", "nav.login": "Zaloguj się", "nav.logout": "Wyloguj",
    "common.save": "Zapisz", "common.cancel": "Anuluj", "common.create": "Utwórz",
    "common.delete": "Usuń", "common.edit": "Edytuj", "common.add": "Dodaj",
    "common.loading": "Ładowanie…", "common.none": "Brak", "common.search": "Szukaj",
    "common.send": "Wyślij", "common.generate": "Generuj", "common.status": "Status",
    "common.name": "Nazwa", "common.email": "E-mail", "common.password": "Hasło",
    "common.close": "Zamknij", "common.confirm": "Potwierdź", "common.copy": "Kopiuj",
    "common.copied": "Skopiowano", "common.optional": "opcjonalnie", "common.actions": "Akcje",
    "common.back": "Wstecz", "common.open": "Otwórz", "common.refresh": "Odśwież",
    // login
    "login.title": "Zaloguj się do panelu", "login.submit": "Zaloguj się",
    "login.error": "Błędny e-mail lub hasło", "login.back": "← Strona główna",
    // sidebar / tabs
    "tab.dashboard": "Przegląd", "tab.chatbot": "Chatbot", "tab.leads": "Pozyskiwanie leadów",
    "tab.content": "Treści", "tab.knowledge": "Biznes i baza wiedzy", "tab.settings": "Ustawienia",
    "tab.admin": "Administracja", "inq.title": "Zgłoszenia",
    // project switcher
    "switch.viewing": "Projekt", "switch.viewAs": "Podgląd klienta", "switch.allProjects": "Wszystkie projekty",
    "noproject.title": "Projekt jest podłączany",
    "noproject.text": "Twoje konto nie ma jeszcze podłączonego projektu. Poczekaj — wkrótce go aktywujemy.",
    // dashboard
    "dash.welcome": "Witaj", "dash.activity": "Aktywność agentów", "dash.live": "Na żywo",
    "dash.noactivity": "Brak aktywności. Uruchom agenta z jednej z zakładek.",
    "dash.stat.conversations": "Rozmowy", "dash.stat.leads": "Leady", "dash.stat.content": "Treści",
    "dash.stat.jobs": "Zadania w toku",
    // chatbot
    "bot.title": "Chatbot", "bot.channels": "Kanały", "bot.archetypes": "Archetypy komunikacji",
    "bot.instructions": "Instrukcje", "bot.contacts": "Baza klientów", "bot.conversations": "Rozmowy",
    "bot.connect": "Podłącz", "bot.connected": "Podłączony", "bot.pending": "Oczekuje",
    "bot.disconnected": "Wyłączony", "bot.embed": "Kod do wstawienia na stronę",
    "bot.embedHint": "Wklej ten kod przed </body> na swojej stronie — chatbot pojawi się od razu.",
    "bot.newArchetype": "Nowy archetyp", "bot.archName": "Nazwa archetypu",
    "bot.archDesc": "Opis", "bot.archInstr": "Instrukcje systemowe (jak ma rozmawiać)",
    "bot.default": "Domyślny", "bot.source": "Źródło", "bot.archetype": "Archetyp",
    "bot.importContacts": "Importuj (CSV/TSV)", "bot.contactsHint": "Wklej dane: imię, e-mail, telefon, firma — po jednym w wierszu (tab/przecinek).",
    "bot.noConversations": "Brak rozmów.", "bot.testWidget": "Przetestuj chatbota",
    "bot.appearance": "Wygląd widżetu", "bot.color": "Kolor", "bot.radius": "Zaokrąglenie",
    "bot.position": "Pozycja", "bot.posRight": "Prawy dół", "bot.posLeft": "Lewy dół",
    "bot.wTitle": "Tytuł okna", "bot.wWelcome": "Powitanie", "bot.preview": "Podgląd", "bot.saveAppearance": "Zapisz wygląd",
    // leads
    "leads.title": "Pozyskiwanie leadów", "leads.campaigns": "Kampanie", "leads.newCampaign": "Nowa kampania",
    "leads.goal": "Po co Ci leady? (opisz cel)", "leads.region": "Region", "leads.template": "Szablon wiadomości",
    "leads.templateHint": "Zostaw puste — AI napisze wiadomość samo.", "leads.channels": "Kanały",
    "leads.dailyCap": "Limit dzienny", "leads.run": "Uruchom agenta", "leads.list": "Leady",
    "leads.autoDaily": "Codziennie automatycznie",
    "leads.noLeads": "Brak leadów. Uruchom kampanię.", "leads.company": "Firma", "leads.contact": "Kontakt",
    "leads.thread": "Korespondencja", "leads.noThread": "Brak wiadomości.",
    "leads.st.found": "Znaleziony", "leads.st.contacted": "Napisano", "leads.st.awaiting_reply": "Czeka na odpowiedź",
    "leads.st.replied_positive": "Pozytywna odpowiedź", "leads.st.replied_negative": "Negatywna odpowiedź",
    "leads.st.done": "Zakończone (przejmij)", "leads.st.handed_off": "Przekazane", "leads.st.rejected": "Odrzucony",
    "leads.flow": "Agent znajduje firmy, pisze ofertę, czeka na odpowiedź i ją klasyfikuje. Po pierwszej odpowiedzi oznacza leada jako gotowego — dalej rozmawiasz sam.",
    // content
    "content.title": "Generowanie treści", "content.topic": "Temat", "content.format": "Format",
    "content.brief": "Dodatkowe wskazówki", "content.generate": "Generuj treść", "content.drafts": "Wersje robocze",
    "content.noDrafts": "Brak treści. Wpisz temat i wygeneruj.", "content.generating": "Generuję…",
    "content.fmt.instagram_post": "Post na Instagram", "content.fmt.facebook_post": "Post na Facebook",
    "content.fmt.linkedin_post": "Post na LinkedIn", "content.fmt.blog_article": "Artykuł blog",
    "content.fmt.email": "E-mail", "content.fmt.x_tweet": "Wątek X", "content.fmt.story": "Story", "content.fmt.ad_copy": "Reklama",
    "content.st.draft": "Wersja robocza", "content.st.approved": "Zatwierdzone", "content.st.published": "Opublikowane",
    "img.title": "Generowanie obrazów (AI)", "img.prompt": "Opisz obraz… np. elegancki bukiet w studiu, miękkie światło",
    "img.generate": "Generuj obraz", "img.none": "Brak obrazów. Opisz i wygeneruj.", "img.generating": "Generuję obraz…",
    // knowledge
    "kb.title": "Biznes i baza wiedzy", "kb.business": "Informacje o firmie", "kb.docs": "Baza wiedzy",
    "kb.businessName": "Nazwa firmy", "kb.industry": "Branża", "kb.website": "Strona WWW",
    "kb.description": "Opis działalności", "kb.tone": "Ton komunikacji", "kb.audience": "Grupa docelowa",
    "kb.addDoc": "Dodaj dokument", "kb.docTitle": "Tytuł", "kb.docContent": "Treść",
    "kb.noDocs": "Brak dokumentów. AI używa ich, by lepiej znać Twój biznes.", "kb.saved": "Zapisano",
    // settings
    "set.title": "Ustawienia", "set.language": "Język", "set.account": "Konto",
    "set.changePassword": "Zmień hasło", "set.newPassword": "Nowe hasło",
    "acc.title": "Konta projektu", "acc.add": "Dodaj konto", "acc.kind": "Typ", "acc.login": "Login / e-mail",
    "acc.token": "Token / klucz API", "acc.secretHint": "Przechowywane zaszyfrowane (docelowo Vault).",
    "acc.hint": "Osobne konta tego projektu, przez które działają agenci (LinkedIn, e-mail, social).",
    "email.title": "E-mail (Resend)", "email.fromName": "Nazwa nadawcy", "email.fromEmail": "Adres nadawcy",
    "email.apiKey": "Klucz API Resend", "email.keyHint": "Z panelu Resend (re_...). Zweryfikuj domenę nadawcy w Resend.",
    "email.keySet": "Klucz zapisany. Wpisz nowy, aby zmienić.",
    "email.hint": "Z tego adresu agent wysyła oferty w pozyskiwaniu leadów, a odpowiedzi wracają do Ciebie.",
    "mail.editor": "Edytor maili", "mail.logo": "Logo (URL)", "mail.color": "Kolor marki",
    "mail.signature": "Podpis", "mail.footer": "Stopka (np. dane firmy, wypis)", "mail.preview": "Podgląd maila",
    "mail.save": "Zapisz wygląd maila", "mail.sample": "Przykładowa treść oferty wygenerowana przez AI…",
    "mail.upload": "Wgraj logo", "mail.logoHint": "Wklej URL lub wgraj plik graficzny.",
    // admin
    "admin.title": "Administracja", "admin.clients": "Klienci", "admin.projects": "Projekty",
    "admin.admins": "Administratorzy", "admin.newClient": "Nowy klient", "admin.newProject": "Nowy projekt",
    "admin.newAdmin": "Nowy administrator", "admin.linkProject": "Podłącz do projektu",
    "admin.members": "Członkowie", "admin.role": "Rola", "admin.role.admin": "Administrator",
    "admin.role.client": "Klient", "admin.created": "Utworzono", "admin.resetPw": "Resetuj hasło",
    "admin.unlink": "Odłącz", "admin.noClients": "Brak klientów.", "admin.noProjects": "Brak projektów.",
    "admin.projectName": "Nazwa projektu", "admin.confirmDelete": "Na pewno usunąć?",
    "admin.assign": "Przypisz klienta", "admin.fullName": "Imię i nazwisko",
    "admin.features": "Funkcje (sprzedaż osobno lub w pakiecie)",
  },
  en: {
    "app.tagline": "AI agents for your business",
    "nav.panel": "Panel", "nav.login": "Log in", "nav.logout": "Log out",
    "common.save": "Save", "common.cancel": "Cancel", "common.create": "Create",
    "common.delete": "Delete", "common.edit": "Edit", "common.add": "Add",
    "common.loading": "Loading…", "common.none": "None", "common.search": "Search",
    "common.send": "Send", "common.generate": "Generate", "common.status": "Status",
    "common.name": "Name", "common.email": "Email", "common.password": "Password",
    "common.close": "Close", "common.confirm": "Confirm", "common.copy": "Copy",
    "common.copied": "Copied", "common.optional": "optional", "common.actions": "Actions",
    "common.back": "Back", "common.open": "Open", "common.refresh": "Refresh",
    "login.title": "Sign in to the panel", "login.submit": "Sign in",
    "login.error": "Wrong email or password", "login.back": "← Home",
    "tab.dashboard": "Overview", "tab.chatbot": "Chatbot", "tab.leads": "Lead generation",
    "tab.content": "Content", "tab.knowledge": "Business & knowledge", "tab.settings": "Settings",
    "tab.admin": "Administration", "inq.title": "Inquiries",
    "switch.viewing": "Project", "switch.viewAs": "Client view", "switch.allProjects": "All projects",
    "noproject.title": "Your project is being connected",
    "noproject.text": "Your account has no project yet. Hold on — we'll activate it shortly.",
    "dash.welcome": "Welcome", "dash.activity": "Agent activity", "dash.live": "Live",
    "dash.noactivity": "No activity yet. Start an agent from one of the tabs.",
    "dash.stat.conversations": "Conversations", "dash.stat.leads": "Leads", "dash.stat.content": "Content pieces",
    "dash.stat.jobs": "Running jobs",
    "bot.title": "Chatbot", "bot.channels": "Channels", "bot.archetypes": "Communication archetypes",
    "bot.instructions": "Instructions", "bot.contacts": "Customer base", "bot.conversations": "Conversations",
    "bot.connect": "Connect", "bot.connected": "Connected", "bot.pending": "Pending",
    "bot.disconnected": "Disabled", "bot.embed": "Website embed code",
    "bot.embedHint": "Paste this before </body> on your site — the chatbot appears instantly.",
    "bot.newArchetype": "New archetype", "bot.archName": "Archetype name",
    "bot.archDesc": "Description", "bot.archInstr": "System instructions (how it should talk)",
    "bot.default": "Default", "bot.source": "Source", "bot.archetype": "Archetype",
    "bot.importContacts": "Import (CSV/TSV)", "bot.contactsHint": "Paste rows: name, email, phone, company — one per line (tab/comma).",
    "bot.noConversations": "No conversations.", "bot.testWidget": "Test the chatbot",
    "bot.appearance": "Widget appearance", "bot.color": "Color", "bot.radius": "Corner radius",
    "bot.position": "Position", "bot.posRight": "Bottom right", "bot.posLeft": "Bottom left",
    "bot.wTitle": "Window title", "bot.wWelcome": "Welcome message", "bot.preview": "Preview", "bot.saveAppearance": "Save appearance",
    "leads.title": "Lead generation", "leads.campaigns": "Campaigns", "leads.newCampaign": "New campaign",
    "leads.goal": "What do you need leads for? (describe the goal)", "leads.region": "Region", "leads.template": "Message template",
    "leads.templateHint": "Leave empty — the AI writes the message itself.", "leads.channels": "Channels",
    "leads.dailyCap": "Daily cap", "leads.run": "Run agent", "leads.list": "Leads",
    "leads.autoDaily": "Automatically every day",
    "leads.noLeads": "No leads yet. Run a campaign.", "leads.company": "Company", "leads.contact": "Contact",
    "leads.thread": "Correspondence", "leads.noThread": "No messages.",
    "leads.st.found": "Found", "leads.st.contacted": "Contacted", "leads.st.awaiting_reply": "Awaiting reply",
    "leads.st.replied_positive": "Positive reply", "leads.st.replied_negative": "Negative reply",
    "leads.st.done": "Done (take over)", "leads.st.handed_off": "Handed off", "leads.st.rejected": "Rejected",
    "leads.flow": "The agent finds companies, writes an offer, waits for a reply and classifies it. After the first reply it marks the lead as ready — then you take over.",
    "content.title": "Content generation", "content.topic": "Topic", "content.format": "Format",
    "content.brief": "Extra guidance", "content.generate": "Generate content", "content.drafts": "Drafts",
    "content.noDrafts": "No content yet. Enter a topic and generate.", "content.generating": "Generating…",
    "content.fmt.instagram_post": "Instagram post", "content.fmt.facebook_post": "Facebook post",
    "content.fmt.linkedin_post": "LinkedIn post", "content.fmt.blog_article": "Blog article",
    "content.fmt.email": "Email", "content.fmt.x_tweet": "X thread", "content.fmt.story": "Story", "content.fmt.ad_copy": "Ad copy",
    "content.st.draft": "Draft", "content.st.approved": "Approved", "content.st.published": "Published",
    "img.title": "Image generation (AI)", "img.prompt": "Describe an image… e.g. elegant bouquet in a studio, soft light",
    "img.generate": "Generate image", "img.none": "No images yet. Describe and generate.", "img.generating": "Generating image…",
    "kb.title": "Business & knowledge", "kb.business": "Business info", "kb.docs": "Knowledge base",
    "kb.businessName": "Business name", "kb.industry": "Industry", "kb.website": "Website",
    "kb.description": "What the business does", "kb.tone": "Brand tone", "kb.audience": "Target audience",
    "kb.addDoc": "Add document", "kb.docTitle": "Title", "kb.docContent": "Content",
    "kb.noDocs": "No documents. The AI uses them to know your business better.", "kb.saved": "Saved",
    "set.title": "Settings", "set.language": "Language", "set.account": "Account",
    "set.changePassword": "Change password", "set.newPassword": "New password",
    "acc.title": "Project accounts", "acc.add": "Add account", "acc.kind": "Type", "acc.login": "Login / email",
    "acc.token": "Token / API key", "acc.secretHint": "Stored encrypted (Vault in production).",
    "acc.hint": "Separate accounts for this project that the agents act through (LinkedIn, email, social).",
    "email.title": "Email (Resend)", "email.fromName": "Sender name", "email.fromEmail": "Sender address",
    "email.apiKey": "Resend API key", "email.keyHint": "From the Resend dashboard (re_...). Verify your sender domain in Resend.",
    "email.keySet": "Key saved. Enter a new one to change.",
    "email.hint": "The agent sends lead-gen offers from this address; replies come back to you.",
    "mail.editor": "Email editor", "mail.logo": "Logo (URL)", "mail.color": "Brand color",
    "mail.signature": "Signature", "mail.footer": "Footer (e.g. company details, opt-out)", "mail.preview": "Email preview",
    "mail.save": "Save email design", "mail.sample": "Sample AI-generated offer body…",
    "mail.upload": "Upload logo", "mail.logoHint": "Paste a URL or upload an image file.",
    "admin.title": "Administration", "admin.clients": "Clients", "admin.projects": "Projects",
    "admin.admins": "Administrators", "admin.newClient": "New client", "admin.newProject": "New project",
    "admin.newAdmin": "New administrator", "admin.linkProject": "Link to project",
    "admin.members": "Members", "admin.role": "Role", "admin.role.admin": "Administrator",
    "admin.role.client": "Client", "admin.created": "Created", "admin.resetPw": "Reset password",
    "admin.unlink": "Unlink", "admin.noClients": "No clients.", "admin.noProjects": "No projects.",
    "admin.projectName": "Project name", "admin.confirmDelete": "Delete for sure?",
    "admin.assign": "Assign client", "admin.fullName": "Full name",
    "admin.features": "Features (sell separately or bundled)",
  },
};

const LangContext = createContext(null);

// Pick the initial language: a manual choice (saved) always wins; otherwise follow the device
// language — Polish for `pl*`, English for `en*`, and Polish as the fallback for anything else.
function detectInitialLang() {
  const saved = localStorage.getItem("steadd_lang");
  if (saved === "pl" || saved === "en") return saved;
  const candidates = (typeof navigator !== "undefined" && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  for (const c of candidates) {
    const code = String(c || "").toLowerCase().slice(0, 2);
    if (code === "pl") return "pl";
    if (code === "en") return "en";
  }
  return "pl";
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);
  const setLang = useCallback((l) => { localStorage.setItem("steadd_lang", l); setLangState(l); }, []);
  const t = useCallback((key, vars) => {
    let s = DICT[lang]?.[key] ?? DICT.pl[key] ?? key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  }, [lang]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useT = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT outside LangProvider");
  return ctx;
};
