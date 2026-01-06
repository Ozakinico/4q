// project.js
const $ = (sel, root = document) => root.querySelector(sel);

const GAS_PROJECTS_API =
  "https://script.google.com/macros/s/AKfycbxLz1LpxwXFismtcVrq5cbTk48KBhdb3OIc-c9bkCzAkUy1kxtT62qT7uegdu5fisQ_/exec?type=projects";

const els = {
  modeBtn: $("#modeBtn"),
  modeText: $("#modeText"),

  backLink: $("#backLink"),

  title: $("#pTitle"),
  lead: $("#pLead"),
  year: $("#pYear"),
  type: $("#pType"),
  tags: $("#pTags"),

  // 6 boxes
  context: $("#pContext"),
  goal: $("#pGoal"),
  role: $("#pRole"),
  process: $("#pProcess"),
  outcome: $("#pOutcome"),
  learning: $("#pLearning"),

  prevLink: $("#prevLink"),
  nextLink: $("#nextLink"),
};

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]
  ));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme === "day" ? "day" : "night";
  if (els.modeText) els.modeText.textContent = theme === "day" ? "Day" : "Night";
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  if (saved === "day" || saved === "night") setTheme(saved);
  else setTheme(prefersLight ? "day" : "night");
}

function getParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}

function setBackLink() {
  const from = getParam("from"); // index側が付けてる戻り情報
  const href = from ? `./index.html?${decodeURIComponent(from)}` : "./index.html";
  if (els.backLink) els.backLink.href = href;
}

async function loadProjects() {
  const res = await fetch(GAS_PROJECTS_API, { cache: "no-store" });
  if (!res.ok) throw new Error("GAS からプロジェクトを取得できませんでした");
  const data = await res.json();

  // 返り値の形に両対応：[{...}] または {ok:true, items:[...]}
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

// highlights を “背景/目的/進め方/成果/学び” に振り分け
function splitHighlightsToSections(highlights = []) {
  const out = {
    context: "",
    goal: "",
    process: [],
    outcome: [],
    learning: [],
    other: [],
  };

  const lines = (highlights || []).map(s => String(s).trim()).filter(Boolean);

  const pick = (prefixes) => {
    const found = [];
    for (const line of lines) {
      const hit = prefixes.find(p => line.startsWith(p));
      if (hit) found.push(line.slice(hit.length).trim());
    }
    return found;
  };

  // 1行だけ想定のもの（複数あれば結合）
  const ctx = pick(["背景：","背景:","課題：","課題:"]);
  const goal = pick(["目的：","目的:"]);

  out.context = ctx.join("\n");
  out.goal = goal.join("\n");

  out.process = pick(["進め方：","進め方:","工夫：","工夫:","プロセス：","プロセス:"]);
  out.outcome = pick(["成果：","成果:"]);
  out.learning = pick(["学び：","学び:"]);

  // どれにも当てはまらない行
  for (const line of lines) {
    const isKnown =
      ["背景：","背景:","課題：","課題:","目的：","目的:","進め方：","進め方:","工夫：","工夫:","プロセス：","プロセス:","成果：","成果:","学び：","学び:"]
        .some(p => line.startsWith(p));
    if (!isKnown) out.other.push(line);
  }

  // 余りは process に寄せる（空欄よりマシ）
  if (out.other.length) out.process = [...out.process, ...out.other];

  return out;
}

function fillText(el, text) {
  if (!el) return;
  const t = String(text || "").trim();
  el.textContent = t || "—";
}

function fillList(el, items) {
  if (!el) return;
  const arr = (items || []).map(s => String(s).trim()).filter(Boolean);
  if (!arr.length) {
    el.innerHTML = "<li>—</li>";
    return;
  }
  el.innerHTML = arr.map(s => `<li>${escapeHTML(s)}</li>`).join("");
}

function renderProject(p, all) {
  // header
  if (els.title) els.title.textContent = p.title || "プロジェクト";
  if (els.lead) els.lead.textContent = p.lead || "";
  if (els.year) els.year.textContent = p.year ? String(p.year) : "";
  if (els.type) els.type.textContent = p.type || "";

  // tags
  if (els.tags) {
    const tags = (p.tags || []).map(t => String(t).trim()).filter(Boolean);
    els.tags.innerHTML = tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");
  }

  // main sections
  // まず “正規フィールド” があるならそれを使う（将来スキーマ増やしても壊れない）
  const hasRich =
    (p.context && String(p.context).trim()) ||
    (p.goal && String(p.goal).trim()) ||
    (Array.isArray(p.process) && p.process.length) ||
    (Array.isArray(p.outcome) && p.outcome.length) ||
    (Array.isArray(p.learning) && p.learning.length);

  if (hasRich) {
    fillText(els.context, p.context);
    fillText(els.goal, p.goal);
    fillList(els.role, Array.isArray(p.role) ? p.role : String(p.role || "").split("/").map(s=>s.trim()).filter(Boolean));
    fillList(els.process, p.process || []);
    fillList(els.outcome, p.outcome || []);
    fillList(els.learning, p.learning || []);
  } else {
    // highlights から振り分け
    const sp = splitHighlightsToSections(p.highlights || []);
    fillText(els.context, sp.context);
    fillText(els.goal, sp.goal);
    fillList(els.role, Array.isArray(p.role) ? p.role : String(p.role || "").split("/").map(s=>s.trim()).filter(Boolean));
    fillList(els.process, sp.process);
    fillList(els.outcome, sp.outcome);
    fillList(els.learning, sp.learning);
  }

  // prev/next（同じ並びで回す）
  const list = [...all].sort((a,b) => (b.year||0) - (a.year||0));
  const idx = list.findIndex(x => x.slug === p.slug);

  const makeHref = (slug) => {
    const from = getParam("from") || "";
    return `./project.html?slug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}`;
  };

  if (els.prevLink) {
    const prev = idx >= 0 ? list[idx - 1] : null;
    if (prev) {
      els.prevLink.href = makeHref(prev.slug);
      els.prevLink.textContent = `← 前：${prev.title}`;
      els.prevLink.style.visibility = "visible";
    } else {
      els.prevLink.style.visibility = "hidden";
    }
  }

  if (els.nextLink) {
    const next = idx >= 0 ? list[idx + 1] : null;
    if (next) {
      els.nextLink.href = makeHref(next.slug);
      els.nextLink.textContent = `次：${next.title} →`;
      els.nextLink.style.visibility = "visible";
    } else {
      els.nextLink.style.visibility = "hidden";
    }
  }
}

function bindUI() {
  if (els.modeBtn) {
    els.modeBtn.addEventListener("click", () => {
      const cur = localStorage.getItem("theme") || "night";
      setTheme(cur === "day" ? "night" : "day");
    });
  }
}

(async function main(){
  initTheme();
  bindUI();
  setBackLink();

  const slug = getParam("slug");
  if (!slug) {
    if (els.title) els.title.textContent = "プロジェクトが指定されていません";
    return;
  }

  const items = await loadProjects();
  const p = items.find(x => x.slug === slug);

  if (!p) {
    if (els.title) els.title.textContent = "プロジェクトが見つかりません";
    return;
  }

  renderProject(p, items);
})();
