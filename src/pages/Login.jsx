import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Spinner, Logo } from "../components/ui";

export default function Login() {
  const { t, lang, setLang } = useT();
  const { session } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) nav("/panel", { replace: true }); }, [session, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(t("login.error"));
    else nav("/panel", { replace: true });
  };

  return (
    <div className="center-screen" style={{ flexDirection: "column", gap: 18 }}>
      <div className="card pad-lg" style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Logo height={38} />
        </div>
        <h3 style={{ textAlign: "center", marginBottom: 18 }}>{t("login.title")}</h3>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label>{t("common.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>{t("common.password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {err && <div className="small" style={{ color: "var(--red)", marginBottom: 12 }}>{err}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? <Spinner /> : t("login.submit")}</button>
        </form>
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        <Link className="btn ghost sm" to="/">{t("login.back")}</Link>
        <button className="btn ghost sm" onClick={() => setLang(lang === "pl" ? "en" : "pl")}>{lang === "pl" ? "EN" : "PL"}</button>
      </div>
    </div>
  );
}
