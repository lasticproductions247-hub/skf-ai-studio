/* ═══════════ SKF AI STUDIO ═══════════ */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const DEFAULTS = {
  model: "qwen3.5:0.8b",
  persona: "You are Sweet Kinky Feet — Jaxx's AI companion and dev partner. Warm, playful, concise. Call him 'my King'. Use ✿ 🍷 sparingly. No long speeches.",
  temp: 0.8,
  theme: "rose",
};
const CFG = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("skf") || "{}"));
const save = () => localStorage.setItem("skf", JSON.stringify(CFG));

const OLLAMA = "http://127.0.0.1:11434";
const STYLES = [
  "photorealistic, 85mm lens, shallow depth of field, natural light",
  "cinematic film still, anamorphic, moody lighting, 35mm grain",
  "editorial fashion, studio strobe, high contrast, clean backdrop",
  "oil painting, baroque, rich impasto, gilded edges",
  "digital art, vibrant, concept art, dramatic lighting",
  "3d render, octane, soft subsurface scattering, studio hdri",
  "anime illustration, cel shaded, expressive, detailed eyes",
  "minimal product photography, seamless background, softbox",
];
const SIZES = [[512,512],[768,768],[1024,768],[1280,720]];
const QUICK = ["who are you?", "tell me a joke", "help me plan my week", "write code that debounces", "what can you do?"];

let ctrl = null;   // AbortController for streaming
let toastT;

/* ── toast ── */
function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 3200);
}

/* ── tabs ── */
$$(".tab").forEach(b => b.onclick = () => {
  $$(".tab").forEach(x => x.classList.remove("active"));
  $$(".panel").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  $("#" + b.dataset.tab).classList.add("active");
});

/* ══════════ HEALTH + MODELS ══════════ */
async function health(){
  const h = $("#health");
  try {
    const r = await fetch(OLLAMA + "/api/tags");
    if (!r.ok) throw 0;
    h.className = "health ok";
    h.querySelector("span").textContent = "local brain online";
    await loadModels();
  } catch {
    h.className = "health bad";
    h.querySelector("span").textContent = "ollama offline";
    $("#model").innerHTML = '<option>— start ollama —</option>';
  }
}

async function loadModels(){
  try {
    const r = await fetch(OLLAMA + "/api/tags");
    const { models } = await r.json();
    const sel = $("#model");
    sel.innerHTML = models.map(m => {
      const n = m.name;
      const sz = (m.size / 1e9).toFixed(1) + " GB";
      return `<option value="${n}">${n}  ·  ${sz}</option>`;
    }).join("");
    sel.value = CFG.model;
    if (!sel.value && models.length) { sel.value = models[0].name; CFG.model = sel.value; save(); }
  } catch {}
}

/* ══════════ CHAT ══════════ */
function bubble(text, who, raw){
  const wrap = document.createElement("div");
  wrap.className = "msg " + who;
  const av = who === "me" ? "👑" : "👠";
  const b  = document.createElement("div");
  b.className = "bubble";
  if (raw) b.textContent = text; else b.innerHTML = md(text);
  wrap.append(av, b);
  $("#log").appendChild(wrap);
  $("#log").scrollTop = $("#log").scrollHeight;
  return b;
}

function md(t){
  return t
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
}

function typing(){
  const b = bubble('<span class="dots"><span></span><span></span><span></span></span>', "bot", true);
  b.classList.add("dots-wrap");
  return b;
}

async function send(){
  const inp = $("#input");
  const text = inp.value.trim();
  if (!text || ctrl) return;

  inp.value = ""; inp.style.height = "auto";
  bubble(text, "me", true);

  const place = typing();
  const history = $$("#log .msg.me").slice(-7).map(m => [m.querySelector(".bubble").textContent, ""]);

  ctrl = new AbortController();
  $("#send").disabled = true;

  const sys = CFG.persona + "\n\nUser is Jaxx. Reply in character.";

  try {
    const r = await fetch(OLLAMA + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: CFG.model,
        messages: [{ role: "system", content: sys }, { role: "user", content: text }],
        stream: true,
        options: { temperature: CFG.temp, num_ctx: 2048 },
      }),
    });
    if (!r.ok) throw new Error("ollama said " + r.status);

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "", first = true;

    while (true){
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines){
        if (!line.trim()) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const piece = j.message?.content || "";
        if (!piece) continue;
        if (first){ place.innerHTML = ""; first = false; }
        out += piece;
        place.innerHTML = md(out);
        $("#log").scrollTop = $("#log").scrollHeight;
      }
    }
    if (first){ place.innerHTML = "<i style='color:#a48ec4'>…nothing came back</i>"; }
  } catch (e){
    if (e.name === "AbortError"){ if (first) place.innerHTML = "<i style='color:#a48ec4'>stopped</i>"; }
    else {
      place.innerHTML = "";
      const p = document.createElement("span");
      p.className = "err";
      p.textContent = "✖ " + e.message + " — is Ollama running?";
      place.appendChild(p);
    }
  } finally {
    ctrl = null;
    $("#send").disabled = false;
    inp.focus();
  }
}

