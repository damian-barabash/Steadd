import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { Field, Spinner, useToast, copyText, Icon, SkeletonList } from "../../components/ui";

const FORMATS = ["instagram_post", "facebook_post", "linkedin_post", "blog_article", "email", "x_tweet", "story", "ad_copy"];

function ImageGen({ project, user }) {
  const { t } = useT();
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const load = () => supabase.from("generated_images").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(24).then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, [project]);
  useEffect(() => {
    const ch = supabase.channel(`img-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_images", filter: `project_id=eq.${project.id}` }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [project]);
  const gen = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const { data: img } = await supabase.from("generated_images").insert({ project_id: project.id, prompt, status: "pending", created_by: user.id }).select().single();
      await supabase.from("jobs").insert({ project_id: project.id, type: "image_generate", payload: { prompt, image_id: img.id }, ref_table: "generated_images", ref_id: img.id, created_by: user.id });
      setPrompt(""); toast(t("img.generating")); load();
    } catch (e) { toast(String(e.message || e), "err"); }
    setBusy(false);
  };
  return (
    <div className="card" style={{ marginTop: 22 }}>
      <div className="section-title">{t("img.title")}</div>
      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("img.prompt")} onKeyDown={(e) => e.key === "Enter" && gen()} />
        <button className="btn primary" onClick={gen} disabled={busy || !prompt.trim()}>{busy ? <Spinner /> : <><Icon.bolt /> {t("img.generate")}</>}</button>
      </div>
      {items.length === 0 ? <p className="muted small">{t("img.none")}</p> : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          {items.map((im) => (
            <div key={im.id} className="card" style={{ padding: 8 }}>
              {im.url ? <img src={im.url} alt={im.prompt} style={{ width: "100%", borderRadius: 8, display: "block" }} />
                : <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}><Spinner /></div>}
              <div className="small muted" style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{im.prompt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Content() {
  const { project } = useProject();
  const { user } = useAuth();
  const { t } = useT();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState("instagram_post");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!project) return;
    supabase.from("content_pieces").select("*").eq("project_id", project.id)
      .order("created_at", { ascending: false }).limit(50)
      .then((r) => { setItems(r.data || []); setLoading(false); });
  };
  useEffect(() => { load(); }, [project]);

  useEffect(() => {
    if (!project) return;
    const ch = supabase.channel(`content-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_pieces", filter: `project_id=eq.${project.id}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [project]);

  const generate = async () => {
    if (!topic.trim() || !project) return;
    setBusy(true);
    try {
      const { data: piece, error } = await supabase.from("content_pieces")
        .insert({ project_id: project.id, topic, brief, format, status: "draft", created_by: user.id })
        .select().single();
      if (error) throw error;
      await supabase.from("jobs").insert({
        project_id: project.id, type: "content_generate",
        payload: { topic, brief, format, content_piece_id: piece.id },
        ref_table: "content_pieces", ref_id: piece.id, created_by: user.id,
      });
      setTopic(""); setBrief("");
      toast(t("content.generate"));
      load();
    } catch (e) {
      toast(String(e.message || e), "err");
    }
    setBusy(false);
  };

  if (!project) return null;

  return (
    <div className="content">
      <h1 className="page-title">{t("content.title")}</h1>
      <p className="muted" style={{ marginBottom: 22 }}>{project.name}</p>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,360px) 1fr", alignItems: "start", gap: 22 }}>
        <div className="card">
          <Field label={t("content.topic")}>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="np. Promocja wiosenna -20%…" />
          </Field>
          <Field label={t("content.format")}>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f} value={f}>{t("content.fmt." + f)}</option>)}
            </select>
          </Field>
          <Field label={t("content.brief")} hint={t("common.optional")}>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} style={{ minHeight: 60 }} />
          </Field>
          <button className="btn primary block" onClick={generate} disabled={busy || !topic.trim()}>
            {busy ? <><Spinner /> {t("content.generating")}</> : <><Icon.bolt /> {t("content.generate")}</>}
          </button>
        </div>

        <div>
          <div className="section-title">{t("content.drafts")}</div>
          {loading ? <SkeletonList n={3} h={90} /> : items.length === 0 ? <p className="muted small">{t("content.noDrafts")}</p> : (
            <div className="grid">
              {items.map((it) => (
                <div key={it.id} className="card">
                  <div className="between" style={{ marginBottom: 8 }}>
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <span className="badge indigo">{t("content.fmt." + it.format)}</span>
                      <span className="badge">{t("content.st." + it.status)}</span>
                    </div>
                    <button className="btn ghost sm" onClick={() => { copyText(it.body || ""); toast(t("common.copied")); }}>{t("common.copy")}</button>
                  </div>
                  <strong style={{ display: "block", marginBottom: 6 }}>{it.title || it.topic}</strong>
                  {it.body
                    ? <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text)" }}>{it.body}</div>
                    : <div className="row" style={{ alignItems: "center", color: "var(--muted)" }}><Spinner /> <span className="small">{t("content.generating")}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImageGen project={project} user={user} />
    </div>
  );
}
