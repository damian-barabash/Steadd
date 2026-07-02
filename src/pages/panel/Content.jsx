import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { Field, Spinner, useToast, copyText, Icon, SkeletonList, PageHead, EmptyState } from "../../components/ui";

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
      <p className="small muted" style={{ margin: "0 0 12px" }}>{t("img.hint")}</p>
      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("img.prompt")} onKeyDown={(e) => e.key === "Enter" && gen()} />
        <button className="btn primary" onClick={gen} disabled={busy || !prompt.trim()}>{busy ? <Spinner /> : <><Icon.bolt /> {t("img.generate")}</>}</button>
      </div>
      {items.length === 0 ? <EmptyState icon={Icon.image} title={t("img.emptyTitle")} text={t("img.none")} /> : (
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

  const examples = [t("content.ex1"), t("content.ex2"), t("content.ex3")];

  return (
    <div className="content">
      <PageHead title={t("content.title")} sub={t("page.sub.content")} project={project.name} />

      <div className="gen-layout">
        <div className="card">
          <Field label={t("content.topic")} step={1}>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="np. Promocja wiosenna -20%…" />
            <div className="chips" style={{ marginTop: 8 }}>
              <span className="small muted" style={{ alignSelf: "center" }}>{t("content.examples")}</span>
              {examples.map((ex) => (
                <button key={ex} type="button" className="chip ex" onClick={() => setTopic(ex)}>{ex}</button>
              ))}
            </div>
          </Field>
          <Field label={t("content.format")} step={2}>
            <div className="chips">
              {FORMATS.map((f) => (
                <button key={f} type="button" className={"chip" + (format === f ? " on" : "")} onClick={() => setFormat(f)}>
                  {t("content.fmt." + f)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("content.brief")} step={3} hint={t("common.optional")}>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} style={{ minHeight: 60 }} placeholder="np. wspomnij o darmowej dostawie…" />
          </Field>
          <button className="btn primary block" onClick={generate} disabled={busy || !topic.trim()}>
            {busy ? <><Spinner /> {t("content.generating")}</> : <><Icon.bolt /> {t("content.generate")}</>}
          </button>
        </div>

        <div>
          <div className="section-title">{t("content.drafts")}</div>
          {loading ? <SkeletonList n={3} h={90} /> : items.length === 0 ? (
            <EmptyState icon={Icon.content} title={t("content.emptyTitle")} text={t("content.emptyText")} />
          ) : (
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
                    : <div className="row" style={{ alignItems: "center", color: "var(--muted)" }}><Spinner /> <span className="small">{t("content.working")}</span></div>}
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