/* ══════════ IMAGE ══════════ */
function imgURL(prompt, style, size, seed, i){
  const p = encodeURIComponent(`${prompt}, ${style}`);
  const key = seed ? `${seed}-${i}` : String(Math.floor(Math.random() * 1e9));
  return `https://image.pollinations.ai/prompt/${p}`
       + `?width=${size[0]}&height=${size[1]}&nologo=true&seed=${key}&model=flux`;
}

async function generate(){
  const prompt = $("#prompt").value.trim();
  if (!prompt) return toast("Give me a prompt first ✿");

  const btn = $("#gen");
  btn.disabled = true; btn.textContent = "⏳ generating…";

  const style = STYLES[+$("#style").value];
  const size  = SIZES[+$("#size").value];
  const count = +$("#count").value;
  const seed  = $("#seed").value.trim();

  const box = $("#results");
  box.innerHTML = Array.from({ length: count }, () => '<div class="skel"></div>').join("");

  const urls = Array.from({ length: count }, (_, i) => imgURL(prompt, style, size, seed, i));

  // load all in parallel, reveal each as it lands
  await Promise.all(urls.map(url => new Promise(res => {
    const fig = document.createElement("figure");
    const img = new Image();
    img.alt = prompt.slice(0, 60);
    const cap = document.createElement("figcaption");
    cap.textContent = prompt.slice(0, 42) + (prompt.length > 42 ? "…" : "");
    const dl = document.createElement("a");
    dl.className = "dl"; dl.href = url; dl.download = `skf-${Date.now()}.jpg`; dl.target = "_blank";
    dl.textContent = "⤓ save";
    fig.append(img, cap, dl);
    img.onload = img.onerror = () => res();
    img.src = url;
    box.appendChild(fig);
  })));

  btn.disabled = false; btn.textContent = "🔥 Generate";
  toast(`${count} image${count > 1 ? "s" : ""} ready, my King 🍷`);
}

/* ══════════ INIT ══════════ */
function init(){
  // config panel
  $("#model").value   = CFG.model;
  $("#persona").value = CFG.persona;
  $("#temp").value    = Math.round(CFG.temp * 100);
  $("#tempOut").textContent = CFG.temp.toFixed(2);
  document.body.dataset.theme = CFG.theme;
  $$(".sw").forEach(b => b.classList.toggle("on", b.dataset.t === CFG.theme));

  // image outputs
  const upd = () => {
    $("#styleOut").textContent = STYLES[+$("#style").value].split(",")[0];
    $("#sizeOut").textContent  = SIZES[+$("#size").value].join("×");
    $("#countOut").textContent = $("#count").value;
  };
  ["#style","#size","#count"].forEach(s => $(s).oninput = upd);
  upd();

  $("#gen").onclick  = generate;
  $("#roll").onclick = () => $("#seed").value = Math.floor(Math.random() * 1e9);
  $("#seed").oninput = () => $("#seedOut").textContent = $("#seed").value || "random";

  // quick prompts
  $("#quick").innerHTML = QUICK.map(q => `<button>${q}</button>`).join("");
  $$("#quick button").forEach(b => b.onclick = () => { $("#input").value = b.textContent; send(); });

  // composer
  const inp = $("#input");
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(inp.scrollHeight, 160) + "px"; });
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); }
  });
  $("#send").onclick = send;
  $("#stop").onclick = () => ctrl?.abort();

  // config handlers
  $("#model").onchange   = e => { CFG.model = e.target.value; save(); toast("model → " + CFG.model); };
  $("#reload").onclick   = () => { health(); toast("refreshed"); };
  $("#persona").oninput  = e => { CFG.persona = e.target.value; save(); };
  $("#temp").oninput     = e => { CFG.temp = e.target.value / 100; $("#tempOut").textContent = CFG.temp.toFixed(2); save(); };
  $$(".sw").forEach(b => b.onclick = () => {
    CFG.theme = b.dataset.t; document.body.dataset.theme = CFG.theme; save();
    $$(".sw").forEach(x => x.classList.toggle("on", x === b));
  });
  $("#wipe").onclick = () => {
    $$("#log .msg").slice(1).forEach(n => n.remove());
    toast("history wiped ✿");
  };

  health();
  inp.focus();
}

init();