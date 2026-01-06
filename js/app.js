const $ = (sel, root = document) => root.querySelector(sel);

const els = {
  modeBtn: $("#modeBtn"),
  modeText: $("#modeText"),

  tocList: $("#tocList"),
  cards: $("#cards"),

  filters: $("#filters"),
  searchInput: $("#searchInput"),
  clearBtn: $("#clearBtn"),
  sortSelect: $("#sortSelect"),

  countAll: $("#countAll"),
  countShown: $("#countShown"),
  countTotal: $("#countTotal"),

  contactForm: $("#contactForm"),
  formNote: $("#formNote"),
  mailtoLink: $("#mailtoLink"),
  cName: $("#cName"),
  cEmail: $("#cEmail"),
  cMsg: $("#cMsg"),
};

// スプシCMS
const CMS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxLz1LpxwXFismtcVrq5cbTk48KBhdb3OIc-c9bkCzAkUy1kxtT62qT7uegdu5fisQ_/exec?type=projects";

// Contact通知
const CONTACT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxLz1LpxwXFismtcVrq5cbTk48KBhdb3OIc-c9bkCzAkUy1kxtT62qT7uegdu5fisQ_/exec";

const STATE = {
  projects: [],
  activeTag: "ALL",
  q: "",
  sort: "new",
};

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]
  ));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme === "day" ? "day" : "night";
  els.modeText.textContent = theme === "day" ? "Day" : "Night";
  localStorage.setItem("theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  if (saved === "day" || saved === "night") setTheme(saved);
  else setTheme(prefersLight ? "day" : "night");
}

const GAS_PROJECTS_API =
  "https://script.google.com/macros/s/AKfycbxLz1LpxwXFismtcVrq5cbTk48KBhdb3OIc-c9bkCzAkUy1kxtT62qT7uegdu5fisQ_/exec?type=projects";

async function loadProjects() {
  const res = await fetch(GAS_PROJECTS_API, { cache: "no-store" });
  if (!res.ok) throw new Error("GAS CMS の読み込みに失敗しました");

  const data = await res.json();
  if (!data || data.ok !== true) {
    throw new Error(data?.message || "GAS CMS が ok:false を返しました");
  }
  return Array.isArray(data.items) ? data.items : [];
}



function getURLState() {
  const u = new URL(location.href);
  STATE.activeTag = u.searchParams.get("tag") || "ALL";
  STATE.q = u.searchParams.get("q") || "";
  STATE.sort = u.searchParams.get("sort") || "new";
}

function setURLState() {
  const u = new URL(location.href);

  if (STATE.activeTag && STATE.activeTag !== "ALL") u.searchParams.set("tag", STATE.activeTag);
  else u.searchParams.delete("tag");

  if (STATE.q) u.searchParams.set("q", STATE.q);
  else u.searchParams.delete("q");

  if (STATE.sort && STATE.sort !== "new") u.searchParams.set("sort", STATE.sort);
  else u.searchParams.delete("sort");

  history.replaceState(null, "", u.toString());
}

function allTags(projects) {
  const set = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
  return ["ALL", ...Array.from(set).sort((a,b)=>a.localeCompare(b, "ja"))];
}

function renderFilters(tags) {
  els.filters.innerHTML = tags.map(tag => {
    const pressed = (tag === STATE.activeTag) ? "true" : "false";
    const label = (tag === "ALL") ? "すべて" : tag;
    return `<button class="filterBtn" type="button" data-tag="${escapeHTML(tag)}" aria-pressed="${pressed}">${escapeHTML(label)}</button>`;
  }).join("");
}

//projectはslugでページ遷移
function projectHref(p) {
  const u = new URL(location.href);
  const from = u.searchParams.toString(); // 戻り用
  const slug = p.slug || "";
  return `./project.html?slug=${encodeURIComponent(slug)}&from=${encodeURIComponent(from)}`;
}

function renderTOC(projects) {
  const items = [...projects].sort((a,b)=> (b.year||0) - (a.year||0)).slice(0, 6);
  els.tocList.innerHTML = items.map(p => {
    const meta = `${p.type || ""} / ${(p.tags || []).join("・")}`;
    return `
      <li class="tocItem">
        <a href="${projectHref(p)}">
          <span class="tocItem__left">
            <span class="tocItem__title">${escapeHTML(p.title)}</span>
            <span class="tocItem__meta">${escapeHTML(meta)}</span>
          </span>
          <span class="tocItem__year">${escapeHTML(String(p.year || ""))}</span>
        </a>
      </li>
    `;
  }).join("");
}

