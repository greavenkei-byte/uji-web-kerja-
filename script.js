/* Akasha — Mode Preview / Demo Offline (Tanpa Login & Tanpa Firebase Asli) */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const safeUrl = (u) => { try { const p = new URL(String(u || "").trim()); return p.protocol === "http:" || p.protocol === "https:" ? p.href : ""; } catch { return ""; } };
const initialOf = (n) => (String(n || "A").trim()[0] || "A").toUpperCase();
const formatDateID = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
const formatFullTodayID = () => new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeAgo = () => "baru saja";
const toast = (msg, type = "") => {
  const box = $("toastContainer");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 220); }, 3200);
};

/* ══════════ CUSTOM DROPDOWN ENGINE ══════════ */
const enhancedSelects = new WeakMap();
let openDropdown = null;

function closeOpenDropdown() {
  if (!openDropdown) return;
  openDropdown.wrap.classList.remove("open");
  openDropdown.menu.classList.remove("open");
  openDropdown.trigger.setAttribute("aria-expanded", "false");
  openDropdown = null;
}

function positionMenu(trigger, menu) {
  const r = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom;
  const menuH = Math.min(260, menu.scrollHeight || 220);
  menu.style.minWidth = `${r.width}px`;
  menu.style.maxWidth = `${Math.max(r.width, 280)}px`;
  menu.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - Math.max(r.width, 240) - 8)}px`;
  if (spaceBelow < menuH + 12 && r.top > menuH + 12) {
    menu.style.top = "auto";
    menu.style.bottom = `${window.innerHeight - r.top + 4}px`;
  } else {
    menu.style.bottom = "auto";
    menu.style.top = `${r.bottom + 4}px`;
  }
}

function syncEnhancedSelect(sel) {
  const inst = enhancedSelects.get(sel);
  if (!inst) return;
  const { valueSpan, menu } = inst;
  const selectedOpt = sel.options[sel.selectedIndex];
  valueSpan.textContent = selectedOpt ? selectedOpt.textContent : "Pilih…";
  menu.innerHTML = "";
  const buildOption = (opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ak-select-option" + (opt.value === sel.value ? " selected" : "");
    btn.textContent = opt.textContent;
    btn.dataset.val = opt.value;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", opt.value === sel.value ? "true" : "false");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      sel.value = opt.value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      syncEnhancedSelect(sel);
      closeOpenDropdown();
      inst.trigger.focus();
    });
    menu.appendChild(btn);
  };
  Array.from(sel.children).forEach((child) => {
    if (child.tagName === "OPTGROUP") {
      const lbl = document.createElement("div");
      lbl.className = "ak-select-group";
      lbl.textContent = child.label;
      menu.appendChild(lbl);
      Array.from(child.children).forEach(buildOption);
    } else if (child.tagName === "OPTION") {
      buildOption(child);
    }
  });
}

function enhanceSelect(sel) {
  if (!sel || enhancedSelects.has(sel)) { syncEnhancedSelect(sel); return; }
  sel.classList.add("sr-only");
  sel.tabIndex = -1;
  const wrap = document.createElement("div");
  wrap.className = "ak-select";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ak-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const valueSpan = document.createElement("span");
  valueSpan.className = "ak-select-value";
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 20 20");
  arrow.setAttribute("fill", "none");
  arrow.setAttribute("class", "ak-select-arrow");
  arrow.innerHTML = '<path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  trigger.append(valueSpan, arrow);
  const menu = document.createElement("div");
  menu.className = "ak-select-menu";
  menu.setAttribute("role", "listbox");
  sel.parentNode.insertBefore(wrap, sel);
  wrap.append(trigger, sel);
  document.body.appendChild(menu);

  const inst = { wrap, trigger, valueSpan, menu };
  enhancedSelects.set(sel, inst);
  syncEnhancedSelect(sel);

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isSame = openDropdown && openDropdown.wrap === wrap;
    closeOpenDropdown();
    if (!isSame) {
      syncEnhancedSelect(sel);
      positionMenu(trigger, menu);
      wrap.classList.add("open");
      menu.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      openDropdown = inst;
      const cur = menu.querySelector(".selected") || menu.querySelector(".ak-select-option");
      if (cur) cur.focus();
    }
  });

  menu.addEventListener("keydown", (e) => {
    const opts = Array.from(menu.querySelectorAll(".ak-select-option"));
    const idx = opts.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeOpenDropdown(); trigger.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); (opts[idx + 1] || opts[0])?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (opts[idx - 1] || opts[opts.length - 1])?.focus(); }
  });
  sel.addEventListener("change", () => syncEnhancedSelect(sel));
}

document.addEventListener("click", (e) => {
  if (openDropdown && !openDropdown.wrap.contains(e.target) && !openDropdown.menu.contains(e.target)) closeOpenDropdown();
});
window.addEventListener("resize", closeOpenDropdown);
window.addEventListener("scroll", (e) => { if (openDropdown && !openDropdown.menu.contains(e.target)) closeOpenDropdown(); }, true);

/* ══════════ DIALOG ══════════ */
function appConfirm({ title = "Konfirmasi", message = "", confirmText = "Ya, lanjut", danger = false }) {
  return new Promise((resolve) => {
    $("appDialogTitle").textContent = title;
    $("appDialogMessage").textContent = message;
    $("appDialogFieldWrap").classList.add("hidden");
    const okBtn = $("appDialogConfirm");
    okBtn.textContent = confirmText;
    okBtn.className = danger ? "btn-sm btn-danger-outline" : "btn-sm btn-solid";
    $("appDialog").classList.remove("hidden");
    const done = (v) => { $("appDialog").classList.add("hidden"); okBtn.onclick = null; $("appDialogCancel").onclick = null; resolve(v); };
    okBtn.onclick = () => done(true);
    $("appDialogCancel").onclick = () => done(false);
  });
}

function appPrompt({ title = "Masukkan nilai", message = "", label = "Nilai", placeholder = "", initial = "", validate = null }) {
  return new Promise((resolve) => {
    $("appDialogTitle").textContent = title;
    $("appDialogMessage").textContent = message;
    $("appDialogLabel").textContent = label;
    const wrap = $("appDialogFieldWrap");
    const inp = $("appDialogInput");
    const err = $("appDialogError");
    wrap.classList.remove("hidden");
    err.classList.add("hidden");
    inp.value = initial;
    inp.placeholder = placeholder;
    const okBtn = $("appDialogConfirm");
    okBtn.textContent = "Simpan";
    okBtn.className = "btn-sm btn-solid";
    $("appDialog").classList.remove("hidden");
    setTimeout(() => inp.focus(), 30);
    const done = (v) => { $("appDialog").classList.add("hidden"); okBtn.onclick = null; $("appDialogCancel").onclick = null; resolve(v); };
    okBtn.onclick = () => {
      const val = inp.value.trim();
      if (validate) {
        const msg = validate(val);
        if (msg) { err.textContent = msg; err.classList.remove("hidden"); return; }
      }
      done(val);
    };
    $("appDialogCancel").onclick = () => done(null);
  });
}

/* ══════════ STATE & DATA DUMMY PREVIEW ══════════ */
const today = todayISO();
const state = {
  user: { uid: "demo-mentor", displayName: "Greaven (Mode Preview)", email: "preview@akasha.id" },
  workspaces: [
    { id: "ws-demo", name: "Tim Produksi Animasi 3D", code: "AKS26A", ownerId: "demo-mentor", memberIds: ["demo-mentor", "m2", "m3"], driveLink: "https://drive.google.com" }
  ],
  dashTasks: [],
  notifications: [
    { id: "n1", text: "Nadia Putri mengirim laporan tugas “Color Grading Teaser Trailer”.", wsId: "ws-demo", wsName: "Tim Produksi Animasi 3D", taskId: "t2", read: false }
  ],
  currentWs: null,
  members: {
    "demo-mentor": { id: "demo-mentor", name: "Greaven (Mentor)", email: "greaven@tim.id", role: "mentor", divisionId: "general", lastSeen: Date.now() },
    "m2": { id: "m2", name: "Raka Pratama", email: "raka@tim.id", role: "worker", divisionId: "div-anim", lastSeen: Date.now() },
    "m3": { id: "m3", name: "Nadia Putri", email: "nadia@tim.id", role: "worker", divisionId: "div-edit", lastSeen: 0 }
  },
  divisions: [
    { id: "div-anim", name: "Divisi Animasi", description: "Blocking, spline, dan graph editor" },
    { id: "div-edit", name: "Divisi Editing", description: "Compositing dan color grading" }
  ],
  tasks: [
    {
      id: "t1", wsId: "ws-demo", wsName: "Tim Produksi Animasi 3D",
      title: "Blocking Scene 04 Karakter Utama",
      description: "Fokus pada pose kunci, antisipasi, dan timing lompatan sebelum masuk tahap spline.",
      assigneeId: "m2", assigneeName: "Raka Pratama", divisionId: "div-anim",
      difficulty: "tinggi", status: "progress", startDate: today, endDate: today,
      subtasks: [{ title: "Pose kunci awal", done: true }, { title: "Breakdown gerakan udara", done: false }],
      attachments: [{ name: "Referensi Gerakan", url: "https://drive.google.com" }],
      history: [{ text: "Tugas dibuat oleh Mentor", at: "Hari ini, 08:30" }],
      comments: [
        { authorId: "demo-mentor", authorName: "Greaven (Mentor)", text: "Pastikan arc lompatan di frame 24-36 terasa berat ya." },
        { authorId: "m2", authorName: "Raka Pratama", text: "Siap kak, sedang dirapikan di Graph Editor." }
      ]
    },
    {
      id: "t2", wsId: "ws-demo", wsName: "Tim Produksi Animasi 3D",
      title: "Color Grading Teaser Trailer",
      description: "Sesuaikan tone warna dengan referensi moodboard warm sunset.",
      assigneeId: "m3", assigneeName: "Nadia Putri", divisionId: "div-edit",
      difficulty: "sedang", status: "review", startDate: today, endDate: today,
      reportLink: "https://drive.google.com",
      reportNotes: "Sudah selesai render versi pertama 1080p, mohon dicek.",
      subtasks: [{ title: "Render preview 1080p", done: true }],
      attachments: [{ name: "Laporan hasil kerja", url: "https://drive.google.com" }],
      history: [{ text: "Laporan dikirim untuk ulasan", at: "Hari ini, 09:45" }],
      comments: []
    },
    {
      id: "t3", wsId: "ws-demo", wsName: "Tim Produksi Animasi 3D",
      title: "Finalisasi Rigging Wajah",
      description: "Cek kontrol ekspresi alis dan lip-sync dasar.",
      assigneeId: "m2", assigneeName: "Raka Pratama", divisionId: "div-anim",
      difficulty: "rendah", status: "done", startDate: today, endDate: today,
      subtasks: [], attachments: [],
      history: [{ text: "Disetujui mentor", at: "Kemarin" }],
      comments: []
    },
    {
      id: "t4", wsId: "ws-demo", wsName: "Tim Produksi Animasi 3D",
      title: "Susun Storyboard Episode 2",
      description: "Lengkapi catatan transisi kamera dan durasi per shot.",
      assigneeId: "m3", assigneeName: "Nadia Putri", divisionId: "div-edit",
      difficulty: "sedang", status: "todo", startDate: today, endDate: today,
      subtasks: [], attachments: [], history: [], comments: []
    }
  ],
  activities: [
    { text: "Nadia Putri mengirim laporan untuk “Color Grading Teaser Trailer”" },
    { text: "Raka Pratama mulai mengerjakan “Blocking Scene 04 Karakter Utama”" },
    { text: "Mentor menyetujui tugas “Finalisasi Rigging Wajah”" }
  ],
  announcements: [
    { id: "ann1", title: "Jadwal Review Mingguan", body: "Semua progres animasi dan compositing dikumpulkan paling lambat pukul 16.00 WIB hari ini.", pinned: true, authorName: "Greaven (Mentor)" }
  ],
  activeTaskId: null,
  boardMode: localStorage.getItem("akasha_board_mode") || "kanban",
  quickActionOnly: false,
  calDate: new Date()
};
state.dashTasks = state.tasks;

const isMentor = () => !!(state.currentWs && state.user && (state.currentWs.ownerId === state.user.uid || state.members[state.user.uid]?.role === "mentor"));
const divisionName = (id) => id === "general" || !id ? "Umum" : (state.divisions.find((d) => d.id === id)?.name || "Umum");
const memberName = (uid) => state.members[uid]?.name || "Anggota";

/* ══════════ DASHBOARD & HERO BANNER ══════════ */
function switchDashPanel(panel) {
  const map = { home: "dashboardHomePanel", workspaces: "myWorkspacesPanel", notifications: "notificationsPanel" };
  const titles = { home: "Dashboard", workspaces: "Ruang Kerja Saya", notifications: "Notifikasi" };
  Object.entries(map).forEach(([k, id]) => $(id).classList.toggle("hidden", k !== panel));
  $("dashboardPageTitle").textContent = titles[panel] || "Dashboard";
  $("dashboardNavBtn").classList.toggle("active", panel === "home");
  $("myWorkspacesNavBtn").classList.toggle("active", panel === "workspaces");
  $("notificationsNavBtn").classList.toggle("active", panel === "notifications");
}

function renderDashboardHome() {
  const tasks = state.dashTasks;
  const total = tasks.length;
  const active = tasks.filter((t) => t.status === "todo" || t.status === "progress").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const firstName = (state.user?.displayName || "Pengguna").split(" ")[0];
  $("dashBannerDate").textContent = formatFullTodayID();
  $("dashBannerGreeting").textContent = `Halo, ${firstName}! Siap menuntaskan target hari ini?`;
  $("dashProgressPct").textContent = `${pct}%`;
  $("dashHeroActionCount").textContent = active + review;
  const circumference = 163.36;
  $("dashProgressRing").style.strokeDashoffset = String(circumference - (pct / 100) * circumference);

  $("dashboardSummary").innerHTML = `
    <div class="stat-card"><strong>${total}</strong><span>Total tugas</span></div>
    <div class="stat-card accent"><strong>${active}</strong><span>Sedang dikerjakan</span></div>
    <div class="stat-card"><strong>${review}</strong><span>Menunggu ulasan</span></div>
    <div class="stat-card ok"><strong>${done}</strong><span>Selesai</span></div>`;

  const limitDate = new Date(); limitDate.setDate(limitDate.getDate() + 7);
  const maxISO = `${limitDate.getFullYear()}-${String(limitDate.getMonth() + 1).padStart(2, "0")}-${String(limitDate.getDate()).padStart(2, "0")}`;
  const upcoming = tasks.filter((t) => t.status !== "done" && t.endDate && t.endDate <= maxISO)
    .sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 6);

  const calBox = $("miniCalendarList");
  if (!upcoming.length) {
    calBox.innerHTML = `<p class="empty-hint">Tidak ada tenggat dalam 7 hari ke depan.</p>`;
  } else {
    calBox.innerHTML = upcoming.map((t) => {
      const [, m, d] = t.endDate.split("-");
      const mon = new Date(2026, Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "short" });
      const cls = t.endDate < today ? "overdue" : t.endDate === today ? "today" : "";
      return `<button type="button" class="mini-cal-item ${cls}" data-ws="${esc(t.wsId)}" data-task="${esc(t.id)}">
        <span class="mini-cal-date"><strong>${Number(d)}</strong><span>${esc(mon)}</span></span>
        <span class="mini-cal-body"><strong>${esc(t.title)}</strong><span>${esc(t.wsName)} · ${t.endDate < today ? "Terlambat" : t.endDate === today ? "Hari ini" : formatDateID(t.endDate)}</span></span>
      </button>`;
    }).join("");
    calBox.querySelectorAll(".mini-cal-item").forEach((btn) => btn.addEventListener("click", () => openWorkspace(btn.dataset.ws, btn.dataset.task)));
  }

  const prev = $("dashboardWorkspacePreview");
  prev.innerHTML = `<div class="ws-preview-list">${state.workspaces.map((ws) => `
    <button type="button" class="ws-preview-item" data-open-ws="${esc(ws.id)}">
      <span><strong>${esc(ws.name)}</strong><span>${(ws.memberIds || []).length} anggota</span></span>
      <span class="code-pill">${esc(ws.code || "")}</span>
    </button>`).join("")}</div>`;
  prev.querySelectorAll("[data-open-ws]").forEach((b) => b.addEventListener("click", () => openWorkspace(b.dataset.openWs)));
}

function renderWorkspaceLists() {
  const list = $("workspaceList");
  list.innerHTML = `<div class="workspace-grid">${state.workspaces.map((ws) => {
    const role = ws.ownerId === state.user.uid ? "Mentor" : "Anggota";
    return `<article class="workspace-card">
      <div>
        <h4>${esc(ws.name)}</h4>
        <div class="ws-meta"><span class="role-badge">${role}</span><span>${(ws.memberIds || []).length} anggota</span><span class="code-pill">${esc(ws.code || "")}</span></div>
      </div>
      <div class="ws-card-actions">
        <button type="button" class="btn-primary" data-enter="${esc(ws.id)}">Buka ruang kerja</button>
        <button type="button" class="btn-sm" data-copy-code="${esc(ws.code || "")}" title="Salin kode undangan">Salin kode</button>
      </div>
    </article>`;
  }).join("")}</div>`;
  list.querySelectorAll("[data-enter]").forEach((b) => b.addEventListener("click", () => openWorkspace(b.dataset.enter)));
  list.querySelectorAll("[data-copy-code]").forEach((b) => b.addEventListener("click", () => { navigator.clipboard?.writeText(b.dataset.copyCode); toast("Kode disalin ke papan klip.", "ok"); }));
  renderDashboardHome();
}

function renderNotifications() {
  const unread = state.notifications.filter((n) => !n.read).length;
  const badge = $("notifBadge");
  badge.textContent = String(unread);
  badge.classList.toggle("hidden", unread === 0);

  const renderInto = (el, items) => {
    if (!items.length) { el.innerHTML = `<p class="empty-hint">Belum ada notifikasi.</p>`; return; }
    el.innerHTML = `<div class="notif-list">${items.map((n) => `
      <div class="notif-item ${n.read ? "" : "unread"}" data-nid="${esc(n.id)}" data-ws="${esc(n.wsId || "")}" data-task="${esc(n.taskId || "")}">
        <div><p>${esc(n.text)}</p><small>${esc(n.wsName || "Akasha")} · ${timeAgo()}</small></div>
        ${n.read ? "" : '<span class="notif-dot" aria-label="Belum dibaca"></span>'}
      </div>`).join("")}</div>`;
    el.querySelectorAll(".notif-item").forEach((row) => row.addEventListener("click", () => {
      const item = state.notifications.find((x) => x.id === row.dataset.nid);
      if (item) item.read = true;
      renderNotifications();
      if (row.dataset.ws) openWorkspace(row.dataset.ws, row.dataset.task || null);
    }));
  };
  renderInto($("dashboardNotificationsList"), state.notifications.slice(0, 5));
  renderInto($("dashboardNotificationsListFull"), state.notifications);
}

/* ══════════ WORKSPACE LIFECYCLE (LOCAL PREVIEW) ══════════ */
function openWorkspace(wsId, focusTaskId = null) {
  state.currentWs = state.workspaces.find((w) => w.id === wsId) || state.workspaces[0];
  $("dashboardView").classList.add("hidden");
  $("workspaceView").classList.remove("hidden");
  switchWsTab("tasks");
  syncWorkspaceHeader();
  populateAssigneeSelects();
  renderTasks();
  renderCalendar();
  renderActivities();
  renderAnnouncements();
  renderTeamAndPresence();
  renderDivisions();
  renderMemberSettings();
  loadDailyGoal();
  if (focusTaskId) openTaskDetail(focusTaskId);
}

function leaveToDashboard() {
  state.currentWs = null;
  state.activeTaskId = null;
  $("workspaceView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  switchDashPanel("home");
  renderDashboardHome();
}

function syncWorkspaceHeader() {
  const ws = state.currentWs;
  if (!ws) return;
  const mentor = isMentor();
  $("workspaceTitle").textContent = ws.name;
  $("roleControls").innerHTML = `<span class="role-badge">${mentor ? "Mentor" : "Anggota"}</span><span class="code-pill">${esc(ws.code || "")}</span>`;
  $("mentorPanel").classList.toggle("hidden", !mentor);
  $("mentorTaskCreator").classList.toggle("hidden", !mentor);
  $("announceCreator").classList.toggle("hidden", !mentor);
  $("tabTaskLabel").textContent = mentor ? "Semua Tugas" : "Tugas Saya";
  $("driveLinkInput").value = ws.driveLink || "";
  $("driveStatusText").textContent = ws.driveLink ? "Folder Drive utama aktif." : "Belum ada folder yang tertaut.";
  $("driveStatusText").classList.toggle("ok", !!ws.driveLink);

  $("wsHeroDate").textContent = `${ws.name} · ${formatFullTodayID()}`;
  $("wsHeroGreeting").textContent = mentor ? `Dasbor Mentor — ${ws.name}` : `Ruang Kerja ${ws.name}`;
  $("wsHeroSub").textContent = mentor
    ? "Pantau distribusi tugas tim, tinjau laporan masuk, dan kelola tenggat."
    : "Selesaikan tugas tepat waktu dan laporkan progres Anda ke mentor.";
}

function switchWsTab(tab) {
  const map = {
    tasks: ["mainTaskContainer", "tabTaskView"],
    calendar: ["calendarPanel", "tabCalendarView"],
    activity: ["activityPanel", "tabActivityView"],
    announcements: ["announcementPanel", "tabAnnouncementView"],
    team: ["teamPanel", "tabTeamView"],
    divisions: ["divisionManagementPanel", "tabDivisionView"]
  };
  Object.entries(map).forEach(([k, [panelId, btnId]]) => {
    $(panelId).classList.toggle("hidden", k !== tab);
    $(btnId).classList.toggle("active", k === tab);
  });
}

/* ══════════ TASKS: KANBAN, TABLE, FILTERING & STATS ══════════ */
function populateAssigneeSelects() {
  const members = Object.values(state.members);
  const assignSel = $("taskAssignee");
  assignSel.innerHTML = "";
  const gAll = document.createElement("optgroup"); gAll.label = "Siaran";
  gAll.innerHTML = `<option value="all">Seluruh anggota (${members.length})</option>`;
  assignSel.appendChild(gAll);

  if (state.divisions.length) {
    const gDiv = document.createElement("optgroup"); gDiv.label = "Per divisi";
    state.divisions.forEach((d) => { const o = document.createElement("option"); o.value = `div:${d.id}`; o.textContent = `Divisi ${d.name}`; gDiv.appendChild(o); });
    assignSel.appendChild(gDiv);
  }
  const gMem = document.createElement("optgroup"); gMem.label = "Perorangan";
  members.forEach((m) => { const o = document.createElement("option"); o.value = m.id; o.textContent = `${m.name} (${divisionName(m.divisionId)})`; gMem.appendChild(o); });
  assignSel.appendChild(gMem);
  syncEnhancedSelect(assignSel);

  const fDiv = $("filterDivision");
  const prevDiv = fDiv.value;
  fDiv.innerHTML = `<option value="">Semua divisi</option><option value="general">Umum</option>` +
    state.divisions.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");
  fDiv.value = prevDiv;
  syncEnhancedSelect(fDiv);

  const fAss = $("filterAssignee");
  const prevAss = fAss.value;
  fAss.innerHTML = `<option value="">Semua anggota</option>` + members.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
  fAss.value = prevAss;
  syncEnhancedSelect(fAss);
}

const STATUS_META = {
  todo: ["Belum dimulai", "pill-todo"],
  progress: ["Berjalan", "pill-progress"],
  review: ["Siap dicek", "pill-review"],
  done: ["Selesai", "pill-done"]
};
const DIFF_META = {
  rendah: ["Rendah", "pill-low", 1],
  sedang: ["Sedang", "pill-mid", 2],
  tinggi: ["Tinggi", "pill-high", 3]
};

function renderTasks() {
  const mentor = isMentor();
  const uid = state.user?.uid;
  const search = $("taskSearch").value.trim().toLowerCase();
  const fStatus = $("filterStatus").value;
  const fDiff = $("filterDifficulty").value;
  const fDiv = $("filterDivision").value;
  const fAss = $("filterAssignee").value;
  const sortBy = $("sortTasks").value;

  const visibleBase = state.tasks.filter((t) => mentor || t.assigneeId === uid);

  const totalBase = visibleBase.length;
  const doneBase = visibleBase.filter((t) => t.status === "done").length;
  const pendingBase = totalBase - doneBase;
  const pct = totalBase ? Math.round((doneBase / totalBase) * 100) : 0;
  $("wsProgressPct").textContent = `${pct}%`;
  $("wsDoneStat").textContent = `${doneBase}/${totalBase}`;
  $("wsPendingStat").textContent = String(pendingBase);
  const circumference = 163.36;
  $("wsProgressRing").style.strokeDashoffset = String(circumference - (pct / 100) * circumference);

  let list = visibleBase.filter((t) => {
    if (fStatus && t.status !== fStatus) return false;
    if (fDiff && (t.difficulty || "sedang") !== fDiff) return false;
    if (fDiv && (t.divisionId || "general") !== fDiv) return false;
    if (fAss && t.assigneeId !== fAss) return false;
    if (state.quickActionOnly) {
      const needAction = mentor ? t.status === "review" : (t.status === "todo" || t.status === "progress");
      if (!needAction) return false;
    }
    if (search && !`${t.title} ${t.description || ""} ${t.assigneeName || ""}`.toLowerCase().includes(search)) return false;
    return true;
  });

  if (sortBy === "deadline") {
    list = [...list].sort((a, b) => (a.endDate || "9999-12-31").localeCompare(b.endDate || "9999-12-31"));
  } else if (sortBy === "difficulty") {
    list = [...list].sort((a, b) => (DIFF_META[b.difficulty || "sedang"]?.[2] || 2) - (DIFF_META[a.difficulty || "sedang"]?.[2] || 2));
  }

  const urgent = visibleBase.filter((t) => t.status !== "done" && t.endDate && t.endDate <= today);
  const banner = $("deadlineBanner");
  if (urgent.length) {
    banner.textContent = `${urgent.length} tugas jatuh tempo hari ini atau sudah melewati tenggat.`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  $("kanbanBoardView").classList.toggle("hidden", state.boardMode !== "kanban");
  $("tableBoardView").classList.toggle("hidden", state.boardMode !== "table");
  $("viewKanbanBtn").classList.toggle("active", state.boardMode === "kanban");
  $("viewTableBtn").classList.toggle("active", state.boardMode === "table");

  const cols = { todo: [], progress: [], review: [], done: [] };
  list.forEach((t) => {
    const st = cols[t.status] ? t.status : "todo";
    cols[st].push(t);
  });

  const colMap = { todo: ["colTodo", "countTodo"], progress: ["colProgress", "countProgress"], review: ["colReview", "countReview"], done: ["colDone", "countDone"] };
  Object.entries(colMap).forEach(([st, [bodyId, countId]]) => {
    const items = cols[st];
    $(countId).textContent = String(items.length);
    const bodyEl = $(bodyId);
    if (!items.length) {
      bodyEl.innerHTML = `<div class="kanban-empty">Kosong</div>`;
    } else {
      bodyEl.innerHTML = items.map((t) => {
        const [dLabel, dCls] = DIFF_META[t.difficulty || "sedang"] || DIFF_META.sedang;
        const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
        const subDone = subs.filter((s) => s.done).length;
        const subPct = subs.length ? Math.round((subDone / subs.length) * 100) : 0;
        const dueCls = t.status !== "done" && t.endDate ? (t.endDate < today ? "due-over" : t.endDate === today ? "due-soon" : "") : "";
        return `<article class="kanban-card" data-tid="${esc(t.id)}">
          <div class="kanban-card-top">
            <span class="div-chip">${esc(divisionName(t.divisionId))}</span>
            <span class="stat-pill ${dCls}">${dLabel}</span>
          </div>
          <div class="kanban-card-title">${esc(t.title)}</div>
          ${subs.length ? `<div class="subtask-mini"><span class="subtask-mini-bar"><i style="width:${subPct}%"></i></span>${subDone}/${subs.length}</div>` : ""}
          <div class="kanban-card-meta">
            <span>👤 ${esc(t.assigneeName || memberName(t.assigneeId))}</span>
            <span class="${dueCls}">${t.endDate ? formatDateID(t.endDate) : "Tanpa tenggat"}</span>
          </div>
        </article>`;
      }).join("");
      bodyEl.querySelectorAll(".kanban-card").forEach((c) => c.addEventListener("click", () => openTaskDetail(c.dataset.tid)));
    }
  });

  const tbody = $("taskTableBody");
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Tidak ada tugas yang cocok dengan filter saat ini.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((t) => {
    const [sLabel, sCls] = STATUS_META[t.status] || STATUS_META.todo;
    const [dLabel, dCls] = DIFF_META[t.difficulty || "sedang"] || DIFF_META.sedang;
    const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
    const subDone = subs.filter((s) => s.done).length;
    const subPct = subs.length ? Math.round((subDone / subs.length) * 100) : 0;
    const dueCls = t.status !== "done" && t.endDate ? (t.endDate < today ? "due-over" : t.endDate === today ? "due-soon" : "") : "";
    return `<tr class="task-row" data-tid="${esc(t.id)}">
      <td>
        <div class="task-title-cell">${esc(t.title)}</div>
        ${subs.length ? `<div class="subtask-mini"><span class="subtask-mini-bar"><i style="width:${subPct}%"></i></span>${subDone}/${subs.length} sub-tugas</div>` : ""}
      </td>
      <td class="task-desc-cell">${esc(t.description || "—")}</td>
      <td>${esc(t.assigneeName || memberName(t.assigneeId))} <span class="div-chip">${esc(divisionName(t.divisionId))}</span></td>
      <td class="col-center"><span class="stat-pill ${dCls}">${dLabel}</span></td>
      <td class="col-center"><span class="stat-pill ${sCls}">${sLabel}</span></td>
      <td class="${dueCls}">${formatDateID(t.endDate)}</td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("tr.task-row").forEach((tr) => tr.addEventListener("click", () => openTaskDetail(tr.dataset.tid)));
}

