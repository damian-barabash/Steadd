import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useT } from "../../lib/i18n";
import { SkeletonStats, SkeletonCard } from "../../components/ui";

const PERIODS = [7, 30, 90];

function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// "2026-06-28" -> "28.06" (compact axis label)
function dayLabel(iso) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

export default function Analytics() {
  const { t, lang } = useT();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(false);
    supabase.rpc("analytics_summary", { p_days: days }).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setErr(true); setData(null); }
      else setData(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [days]);

  const daily = data?.daily || [];
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.visits, d.pageviews)));
  const hasTraffic = (data?.visits || 0) > 0 || (data?.pageviews || 0) > 0;

  const localeName = (code) => {
    try { return new Intl.DisplayNames([lang], { type: "language" }).of((code || "").slice(0, 2)) || code; }
    catch { return code; }
  };
  const deviceLabel = (d) => d === "mobile" ? t("an.mobile") : d === "desktop" ? t("an.desktop") : d;

  return (
    <div className="content">
      <div className="between" style={{ marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>{t("an.title")}</h1>
          <p className="muted small">{t("an.subtitle")}</p>
        </div>
        <div className="an-period">
          {PERIODS.map((p) => (
            <button key={p} className={"an-period-btn" + (days === p ? " active" : "")} onClick={() => setDays(p)}>
              {t(`an.period${p}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 18 }}>
          <SkeletonStats n={4} />
          <div style={{ marginTop: 18 }}><SkeletonCard lines={6} /></div>
        </div>
      ) : err ? (
        <div className="card pad-lg" style={{ marginTop: 18 }}><p className="muted">{t("an.err")}</p></div>
      ) : (
        <>
          <div className="stats" style={{ marginTop: 18, marginBottom: 18 }}>
            <div className="stat"><div className="n">{data.visits}</div><div className="l">{t("an.visits")}</div></div>
            <div className="stat"><div className="n">{data.pageviews}</div><div className="l">{t("an.pageviews")}</div></div>
            <div className="stat"><div className="n">{fmtDuration(data.avg_seconds)}</div><div className="l">{t("an.avgTime")}</div></div>
            <div className="stat"><div className="n">{data.bounce_rate}%</div><div className="l">{t("an.bounce")}</div></div>
          </div>

          {!hasTraffic ? (
            <div className="card pad-lg"><p className="muted">{t("an.noData")}</p></div>
          ) : (
            <>
              {/* daily chart */}
              <div className="card" style={{ marginBottom: 18 }}>
                <div className="between" style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16 }}>{t("an.daily")}</h3>
                  <div className="an-legend">
                    <span><i className="an-dot v" /> {t("an.visits")}</span>
                    <span><i className="an-dot p" /> {t("an.pageviews")}</span>
                  </div>
                </div>
                <div className="an-chart">
                  {daily.map((d) => (
                    <div key={d.day} className="an-col" title={`${d.day} · ${d.visits} ${t("an.visitsShort")}, ${d.pageviews} ${t("an.viewsShort")}`}>
                      <div className="an-bars">
                        <div className="an-bar v" style={{ height: `${(d.visits / maxDaily) * 100}%` }} />
                        <div className="an-bar p" style={{ height: `${(d.pageviews / maxDaily) * 100}%` }} />
                      </div>
                      <div className="an-xlabel">{dayLabel(d.day)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="an-grid2">
                <BreakdownCard title={t("an.topPages")} rows={(data.top_pages || []).map((r) => ({ label: r.path, value: r.views }))} unit={t("an.viewsShort")} />
                <BreakdownCard title={t("an.referrers")} rows={(data.top_referrers || []).map((r) => ({ label: r.referrer === "(direct)" ? t("an.direct") : r.referrer, value: r.visits }))} unit={t("an.visitsShort")} />
                <BreakdownCard title={t("an.devices")} rows={(data.devices || []).map((r) => ({ label: deviceLabel(r.device), value: r.visits }))} unit={t("an.visitsShort")} />
                <BreakdownCard title={t("an.langs")} rows={(data.langs || []).map((r) => ({ label: localeName(r.lang), value: r.visits }))} unit={t("an.visitsShort")} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownCard({ title, rows, unit }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>{title}</h3>
      {rows.length === 0 ? <p className="muted small">—</p> : (
        <div className="grid" style={{ gap: 9 }}>
          {rows.map((r, i) => (
            <div key={i} className="an-row">
              <div className="an-row-top">
                <span className="an-row-label" title={r.label}>{r.label}</span>
                <span className="an-row-val mono">{r.value} <span className="muted small">{unit}</span></span>
              </div>
              <div className="an-track"><div className="an-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