function applyQuery(projects) {
  let list = [...projects];

  // tag
  if (STATE.activeTag && STATE.activeTag !== "ALL") {
    list = list.filter(p => (p.tags || []).includes(STATE.activeTag));
  }

  // search
  const q = (STATE.q || "").trim().toLowerCase();
  if (q) {
    list = list.filter(p => {
      const hay = [
        p.title, p.type, p.lead, p.role,
        ...(p.tags || []),
        ...(p.highlights || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // sort
  if (STATE.sort === "new") list.sort((a,b)=> (b.year||0) - (a.year||0));
  if (STATE.sort === "old") list.sort((a,b)=> (a.year||0) - (b.year||0));
  if (STATE.sort === "title") list.sort((a,b)=>String(a.title||"").localeCompare(String(b.title||""), "ja"));

  return list;
}

function renderCards(list) {
  els.cards.innerHTML = list.map(p => {
    const tagsHtml = (p.tags || []).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");
    const roleLine = String(p.role || "");
    const href = projectHref(p);

    return `
      <article class="card">
        <a class="card__link" href="${href}">
          <div class="card__top">
            <div>
              <h3 class="card__title">${escapeHTML(p.title)}</h3>
              <p class="card__sub">${escapeHTML(p.lead || "")}</p>
            </div>
            <div class="badges">
              <span class="chip">${escapeHTML(String(p.year || ""))}</span>
              <span class="chip chip--ghost">${escapeHTML(p.type || "")}</span>
            </div>
          </div>

          <div class="tags">${tagsHtml}</div>

          <div class="card__foot">
            <div class="card__role">${escapeHTML(roleLine)}</div>
            <span class="openBtn" aria-hidden="true">詳細へ</span>
          </div>
        </a>
      </article>
    `;
  }).join("");
}

function updateCounts(shown, total) {
  els.countShown.textContent = String(shown);
  els.countTotal.textContent = String(total);
  els.countAll.textContent = String(total);
}

function bindUI() {
  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tag]");
    if (!btn) return;
    STATE.activeTag = btn.dataset.tag || "ALL";
    setURLState();
    refresh();
  });

  els.searchInput.addEventListener("input", () => {
    STATE.q = els.searchInput.value;
    setURLState();
    refresh();
  });

  els.clearBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    STATE.q = "";
    setURLState();
    refresh();
  });

  els.sortSelect.addEventListener("change", () => {
    STATE.sort = els.sortSelect.value;
    setURLState();
    refresh();
  });

  els.modeBtn.addEventListener("click", () => {
    const cur = localStorage.getItem("theme") || "night";
    setTheme(cur === "day" ? "night" : "day");
  });

  // ===== Contact（GAS通知 + mailto fallback） =====
  els.contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.formNote.textContent = "";

    const name = els.cName.value.trim();
    const email = els.cEmail.value.trim();
    const message = els.cMsg.value.trim();

    if (!name || !email || !message) {
      els.formNote.textContent = "未入力の項目があります。";
      return;
    }

    const payload = new URLSearchParams({
      name,
      email,
      message,
      pageUrl: location.href,
      ua: navigator.userAgent,
    });

    const submitBtn = els.contactForm.querySelector('button[type="submit"]');
    const prevText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "送信中…";

    try {
      await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        body: payload, // headersを書かない
      });

      els.formNote.textContent = "送信を受け付けました。ありがとうございました。";
      els.contactForm.reset();
      updateMailto(); // リセット後に mailto も更新

    } catch (err) {
      console.error(err);
      els.formNote.textContent = "送信に失敗しました。メール送信（mailto）をご利用ください。";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevText;
    }
  });

  function updateMailto() {
    const name = (els.cName.value || "").trim();
    const email = (els.cEmail.value || "").trim();
    const msg = (els.cMsg.value || "").trim();

    const subject = `【ポートフォリオ】連絡：${name || "（お名前未入力）"}`;
    const body = [
      `お名前：${name}`,
      `メール：${email}`,
      "",
      msg
    ].join("\n");

    // 自分の宛先
    const to = "ozakinico@gmail.com";
    els.mailtoLink.href =
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  ["input","change"].forEach(ev => {
    els.cName.addEventListener(ev, updateMailto);
    els.cEmail.addEventListener(ev, updateMailto);
    els.cMsg.addEventListener(ev, updateMailto);
  });
  updateMailto();
}

function refresh() {
  // pressed更新
  [...els.filters.querySelectorAll(".filterBtn")].forEach(btn => {
    btn.setAttribute("aria-pressed", (btn.dataset.tag === STATE.activeTag) ? "true" : "false");
  });

  const list = applyQuery(STATE.projects);
  renderCards(list);
  updateCounts(list.length, STATE.projects.length);
}

(async function main(){
  initTheme();
  getURLState();

  els.searchInput.value = STATE.q;
  els.sortSelect.value = STATE.sort;

  // CMSから読み込み
  STATE.projects = await loadProjects();

  renderTOC(STATE.projects);
  renderFilters(allTags(STATE.projects));
  bindUI();
  refresh();
})();