/* ══════════ TASK DETAIL & LOCAL DISCUSSION ══════════ */
function openTaskDetail(taskId) {
  state.activeTaskId = taskId;
  renderTaskDetail(taskId);
  renderTaskComments(taskId);
  $("taskDetailModal").classList.remove("hidden");
}

function renderTaskComments(taskId) {
  const t = state.tasks.find((x) => x.id === taskId);
  const listEl = $("detailCommentList");
  const comments = t?.comments || [];
  if (!comments.length) {
    listEl.innerHTML = `<p class="empty-hint">Belum ada diskusi. Tanyakan kendala atau beri arahan di sini.</p>`;
    return;
  }
  listEl.innerHTML = comments.map((c) => {
    const isMine = c.authorId === state.user?.uid;
    return `<div class="comment-bubble ${isMine ? "mine" : ""}">
      <div class="comment-bubble-head">
        <strong>${esc(c.authorName || "Anggota")}</strong>
        <span>${timeAgo()}</span>
      </div>
      <p>${esc(c.text)}</p>
    </div>`;
  }).join("");
  listEl.scrollTop = listEl.scrollHeight;
}

function renderTaskDetail(taskId) {
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return;
  const mentor = isMentor();
  const mine = t.assigneeId === state.user?.uid;
  const [sLabel, sCls] = STATUS_META[t.status] || STATUS_META.todo;
  const [dLabel, dCls] = DIFF_META[t.difficulty || "sedang"] || DIFF_META.sedang;

  $("detailTaskTitle").textContent = t.title;
  $("detailTaskAssignee").textContent = t.assigneeName || memberName(t.assigneeId);
  $("detailTaskDivisionBadge").textContent = divisionName(t.divisionId);
  const stEl = $("detailTaskStatus"); stEl.textContent = sLabel; stEl.className = `stat-pill ${sCls}`;
  const dfEl = $("detailTaskDifficulty"); dfEl.textContent = `Kesulitan ${dLabel}`; dfEl.className = `stat-pill ${dCls}`;
  $("detailTaskDates").textContent = `${formatDateID(t.startDate)} → ${formatDateID(t.endDate)}`;
  $("detailTaskDesc").textContent = t.description || "Tidak ada instruksi tambahan.";

  const driveHref = safeUrl(t.driveSource === "individual" ? t.reportLink : (state.currentWs?.driveLink || t.driveLink));
  $("detailTaskDrive").innerHTML = driveHref
    ? `<a href="${esc(driveHref)}" target="_blank" rel="noopener noreferrer">Buka folder Google Drive ↗</a>`
    : `<span class="status-text">Belum ada tautan Drive.</span>`;

  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const doneCount = subs.filter((s) => s.done).length;
  const pct = subs.length ? Math.round((doneCount / subs.length) * 100) : 0;
  $("detailProgressText").textContent = `${doneCount}/${subs.length} (${pct}%)`;
  $("detailProgressFill").style.width = `${pct}%`;
  $("detailSubtaskAdd").classList.toggle("hidden", !(mentor || mine));
  $("detailSubtaskList").innerHTML = subs.length ? subs.map((s, idx) => `
    <div class="subtask-item ${s.done ? "done" : ""}">
      <label><input type="checkbox" data-sub-idx="${idx}" ${s.done ? "checked" : ""} /><span>${esc(s.title)}</span></label>
      ${mentor ? `<button type="button" class="subtask-del" data-sub-del="${idx}" aria-label="Hapus sub-tugas">×</button>` : ""}
    </div>`).join("") : `<p class="status-text">Belum ada sub-tugas.</p>`;

  $("detailSubtaskList").querySelectorAll("[data-sub-idx]").forEach((cb) => cb.addEventListener("change", () => {
    subs[Number(cb.dataset.subIdx)].done = cb.checked;
    renderTaskDetail(t.id);
    renderTasks();
  }));
  $("detailSubtaskList").querySelectorAll("[data-sub-del]").forEach((btn) => btn.addEventListener("click", () => {
    subs.splice(Number(btn.dataset.subDel), 1);
    renderTaskDetail(t.id);
    renderTasks();
  }));

  const atts = Array.isArray(t.attachments) ? t.attachments : [];
  $("attachUploader").classList.toggle("hidden", !(mentor || mine));
  $("detailAttachList").innerHTML = atts.length ? atts.map((a, idx) => {
    const href = safeUrl(a.url);
    return `<div class="attach-item">
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(a.name)} ↗</a>` : `<span>${esc(a.name)}</span>`}
      <button type="button" class="subtask-del" data-att-del="${idx}" aria-label="Hapus lampiran">×</button>
    </div>`;
  }).join("") : `<p class="status-text">Belum ada lampiran.</p>`;
  $("detailAttachList").querySelectorAll("[data-att-del]").forEach((btn) => btn.addEventListener("click", () => {
    atts.splice(Number(btn.dataset.attDel), 1);
    renderTaskDetail(t.id);
  }));

  const revBox = $("detailRevisionBox");
  if (t.revisionNotes) { $("detailRevisionNotes").textContent = t.revisionNotes; revBox.classList.remove("hidden"); }
  else revBox.classList.add("hidden");

  const hist = Array.isArray(t.history) ? t.history : [];
  $("detailHistoryList").innerHTML = hist.length
    ? `<div class="history-list">${hist.slice(-6).reverse().map((h) => `<div class="history-item"><span>${esc(h.text)}</span><span>${esc(h.at || "")}</span></div>`).join("")}</div>`
    : `<span class="status-text">Belum ada riwayat perubahan.</span>`;

  const showReport = mine && (t.status === "todo" || t.status === "progress");
  const showReview = mentor && t.status === "review";
  $("detailReportBox").classList.toggle("hidden", !showReport);
  $("detailReviewBox").classList.toggle("hidden", !showReview);
  $("reportError").classList.add("hidden");
  $("reviewError").classList.add("hidden");

  const actBox = $("detailActionButtons");
  actBox.innerHTML = "";
  const addBtn = (label, cls, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = label; b.onclick = fn; actBox.appendChild(b); };
  const stamp = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  if (showReview) {
    addBtn("Terima & selesaikan", "btn-primary", () => {
      t.status = "done";
      t.revisionNotes = "";
      t.history.push({ text: "Disetujui mentor (Preview)", at: stamp });
      renderTaskDetail(t.id);
      renderTasks();
      toast("Tugas ditandai selesai.", "ok");
    });
    addBtn("Minta revisi", "btn-sm btn-danger-outline", () => {
      const note = $("reviewNotes").value.trim();
      if (!note) { $("reviewError").textContent = "Tuliskan catatan bagian yang perlu direvisi."; $("reviewError").classList.remove("hidden"); return; }
      t.status = "progress";
      t.revisionNotes = note;
      t.history.push({ text: `Revisi diminta: ${note}`, at: stamp });
      renderTaskDetail(t.id);
      renderTasks();
      toast("Permintaan revisi dikirim.", "ok");
    });
  }
  if (mentor) {
    addBtn("Edit tugas", "btn-sm", () => {
      $("editTaskId").value = t.id;
      $("editTaskTitleInput").value = t.title;
      $("editTaskDescInput").value = t.description || "";
      $("editTaskModal").classList.remove("hidden");
    });
    addBtn("Hapus tugas", "btn-sm btn-danger-outline", async () => {
      const ok = await appConfirm({ title: "Hapus tugas?", message: `Tugas “${t.title}” akan dihapus (Preview).`, confirmText: "Hapus tugas", danger: true });
      if (!ok) return;
      state.tasks = state.tasks.filter((x) => x.id !== t.id);
      state.dashTasks = state.tasks;
      $("taskDetailModal").classList.add("hidden");
      renderTasks();
      toast("Tugas dihapus.", "ok");
    });
  }
}

/* ══════════ CALENDAR, ACTIVITY, ANNOUNCEMENTS, TEAM, DIVISIONS ══════════ */
function renderCalendar() {
  const d = state.calDate;
  const year = d.getFullYear(), month = d.getMonth();
  $("calTitle").textContent = new Date(year, month, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const visible = state.tasks.filter((t) => t.endDate);

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, iso: "", out: true });
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, iso, out: false });
  }
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDow - daysInMonth + 1, iso: "", out: true });

  const grid = $("calGrid");
  grid.innerHTML = cells.map((c) => {
    const dayTasks = c.iso ? visible.filter((t) => t.endDate === c.iso) : [];
    return `<div class="cal-cell ${c.out ? "out" : ""} ${c.iso === today ? "today" : ""}">
      <span class="cal-day">${c.day}</span>
      ${dayTasks.map((t) => `<button type="button" class="cal-chip ${t.status === "done" ? "done" : c.iso < today ? "over" : ""}" data-cal-task="${esc(t.id)}">${esc(t.title)}</button>`).join("")}
    </div>`;
  }).join("");
  grid.querySelectorAll("[data-cal-task]").forEach((b) => b.addEventListener("click", () => openTaskDetail(b.dataset.calTask)));
}

function renderActivities() {
  const el = $("activityList");
  if (!state.activities.length) { el.innerHTML = `<p class="empty-hint">Belum ada aktivitas tercatat.</p>`; return; }
  el.innerHTML = `<div class="activity-list">${state.activities.map((a) => `<div class="activity-item"><span>${esc(a.text)}</span><small>${timeAgo()}</small></div>`).join("")}</div>`;
}

function renderAnnouncements() {
  const el = $("announceList");
  if (!state.announcements.length) { el.innerHTML = `<p class="empty-hint">Belum ada pengumuman di ruang kerja ini.</p>`; return; }
  const sorted = [...state.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  el.innerHTML = `<div class="announce-list">${sorted.map((a) => `
    <article class="announce-card ${a.pinned ? "pinned" : ""}">
      <div class="announce-head">
        <h4>${a.pinned ? "📌 " : ""}${esc(a.title)}</h4>
        <div style="display:flex;gap:.35rem">
          <button type="button" class="btn-sm" data-edit-ann="${esc(a.id)}">Edit</button>
          <button type="button" class="btn-sm btn-danger-outline" data-del-ann="${esc(a.id)}">Hapus</button>
        </div>
      </div>
      <p class="announce-body">${esc(a.body)}</p>
      <div class="announce-foot"><span>Oleh ${esc(a.authorName || "Mentor")}</span><span>${timeAgo()}</span></div>
    </article>`).join("")}</div>`;

  el.querySelectorAll("[data-edit-ann]").forEach((b) => b.addEventListener("click", () => {
    const a = state.announcements.find((x) => x.id === b.dataset.editAnn);
    if (!a) return;
    $("editAnnounceId").value = a.id;
    $("editAnnounceTitle").value = a.title;
    $("editAnnounceBody").value = a.body;
    $("editAnnounceModal").classList.remove("hidden");
  }));
  el.querySelectorAll("[data-del-ann]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await appConfirm({ title: "Hapus pengumuman?", message: "Pengumuman ini akan dihapus dari papan.", confirmText: "Hapus", danger: true });
    if (ok) {
      state.announcements = state.announcements.filter((x) => x.id !== b.dataset.delAnn);
      renderAnnouncements();
    }
  }));
}

function renderTeamAndPresence() {
  const members = Object.values(state.members);
  const now = Date.now();
  const cardHTML = (m) => {
    const online = m.lastSeen && now - m.lastSeen < 75000;
    const mTasks = state.tasks.filter((t) => t.assigneeId === m.id);
    const mDone = mTasks.filter((t) => t.status === "done").length;
    const mRate = mTasks.length ? Math.round((mDone / mTasks.length) * 100) : 0;
    return `<div class="member-card">
      <div class="member-card-top">
        <span class="presence-dot ${online ? "online" : ""}" title="${online ? "Aktif" : "Offline"}"></span>
        <div>
          <strong>${esc(m.name)}</strong>
          <small>${m.role === "mentor" || m.id === state.currentWs?.ownerId ? "Mentor" : "Anggota"} · ${esc(divisionName(m.divisionId))} · ${online ? "Aktif sekarang" : "Offline"}</small>
        </div>
      </div>
      <div class="member-stats-bar">
        <span>Tugas selesai: <strong>${mDone}/${mTasks.length}</strong></span>
        <span>Skor: <strong>${mRate}%</strong></span>
      </div>
    </div>`;
  };
  const html = members.map(cardHTML).join("");
  $("teamMembersList").innerHTML = html;
  $("memberPresenceList").innerHTML = html;
}

function renderDivisions() {
  const box = $("divisionListContainer");
  if (!state.divisions.length) { box.innerHTML = `<p class="empty-hint">Belum ada divisi khusus.</p>`; return; }
  box.innerHTML = `<div class="division-list">${state.divisions.map((d) => `
    <div class="division-item">
      <div><strong>${esc(d.name)}</strong><p>${esc(d.description || "Tanpa deskripsi")}</p></div>
      <button type="button" class="btn-sm btn-danger-outline" data-del-div="${esc(d.id)}">Hapus</button>
    </div>`).join("")}</div>`;
  box.querySelectorAll("[data-del-div]").forEach((b) => b.addEventListener("click", () => {
    state.divisions = state.divisions.filter((x) => x.id !== b.dataset.delDiv);
    renderDivisions();
    populateAssigneeSelects();
    toast("Divisi dihapus.", "ok");
  }));
}

function renderMemberSettings() {
  const tbody = $("memberSettingsTableBody");
  const members = Object.values(state.members);
  tbody.innerHTML = members.map((m) => {
    const isOwner = m.id === state.currentWs?.ownerId;
    return `<tr>
      <td><strong>${esc(m.name)}</strong></td>
      <td>${esc(m.email || "—")}</td>
      <td class="col-center"><span class="role-badge">${isOwner || m.role === "mentor" ? "Mentor" : "Anggota"}</span></td>
      <td class="col-center"><span class="div-chip">${esc(divisionName(m.divisionId))}</span></td>
      <td class="col-center">${isOwner ? "Pemilik" : `<button type="button" class="btn-sm" data-edit-mem="${esc(m.id)}">Atur</button>`}</td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("[data-edit-mem]").forEach((b) => b.addEventListener("click", () => {
    const m = state.members[b.dataset.editMem];
    if (!m) return;
    $("editMemberId").value = m.id;
    $("editMemberNameDisplay").value = m.name;
    $("editMemberRole").value = m.role === "mentor" ? "mentor" : "worker";
    syncEnhancedSelect($("editMemberRole"));
    const divSel = $("editMemberDivision");
    divSel.innerHTML = `<option value="general">Umum</option>` + state.divisions.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");
    divSel.value = m.divisionId || "general";
    syncEnhancedSelect(divSel);
    $("editMemberModal").classList.remove("hidden");
  }));
}

/* ══════════ DAILY GOAL ══════════ */
function goalKey() { return `akasha_preview_goal_${todayISO()}`; }
function loadDailyGoal() {
  const val = localStorage.getItem(goalKey()) || "";
  $("dailyGoalInput").value = val;
  $("dailyGoalDisplay").innerHTML = val ? `Target aktif hari ini: <strong>${esc(val)}</strong>` : "Belum ada target tersimpan untuk hari ini.";
}

/* ══════════ EVENT WIRING ══════════ */
function wireEvents() {
  $("dashboardNavBtn").onclick = () => switchDashPanel("home");
  $("myWorkspacesNavBtn").onclick = () => switchDashPanel("workspaces");
  $("notificationsNavBtn").onclick = () => switchDashPanel("notifications");
  $("notificationsNavBtnTop").onclick = () => switchDashPanel("notifications");
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => switchDashPanel(b.dataset.goto)));

  const openAccount = () => { $("accountName").value = state.user?.displayName || ""; $("accountPassword").value = ""; $("accountModal").classList.remove("hidden"); };
  $("accountBtn").onclick = openAccount;
  $("accountBtnTop").onclick = openAccount;

  $("accountForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("accountName").value.trim();
    if (name) {
      state.user.displayName = name;
      $("topbarUserName").textContent = name;
      $("topbarUserAvatar").textContent = initialOf(name);
      renderDashboardHome();
    }
    $("accountModal").classList.add("hidden");
    toast("Profil preview diperbarui.", "ok");
  });

  const darkToggle = $("darkModeToggle");
  darkToggle.checked = localStorage.getItem("akasha_dark") === "1";
  document.documentElement.classList.toggle("dark", darkToggle.checked);
  darkToggle.addEventListener("change", () => {
    document.documentElement.classList.toggle("dark", darkToggle.checked);
    localStorage.setItem("akasha_dark", darkToggle.checked ? "1" : "0");
  });

  $("markAllReadBtn").addEventListener("click", () => {
    state.notifications.forEach((n) => (n.read = true));
    renderNotifications();
    toast("Semua notifikasi ditandai dibaca.", "ok");
  });

  $("logoutBtn").addEventListener("click", () => toast("Mode Preview aktif (tanpa halaman login).", "ok"));

  $("createWorkspaceBtn").onclick = () => { $("newWorkspaceName").value = ""; $("newWorkspaceCode").value = Math.random().toString(36).substring(2, 8).toUpperCase(); $("createWorkspaceModal").classList.remove("hidden"); };
  $("joinWorkspaceBtn").onclick = () => { $("joinCodeInput").value = ""; $("joinWorkspaceModal").classList.remove("hidden"); };

  $("createWorkspaceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("newWorkspaceName").value.trim();
    const code = $("newWorkspaceCode").value.trim().toUpperCase();
    if (!name || code.length !== 6) return toast("Nama dan kode 6 karakter wajib diisi.", "bad");
    const newWs = { id: `ws-${Date.now()}`, name, code, ownerId: "demo-mentor", memberIds: ["demo-mentor"], driveLink: "" };
    state.workspaces.push(newWs);
    $("createWorkspaceModal").classList.add("hidden");
    renderWorkspaceLists();
    toast("Ruang kerja preview dibuat.", "ok");
  });

  $("joinWorkspaceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("joinWorkspaceModal").classList.add("hidden");
    toast("Simulasi gabung ruang kerja berhasil.", "ok");
  });

  $("tabTaskView").onclick = () => switchWsTab("tasks");
  $("tabCalendarView").onclick = () => { switchWsTab("calendar"); renderCalendar(); };
  $("tabActivityView").onclick = () => switchWsTab("activity");
  $("tabAnnouncementView").onclick = () => switchWsTab("announcements");
  $("tabTeamView").onclick = () => switchWsTab("team");
  $("tabDivisionView").onclick = () => switchWsTab("divisions");
  $("backToDashboardBtn").onclick = leaveToDashboard;

  $("toggleCreatorBtn").addEventListener("click", () => {
    const form = $("createTaskForm");
    const hidden = form.classList.toggle("hidden");
    $("toggleCreatorBtn").textContent = hidden ? "Tampilkan Form" : "Sembunyikan Form";
  });

  $("viewKanbanBtn").addEventListener("click", () => {
    state.boardMode = "kanban";
    localStorage.setItem("akasha_board_mode", "kanban");
    renderTasks();
  });
  $("viewTableBtn").addEventListener("click", () => {
    state.boardMode = "table";
    localStorage.setItem("akasha_board_mode", "table");
    renderTasks();
  });
  $("quickActionFilterBtn").addEventListener("click", () => {
    state.quickActionOnly = !state.quickActionOnly;
    $("quickActionFilterBtn").classList.toggle("active", state.quickActionOnly);
    renderTasks();
  });

  $("saveDailyGoalBtn").addEventListener("click", () => {
    localStorage.setItem(goalKey(), $("dailyGoalInput").value.trim());
    loadDailyGoal();
    toast("Target harian disimpan.", "ok");
  });

  $("taskDriveSource").addEventListener("change", () => {
    $("workspaceDriveGroup").classList.toggle("hidden", $("taskDriveSource").value === "individual");
  });
  $("saveDriveBtn").addEventListener("click", () => {
    state.currentWs.driveLink = safeUrl($("driveLinkInput").value);
    syncWorkspaceHeader();
    toast("Tautan Drive disimpan (Preview).", "ok");
  });

  $("createTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("taskTitle").value.trim();
    if (!title) return;
    const target = $("taskAssignee").value;
    const assignee = state.members[target] || state.members["m2"];
    const subtasks = $("taskSubtasks").value.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => ({ title: s, done: false }));
    state.tasks.unshift({
      id: `t-${Date.now()}`,
      wsId: state.currentWs.id,
      wsName: state.currentWs.name,
      title,
      difficulty: $("taskDifficulty").value,
      startDate: $("startDate").value || today,
      endDate: $("endDate").value || today,
      description: $("taskDesc").value.trim(),
      subtasks,
      attachments: [],
      status: "todo",
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      divisionId: assignee.divisionId || "general",
      history: [{ text: "Tugas dibuat (Preview)", at: "Baru saja" }],
      comments: []
    });
    state.dashTasks = state.tasks;
    $("createTaskForm").reset();
    renderTasks();
    toast("Tugas contoh ditambahkan.", "ok");
  });

  ["taskSearch", "filterStatus", "filterDifficulty", "filterDivision", "filterAssignee", "sortTasks"].forEach((id) => {
    $(id).addEventListener("input", renderTasks);
    $(id).addEventListener("change", renderTasks);
  });

  $("addSubtaskBtn").addEventListener("click", () => {
    const val = $("subtaskInput").value.trim();
    const t = state.tasks.find((x) => x.id === state.activeTaskId);
    if (!val || !t) return;
    t.subtasks.push({ title: val, done: false });
    $("subtaskInput").value = "";
    renderTaskDetail(t.id);
    renderTasks();
  });

  $("addAttachBtn").addEventListener("click", () => {
    const name = $("attachName").value.trim() || "Lampiran tautan";
    const url = safeUrl($("attachUrl").value);
    const t = state.tasks.find((x) => x.id === state.activeTaskId);
    if (!url || !t) return toast("Masukkan URL lampiran yang valid.", "bad");
    t.attachments.push({ name, url });
    $("attachName").value = ""; $("attachUrl").value = "";
    renderTaskDetail(t.id);
  });

  $("taskCommentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("taskCommentInput");
    const text = inp.value.trim();
    const t = state.tasks.find((x) => x.id === state.activeTaskId);
    if (!text || !t) return;
    inp.value = "";
    t.comments.push({ authorId: state.user.uid, authorName: state.user.displayName, text });
    renderTaskComments(t.id);
  });

  $("editTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = state.tasks.find((x) => x.id === $("editTaskId").value);
    if (t) {
      t.title = $("editTaskTitleInput").value.trim();
      t.description = $("editTaskDescInput").value.trim();
      renderTaskDetail(t.id);
      renderTasks();
    }
    $("editTaskModal").classList.add("hidden");
    toast("Tugas diperbarui.", "ok");
  });

  $("announceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("announceTitle").value.trim();
    const body = $("announceBody").value.trim();
    if (!title || !body) return;
    state.announcements.unshift({ id: `ann-${Date.now()}`, title, body, pinned: $("announcePinned").checked, authorName: state.user.displayName });
    $("announceForm").reset();
    renderAnnouncements();
    toast("Pengumuman dikirim.", "ok");
  });

  $("editAnnounceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = state.announcements.find((x) => x.id === $("editAnnounceId").value);
    if (a) {
      a.title = $("editAnnounceTitle").value.trim();
      a.body = $("editAnnounceBody").value.trim();
      renderAnnouncements();
    }
    $("editAnnounceModal").classList.add("hidden");
    toast("Pengumuman diperbarui.", "ok");
  });

  $("createDivisionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("newDivisionName").value.trim();
    if (!name) return;
    state.divisions.push({ id: `div-${Date.now()}`, name, description: $("newDivisionDesc").value.trim() });
    $("createDivisionForm").reset();
    renderDivisions();
    populateAssigneeSelects();
    toast("Divisi dibuat.", "ok");
  });

  $("editMemberForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const m = state.members[$("editMemberId").value];
    if (m) {
      m.role = $("editMemberRole").value;
      m.divisionId = $("editMemberDivision").value;
      renderMemberSettings();
      renderTeamAndPresence();
      renderTasks();
    }
    $("editMemberModal").classList.add("hidden");
    toast("Pengaturan anggota disimpan.", "ok");
  });

  $("calPrev").onclick = () => { state.calDate.setMonth(state.calDate.getMonth() - 1); renderCalendar(); };
  $("calNext").onclick = () => { state.calDate.setMonth(state.calDate.getMonth() + 1); renderCalendar(); };
  $("calToday").onclick = () => { state.calDate = new Date(); renderCalendar(); };

  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.close;
    if (id === "taskDetailModal") state.activeTaskId = null;
    $(id).classList.add("hidden");
  }));
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
    if (e.target === m && m.id !== "appDialog") {
      if (m.id === "taskDetailModal") state.activeTaskId = null;
      m.classList.add("hidden");
    }
  }));
}

/* ══════════ BOOT PREVIEW MODE ══════════ */
document.querySelectorAll("select[data-enhance]").forEach(enhanceSelect);
wireEvents();

// Langsung buka Dashboard tanpa halaman login
$("authView").classList.add("hidden");
$("dashboardView").classList.remove("hidden");
$("topbarUserName").textContent = state.user.displayName;
$("topbarUserAvatar").textContent = initialOf(state.user.displayName);

renderWorkspaceLists();
renderDashboardHome();
renderNotifications();
