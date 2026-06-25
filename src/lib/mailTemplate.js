// Shared, Gmail-safe email compiler for the STEADD admin mailing.
// The CLIENT compiles the final HTML once (so the preview === what is sent) and stores it with
// three tokens the worker fills in per recipient: {{name}} {{email}} {{unsubscribe_url}}.

export const LOGO_URL = "https://steadd.pl/LOGO_STEAD.png";
export const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
const EMAIL_RE_G = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nl2br = (s) => esc(s).replace(/\n/g, "<br>");

/* ---- rich block → table row ---- */
function blockHtml(b, color) {
  switch (b.type) {
    case "heading":
      return `<tr><td style="padding:4px 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#0b0b16">${nl2br(b.text)}</td></tr>`;
    case "text":
      return `<tr><td style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#3a3a4a">${nl2br(b.text)}</td></tr>`;
    case "image": {
      if (!b.url) return "";
      const img = `<img src="${esc(b.url)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:8px;border:0" />`;
      return `<tr><td style="padding:4px 0 18px">${b.link ? `<a href="${esc(b.link)}" target="_blank">${img}</a>` : img}</td></tr>`;
    }
    case "button":
      if (!b.label || !b.url) return "";
      return `<tr><td style="padding:6px 0 20px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:${color}"><a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(b.label)}</a></td></tr></table></td></tr>`;
    case "divider":
      return `<tr><td style="padding:6px 0 22px"><div style="height:1px;background:#e6e8f5;line-height:1px;font-size:0">&nbsp;</div></td></tr>`;
    default:
      return "";
  }
}

function richWrap({ preheader, color, contentRows, signature, footer }) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0;padding:0;background:#eef0f5;-webkit-text-size-adjust:100%">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:26px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8f5">
      <tr><td style="background:${color};padding:22px 32px"><img src="${LOGO_URL}" alt="Steadd" height="26" style="height:26px;display:block;border:0" /></td></tr>
      <tr><td style="padding:30px 32px 6px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${contentRows}</table>
        ${signature ? `<div style="margin-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3a3a4a">${nl2br(signature)}</div>` : ""}
      </td></tr>
      <tr><td style="padding:18px 32px 26px;border-top:1px solid #eef0f5">
        ${footer ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9a9ab0">${nl2br(footer)}</p>` : ""}
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9a9ab0">
          <a href="{{unsubscribe_url}}" style="color:#9a9ab0;text-decoration:underline">Wypisz się z tej listy / Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const UNSUB_FOOTER_HTML =
  `\n<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9a9ab0;text-align:center;padding:18px 12px">` +
  `<a href="{{unsubscribe_url}}" style="color:#9a9ab0;text-decoration:underline">Wypisz się / Unsubscribe</a></div>\n`;

function injectUnsub(rawHtml) {
  if (/{{\s*unsubscribe_url\s*}}/.test(rawHtml)) return rawHtml; // author already placed it
  if (/<\/body>/i.test(rawHtml)) return rawHtml.replace(/<\/body>/i, `${UNSUB_FOOTER_HTML}</body>`);
  return rawHtml + UNSUB_FOOTER_HTML;
}

/* ---- plain-text alternative (improves deliverability) ---- */
function richText(blocks, signature, footer) {
  const lines = [];
  for (const b of blocks) {
    if (b.type === "heading" || b.type === "text") lines.push(String(b.text || "").trim());
    else if (b.type === "button" && b.url) lines.push(`${b.label || "Link"}: ${b.url}`);
    else if (b.type === "image" && b.link) lines.push(b.link);
    else if (b.type === "divider") lines.push("—");
  }
  if (signature) lines.push("", signature);
  if (footer) lines.push("", footer);
  lines.push("", "Wypisz się: {{unsubscribe_url}}");
  return lines.filter((l) => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n");
}
const htmlToText = (html) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n").trim() + "\n\nWypisz się: {{unsubscribe_url}}";

/**
 * state = { mode:'rich'|'html', preheader, brandColor, blocks:[], signature, footer, rawHtml }
 * returns { html, text }  (both contain {{name}} {{email}} {{unsubscribe_url}} tokens)
 */
export function compile(state) {
  const color = state.brandColor || "#1726d6";
  if (state.mode === "html") {
    const html = injectUnsub(state.rawHtml || "");
    return { html, text: htmlToText(html) };
  }
  const blocks = state.blocks || [];
  const contentRows = blocks.map((b) => blockHtml(b, color)).join("");
  return {
    html: richWrap({ preheader: state.preheader, color, contentRows, signature: state.signature, footer: state.footer }),
    text: richText(blocks, state.signature, state.footer),
  };
}

/** Fill tokens for an in-browser preview (no real unsubscribe link). */
export function fillPreview(html, { name = "Jan Kowalski", email = "klient@przyklad.pl" } = {}) {
  return html
    .replace(/{{\s*name\s*}}/g, esc(name))
    .replace(/{{\s*email\s*}}/g, esc(email))
    .replace(/{{\s*unsubscribe_url\s*}}/g, "#");
}

/**
 * Parse free text / CSV / TSV into [{ email, name }] (deduped, lowercased email).
 * Handles: "a@b.com", "Name <a@b.com>", "Name, a@b.com", "a@b.com,Name", CSV rows.
 */
export function parseRecipients(text) {
  const out = [];
  const seen = new Set();
  for (const rawLine of String(text || "").split(/[\r\n]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(EMAIL_RE);
    if (!m) continue;
    const email = m[0].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    // name = whatever else is on the line, cleaned of separators / brackets / quotes
    let name = line.replace(EMAIL_RE_G, "").replace(/[<>,;"|]/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
    if (name.toLowerCase() === email) name = "";
    out.push({ email, name: name || "" });
  }
  return out;
}

/** Extract recipients from a 2D array of cells (xlsx/csv rows). */
export function recipientsFromRows(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows || []) {
    const cells = (row || []).map((c) => (c == null ? "" : String(c).trim()));
    const emailCell = cells.find((c) => EMAIL_RE.test(c));
    if (!emailCell) continue;
    const email = emailCell.match(EMAIL_RE)[0].toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    const name = cells.find((c) => c && c !== emailCell && !EMAIL_RE.test(c)) || "";
    out.push({ email, name });
  }
  return out;
}
