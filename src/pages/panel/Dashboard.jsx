import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProject } from "../../lib/project";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/i18n";
import { SkeletonStats, SkeletonList } from "../../components/ui";

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function Dashboard() {
  const { project } = useProject();
  const { profile } = useAuth();
  const { t } = useT();
  const [stats, setStats] = useState({ conv: 0, leads: 0, content: 0, jobs: 0 });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) return;
    const pid = project.id;
    setLoading(true);
    const count = (table, extra) => {
      let q = supabase.from(table).select("*", { count: "exact", head: true }).eq("project_id", pid);
      if (extra) q = extra(q);
      return q.then((r) => r.count || 0);
    };
    Promise.all([
      count("conversations"), count("leads"), count("content_pieces"),
      count("jobs", (q) => q.in("status", ["queued", "running"])),
    ]).then(([conv, leads, content, jobs]) => setStats({ conv, leads, content, jobs }));

    supabase.from("agent_events").select("*").eq("project_id", pid)
      .order("created_at", { ascending: false }).limit(40)
      .then((r) => { setEvents(r.data || []); setLoading(false); });

    const ch = supabase.channel(`events-${pid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events", filter: `project_id=eq.${pid}` },
        (p) => setEvents((e) => [p.new, ...e].slice(0, 60)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [project]);

  if (!project) return null;
  const lvlColor = { error: "var(--red)", success: "var(--green)", info: "var(--accent)" };

  return (
    <div className="content">
      <h1 className="page-title">{t("dash.welcome")}, {profile?.full_name || profile?.email?.split("@")[0]}</h1>
      <p className="muted" style={{ marginBottom: 22 }}>{project.name}</p>

      {loading ? <div style={{ marginBottom: 22 }}><SkeletonStats /></div> : (
      <div className="stats" style={{ marginBottom: 22 }}>
        <div className="stat"><div className="n">{stats.conv}</div><div className="l">{t("dash.stat.conversations")}</div></div>
        <div className="stat"><div className="n">{stats.leads}</div><div className="l">{t("dash.stat.leads")}</div></div>
        <div className="stat"><div className="n">{stats.content}</div><div className="l">{t("dash.stat.content")}</div></div>
        <div className="stat"><div className="n">{stats.jobs}</div><div className="l">{t("dash.stat.jobs")}</div></div>
      </div>
      )}

      <div className="card">
        <div className="between" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>{t("dash.activity")}</h3>
          <span className="badge green"><span className="dot pulse" /> {t("dash.live")}</span>
        </div>
        {loading ? <SkeletonList n={5} h={18} /> : events.length === 0 ? <p className="muted small">{t("dash.noactivity")}</p> : (
          <div className="grid" style={{ gap: 8 }}>
            {events.map((e) => (
              <div key={e.id} className="row" style={{ alignItems: "baseline", fontSize: 13.5 }}>
                <span className="dot" style={{ color: lvlColor[e.level] || "var(--muted)", marginTop: 6 }} />
                <span style={{ flex: 1 }}>{e.message}</span>
                <span className="muted small mono">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
