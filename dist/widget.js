/* STEADD chat widget — embed with:
   <script src="https://YOUR-SITE/widget.js" data-steadd="PROJECT_ID"></script>
   Optional: data-color, data-radius, data-pos="right|left", data-title, data-welcome, data-lang="pl|en" */
(function () {
  var S = document.currentScript;
  var PROJECT = S && S.getAttribute("data-steadd");
  if (!PROJECT) { console.error("[STEADD] missing data-steadd (project id)"); return; }
  var COLOR = S.getAttribute("data-color") || "#0e108b";
  var RADIUS = parseInt(S.getAttribute("data-radius") || "16", 10);
  var POS = (S.getAttribute("data-pos") || "right").toLowerCase() === "left" ? "left" : "right";
  var LANG = S.getAttribute("data-lang") || "pl";
  var TITLE = S.getAttribute("data-title") || (LANG === "en" ? "Chat with us" : "Napisz do nas");
  var WELCOME = S.getAttribute("data-welcome") || (LANG === "en" ? "Hi! How can I help?" : "Cześć! W czym mogę pomóc?");
  var PH = LANG === "en" ? "Type a message…" : "Napisz wiadomość…";

  var SUPABASE_URL = "https://iwmrjewqxmtczuktbkpr.supabase.co";
  var ANON = "sb_publishable_XHBOZXgYYhOJQZQLax2gvg_7cVcyOM-";
  var ENDPOINT = SUPABASE_URL + "/functions/v1/widget-chat";
  var LSK = "steadd_conv_" + PROJECT;
  var side = POS + ":20px";

  var css = "" +
    ".std-btn{position:fixed;" + side + ";bottom:20px;width:58px;height:58px;border-radius:50%;background:" + COLOR + ";color:#fff;border:none;box-shadow:0 8px 30px rgba(0,0,0,.3);cursor:pointer;z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".std-btn:hover{transform:scale(1.06)}" +
    ".sld-panel{position:fixed;" + side + ";bottom:88px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0f1122;color:#eef0fb;border:1px solid rgba(120,124,200,.22);border-radius:" + RADIUS + "px;box-shadow:0 20px 60px rgba(0,0,0,.45);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif}" +
    ".sld-panel.open{display:flex}" +
    ".sld-head{padding:14px 16px;background:" + COLOR + ";color:#fff;font-weight:600;font-size:15px;display:flex;justify-content:space-between;align-items:center}" +
    ".sld-x{cursor:pointer;opacity:.85;font-size:18px;line-height:1;background:none;border:none;color:#fff}" +
    ".sld-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px}" +
    ".sld-b{max-width:80%;padding:9px 12px;border-radius:13px;font-size:14px;line-height:1.45;white-space:pre-wrap}" +
    ".sld-b.u{align-self:flex-end;background:" + COLOR + ";color:#fff;border-bottom-right-radius:4px}" +
    ".sld-b.a{align-self:flex-start;background:#14172c;border:1px solid rgba(120,124,200,.18);border-bottom-left-radius:4px}" +
    ".sld-in{display:flex;gap:7px;padding:12px;border-top:1px solid rgba(120,124,200,.16)}" +
    ".sld-in input{flex:1;background:#0a0b16;color:#eef0fb;border:1px solid rgba(120,124,200,.2);border-radius:9px;padding:10px;font-size:14px;outline:none;font-family:inherit}" +
    ".sld-in button{background:" + COLOR + ";color:#fff;border:none;border-radius:9px;padding:0 14px;cursor:pointer;font-size:14px}" +
    ".sld-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#9aa0c4;margin:0 1px;animation:sldb 1s infinite}" +
    "@keyframes sldb{0%,100%{opacity:.3}50%{opacity:1}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement("button");
  btn.className = "std-btn";
  btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement("div"); panel.className = "sld-panel";
  panel.innerHTML =
    '<div class="sld-head"><span></span><button class="sld-x">×</button></div>' +
    '<div class="sld-msgs"></div>' +
    '<div class="sld-in"><input type="text"><button>➤</button></div>';
  panel.querySelector(".sld-head span").textContent = TITLE;
  panel.querySelector(".sld-in input").placeholder = PH;

  document.body.appendChild(btn); document.body.appendChild(panel);
  var msgs = panel.querySelector(".sld-msgs");
  var input = panel.querySelector("input");
  var sendBtn = panel.querySelector(".sld-in button");
  var convId = localStorage.getItem(LSK) || null;
  var greeted = false;

  function bubble(text, who) {
    var b = document.createElement("div"); b.className = "sld-b " + (who === "u" ? "u" : "a");
    b.textContent = text; msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b;
  }
  function toggle() {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !greeted) { greeted = true; bubble(WELCOME, "a"); input.focus(); }
  }
  btn.onclick = toggle;
  panel.querySelector(".sld-x").onclick = toggle;

  function send() {
    var txt = input.value.trim(); if (!txt) return;
    bubble(txt, "u"); input.value = "";
    var typing = bubble("", "a");
    typing.innerHTML = '<span class="sld-dot"></span><span class="sld-dot" style="animation-delay:.2s"></span><span class="sld-dot" style="animation-delay:.4s"></span>';
    fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", apikey: ANON },
      body: JSON.stringify({ project_id: PROJECT, conversation_id: convId, message: txt }) })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (d.conversation_id) { convId = d.conversation_id; localStorage.setItem(LSK, convId); }
        typing.textContent = d.reply || "…";
      }).catch(function () { typing.textContent = LANG === "en" ? "Connection error." : "Błąd połączenia."; });
  }
  sendBtn.onclick = send;
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
})();
