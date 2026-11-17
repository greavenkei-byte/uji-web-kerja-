/* Akasha — application logic (v3 Revamp: Hero Banner, Kanban, Task Discussion, Contribution) */
import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js)";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  sendPasswordResetEmail, updateProfile, updatePassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js)";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, writeBatch
} from "[https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js)";

/* ⚠️ TEMPELKAN KONFIGURASI FIREBASE MILIKMU DI SINI ⚠️ */
const firebaseConfig = {
  apiKey: "ISI_API_KEY_KAMU",
  authDomain: "ISI_AUTH_DOMAIN_KAMU",
  projectId: "ISI_PROJECT_ID_KAMU",
  storageBucket: "ISI_STORAGE_BUCKET_KAMU",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID_KAMU",
  appId: "ISI_APP_ID_KAMU"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

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
const timeAgo = (ts) => {
  if (!ts) return "baru saja";
  const sec = Math.max(1, Math.floor((Date.now() - (ts.toMillis ? ts.toMillis() : Number(ts))) / 1000));
  if (sec < 60) return "baru saja";
  if (sec < 3600) return `${Math.floor(sec / 60)} mnt lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
  return `${Math.floor(sec / 86400)} hr lalu`;
};
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
  const arrow = document.createElementNS("[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)", "svg");
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

/* ══════════ STATE ══════════ */
const state = {
  user: null,
  workspaces: [],
  dashTasks: [],
  notifications: [],
  currentWs: null,
  members: {},
  divisions: [],
  tasks: [],
  activities: [],
  announcements: [],
  activeTaskId: null,
  boardMode: localStorage.getItem("akasha_board_mode") || "kanban",
  quickActionOnly: false,
  calDate: new Date(),
  unsubs: [],
  dashUnsubs: [],
  commentUnsub: null,
  presenceTimer: null
};

const clearUnsubs = (list) => { while (list.length) { try { list.pop()(); } catch {} } };
const isMentor = () => !!(state.currentWs && state.user && (state.currentWs.ownerId === state.user.uid || state.members[state.user.uid]?.role === "mentor"));
const myDivisionId = () => state.members[state.user?.uid]?.divisionId || "general";
const divisionName = (id) => id === "general" || !id ? "Umum" : (state.divisions.find((d) => d.id === id)?.name || "Umum");
const memberName = (uid) => state.members[uid]?.name || "Anggota";

/* ══════════ AUTH ══════════ */
function initAuthUI() {
  $("authToggleLink").addEventListener("click", (e) => { e.preventDefault(); $("loginForm").classList.add("hidden"); $("registerForm").classList.remove("hidden"); });
  $("authToggleLink2").addEventListener("click", (e) => { e.preventDefault(); $("registerForm").classList.add("hidden"); $("loginForm").classList.remove("hidden"); });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("loginBtn");
    btn.disabled = true; btn.textContent = "Memproses…";
    try {
      await setPersistence(auth, $("rememberMe").checked ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value);
    } catch (err) {
      toast(err.code === "auth/invalid-credential" ? "Email atau kata sandi salah." : err.message, "bad");
    } finally { btn.disabled = false; btn.textContent = "Masuk ke ruang kerja"; }
  });

  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("registerName").value.trim();
    if (!name) return toast("Nama wajib diisi.", "bad");
    const btn = $("registerBtn");
    btn.disabled = true; btn.textContent = "Membuat akun…";
    try {
      const cred = await createUserWithEmailAndPassword(auth, $("registerEmail").value.trim(), $("registerPassword").value);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), { name, email: cred.user.email, createdAt: serverTimestamp() }, { merge: true });
      toast("Akun berhasil dibuat.", "ok");
    } catch (err) {
      toast(err.code === "auth/email-already-in-use" ? "Email sudah terdaftar." : err.message, "bad");
    } finally { btn.disabled = false; btn.textContent = "Buat akun"; }
  });

  $("googleLoginBtn").addEventListener("click", async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await setDoc(doc(db, "users", cred.user.uid), { name: cred.user.displayName || "Pengguna", email: cred.user.email }, { merge: true });
    } catch (err) { toast(err.message, "bad"); }
  });

  $("forgotPasswordLink").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = await appPrompt({
      title: "Atur ulang kata sandi",
      message: "Tautan pemulihan akan dikirim ke email Anda.",
      label: "Alamat email",
      initial: $("loginEmail").value.trim(),
      validate: (v) => (!v || !v.includes("@") ? "Masukkan alamat email yang valid." : null)
    });
    if (!email) return;
    try { await sendPasswordResetEmail(auth, email); toast("Email pemulihan telah dikirim.", "ok"); }
    catch (err) { toast(err.message, "bad"); }
  });

  $("logoutBtn").addEventListener("click", async () => {
    clearUnsubs(state.unsubs);
    clearUnsubs(state.dashUnsubs);
    if (state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; }
    if (state.presenceTimer) clearInterval(state.presenceTimer);
    await signOut(auth);
  });
}

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

function subscribeDashboard() {
  clearUnsubs(state.dashUnsubs);
  const uid = state.user.uid;

  const qWs = query(collection(db, "workspaces"), where("memberIds", "array-contains", uid));
  state.dashUnsubs.push(onSnapshot(qWs, (snap) => {
    state.workspaces = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderWorkspaceLists();
    subscribeDashboardTasks();
  }));

  const qNotif = query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(30));
  state.dashUnsubs.push(onSnapshot(qNotif, (snap) => {
    state.notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderNotifications();
  }));
}

let dashTaskUnsubs = [];
function subscribeDashboardTasks() {
  clearUnsubs(dashTaskUnsubs);
  state.dashTasks = [];
  if (!state.workspaces.length) { renderDashboardHome(); return; }
  const mapByWs = new Map();
  state.workspaces.forEach((ws) => {
    const unsub = onSnapshot(collection(db, "workspaces", ws.id, "tasks"), (snap) => {
      const uid = state.user.uid;
      const wsIsMentor = ws.ownerId === uid;
      const items = snap.docs.map((d) => ({ id: d.id, wsId: ws.id, wsName: ws.name, ...d.data() }))
        .filter((t) => wsIsMentor || t.assigneeId === uid);
      mapByWs.set(ws.id, items);
      state.dashTasks = Array.from(mapByWs.values()).flat();
      renderDashboardHome();
    });
    dashTaskUnsubs.push(unsub);
  });
}

function renderDashboardHome() {
  const tasks = state.dashTasks;
  const total = tasks.length;
  const active = tasks.filter((t) => t.status === "todo" || t.status === "progress").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Update Hero Banner Dashboard
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

  const today = todayISO();
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
  if (!state.workspaces.length) {
    prev.innerHTML = `<p class="empty-hint">Belum tergabung di ruang kerja mana pun.</p>`;
  } else {
    prev.innerHTML = `<div class="ws-preview-list">${state.workspaces.slice(0, 4).map((ws) => `
      <button type="button" class="ws-preview-item" data-open-ws="${esc(ws.id)}">
        <span><strong>${esc(ws.name)}</strong><span>${(ws.memberIds || []).length} anggota</span></span>
        <span class="code-pill">${esc(ws.code || "")}</span>
      </button>`).join("")}</div>`;
    prev.querySelectorAll("[data-open-ws]").forEach((b) => b.addEventListener("click", () => openWorkspace(b.dataset.openWs)));
  }
}

function renderWorkspaceLists() {
  const list = $("workspaceList");
  if (!state.workspaces.length) {
    list.innerHTML = `<p class="empty-hint">Belum ada ruang kerja. Buat ruang baru atau gabung dengan kode 6 karakter.</p>`;
  } else {
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
  }
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
        <div><p>${esc(n.text)}</p><small>${esc(n.wsName || "Akasha")} · ${timeAgo(n.createdAt)}</small></div>
        ${n.read ? "" : '<span class="notif-dot" aria-label="Belum dibaca"></span>'}
      </div>`).join("")}</div>`;
    el.querySelectorAll(".notif-item").forEach((row) => row.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", state.user.uid, "notifications", row.dataset.nid), { read: true }).catch(() => {});
      if (row.dataset.ws) openWorkspace(row.dataset.ws, row.dataset.task || null);
    }));
  };
  renderInto($("dashboardNotificationsList"), state.notifications.slice(0, 5));
  renderInto($("dashboardNotificationsListFull"), state.notifications);
}

async function notifyUser(uid, { text, wsId = "", wsName = "", taskId = "" }) {
  if (!uid || uid === state.user?.uid) return;
  await addDoc(collection(db, "users", uid, "notifications"), { text, wsId, wsName, taskId, read: false, createdAt: serverTimestamp() }).catch(() => {});
}

/* ══════════ WORKSPACE LIFECYCLE ══════════ */
async function openWorkspace(wsId, focusTaskId = null) {
  clearUnsubs(state.unsubs);
  if (state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; }
  if (state.presenceTimer) clearInterval(state.presenceTimer);

  const wsSnap = await getDoc(doc(db, "workspaces", wsId));
  if (!wsSnap.exists()) return toast("Ruang kerja tidak ditemukan.", "bad");
  state.currentWs = { id: wsSnap.id, ...wsSnap.data() };

  $("dashboardView").classList.add("hidden");
  $("workspaceView").classList.remove("hidden");
  switchWsTab("tasks");

  const wsRef = doc(db, "workspaces", wsId);
  state.unsubs.push(onSnapshot(wsRef, (snap) => {
    if (!snap.exists()) { leaveToDashboard(); return; }
    state.currentWs = { id: snap.id, ...snap.data() };
    syncWorkspaceHeader();
  }));

  state.unsubs.push(onSnapshot(collection(db, "workspaces", wsId, "members"), (snap) => {
    state.members = {};
    snap.forEach((d) => { state.members[d.id] = { id: d.id, ...d.data() }; });
    syncWorkspaceHeader();
    populateAssigneeSelects();
    renderTeamAndPresence();
    renderMemberSettings();
    renderTasks();
  }));

  state.unsubs.push(onSnapshot(collection(db, "workspaces", wsId, "divisions"), (snap) => {
    state.divisions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    populateAssigneeSelects();
    renderDivisions();
    renderMemberSettings();
    renderTasks();
  }));

  const qTasks = query(collection(db, "workspaces", wsId, "tasks"), orderBy("createdAt", "desc"));
  state.unsubs.push(onSnapshot(qTasks, (snap) => {
    state.tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTasks();
    renderCalendar();
    renderTeamAndPresence();
    if (state.activeTaskId) renderTaskDetail(state.activeTaskId);
    if (focusTaskId) { const id = focusTaskId; focusTaskId = null; openTaskDetail(id); }
  }));

  const qAct = query(collection(db, "workspaces", wsId, "activities"), orderBy("createdAt", "desc"), limit(100));
  state.unsubs.push(onSnapshot(qAct, (snap) => {
    state.activities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderActivities();
  }));

  const qAnn = query(collection(db, "workspaces", wsId, "announcements"), orderBy("createdAt", "desc"));
  state.unsubs.push(onSnapshot(qAnn, (snap) => {
    state.announcements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAnnouncements();
  }));

  const beat = () => setDoc(doc(db, "workspaces", wsId, "members", state.user.uid), {
    name: state.user.displayName || "Anggota",
    email: state.user.email || "",
    lastSeen: Date.now()
  }, { merge: true }).catch(() => {});
  beat();
  state.presenceTimer = setInterval(beat, 30000);
  loadDailyGoal();
}

function leaveToDashboard() {
  clearUnsubs(state.unsubs);
  if (state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; }
  if (state.presenceTimer) clearInterval(state.presenceTimer);
  state.currentWs = null;
  state.activeTaskId = null;
  $("workspaceView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  switchDashPanel("home");
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

  // Sync Workspace Hero Banner
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

async function logActivity(text) {
  if (!state.currentWs) return;
  await addDoc(collection(db, "workspaces", state.currentWs.id, "activities"), {
    text, actorId: state.user.uid, actorName: state.user.displayName || "Anggota", createdAt: serverTimestamp()
  }).catch(() => {});
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
  const today = todayISO();

  const visibleBase = state.tasks.filter((t) => mentor || t.assigneeId === uid);

  // Update Workspace Hero Metrics
  const totalBase = visibleBase.length;
  const doneBase = visibleBase.filter((t) => t.status === "done").length;
  const pendingBase = totalBase - doneBase;
  const pct = totalBase ? Math.round((doneBase / totalBase) * 100) : 0;
  $("wsProgressPct").textContent = `${pct}%`;
  $("wsDoneStat").textContent = `${doneBase}/${totalBase}`;
  $("wsPendingStat").textContent = String(pendingBase);
  const circumference = 163.36;
  $("wsProgressRing").style.strokeDashoffset = String(circumference - (pct / 100) * circumference);

  // Filter
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

  // Sort
  if (sortBy === "deadline") {
    list = [...list].sort((a, b) => (a.endDate || "9999-12-31").localeCompare(b.endDate || "9999-12-31"));
  } else if (sortBy === "difficulty") {
    list = [...list].sort((a, b) => (DIFF_META[b.difficulty || "sedang"]?.[2] || 2) - (DIFF_META[a.difficulty || "sedang"]?.[2] || 2));
  }

  // Deadline Banner
  const urgent = visibleBase.filter((t) => t.status !== "done" && t.endDate && t.endDate <= today);
  const banner = $("deadlineBanner");
  if (urgent.length) {
    banner.textContent = `${urgent.length} tugas jatuh tempo hari ini atau sudah melewati tenggat.`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  // Toggle View Mode
  $("kanbanBoardView").classList.toggle("hidden", state.boardMode !== "kanban");
  $("tableBoardView").classList.toggle("hidden", state.boardMode !== "table");
  $("viewKanbanBtn").classList.toggle("active", state.boardMode === "kanban");
  $("viewTableBtn").classList.toggle("active", state.boardMode === "table");

  // 1. Render Kanban
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

  // 2. Render Table
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

/* ══════════ TASK DETAIL & REAL-TIME DISCUSSION ══════════ */
function openTaskDetail(taskId) {
  state.activeTaskId = taskId;
  renderTaskDetail(taskId);
  subscribeTaskComments(taskId);
  $("taskDetailModal").classList.remove("hidden");
}

function subscribeTaskComments(taskId) {
  if (state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; }
  const ws = state.currentWs;
  if (!ws || !taskId) return;
  const listEl = $("detailCommentList");
  listEl.innerHTML = `<p class="empty-hint">Memuat diskusi…</p>`;

  const qCom = query(collection(db, "workspaces", ws.id, "tasks", taskId, "comments"), orderBy("createdAt", "asc"), limit(100));
  state.commentUnsub = onSnapshot(qCom, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = `<p class="empty-hint">Belum ada diskusi. Tanyakan kendala atau beri arahan di sini.</p>`;
      return;
    }
    listEl.innerHTML = snap.docs.map((d) => {
      const c = d.data();
      const isMine = c.authorId === state.user?.uid;
      return `<div class="comment-bubble ${isMine ? "mine" : ""}">
        <div class="comment-bubble-head">
          <strong>${esc(c.authorName || "Anggota")}</strong>
          <span>${timeAgo(c.createdAt)}</span>
        </div>
        <p>${esc(c.text)}</p>
      </div>`;
    }).join("");
    listEl.scrollTop = listEl.scrollHeight;
  });
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
    : `<span class="status-text">${t.driveSource === "individual" ? "Anggota menyertakan tautan saat mengirim laporan." : "Belum ada tautan Drive."}</span>`;

  // Subtasks
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const doneCount = subs.filter((s) => s.done).length;
  const pct = subs.length ? Math.round((doneCount / subs.length) * 100) : 0;
  $("detailProgressText").textContent = `${doneCount}/${subs.length} (${pct}%)`;
  $("detailProgressFill").style.width = `${pct}%`;
  $("detailSubtaskAdd").classList.toggle("hidden", !(mentor || mine));
  $("detailSubtaskList").innerHTML = subs.length ? subs.map((s, idx) => `
    <div class="subtask-item ${s.done ? "done" : ""}">
      <label><input type="checkbox" data-sub-idx="${idx}" ${s.done ? "checked" : ""} ${mentor || mine ? "" : "disabled"} /><span>${esc(s.title)}</span></label>
      ${mentor ? `<button type="button" class="subtask-del" data-sub-del="${idx}" aria-label="Hapus sub-tugas">×</button>` : ""}
    </div>`).join("") : `<p class="status-text">Belum ada sub-tugas.</p>`;

  $("detailSubtaskList").querySelectorAll("[data-sub-idx]").forEach((cb) => cb.addEventListener("change", async () => {
    const next = subs.map((item, i) => i === Number(cb.dataset.subIdx) ? { ...item, done: cb.checked } : item);
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", t.id), { subtasks: next });
  }));
  $("detailSubtaskList").querySelectorAll("[data-sub-del]").forEach((btn) => btn.addEventListener("click", async () => {
    const next = subs.filter((_, i) => i !== Number(btn.dataset.subDel));
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", t.id), { subtasks: next });
  }));

  // Attachments
  const atts = Array.isArray(t.attachments) ? t.attachments : [];
  $("attachUploader").classList.toggle("hidden", !(mentor || mine));
  $("detailAttachList").innerHTML = atts.length ? atts.map((a, idx) => {
    const href = safeUrl(a.url);
    return `<div class="attach-item">
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(a.name)} ↗</a>` : `<span>${esc(a.name)}</span>`}
      ${mentor || mine ? `<button type="button" class="subtask-del" data-att-del="${idx}" aria-label="Hapus lampiran">×</button>` : ""}
    </div>`;
  }).join("") : `<p class="status-text">Belum ada lampiran.</p>`;
  $("detailAttachList").querySelectorAll("[data-att-del]").forEach((btn) => btn.addEventListener("click", async () => {
    const next = atts.filter((_, i) => i !== Number(btn.dataset.attDel));
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", t.id), { attachments: next });
  }));

  // Revision box
  const revBox = $("detailRevisionBox");
  if (t.revisionNotes) { $("detailRevisionNotes").textContent = t.revisionNotes; revBox.classList.remove("hidden"); }
  else revBox.classList.add("hidden");

  // History
  const hist = Array.isArray(t.history) ? t.history : [];
  $("detailHistoryList").innerHTML = hist.length
    ? `<div class="history-list">${hist.slice(-6).reverse().map((h) => `<div class="history-item"><span>${esc(h.text)}</span><span>${esc(h.at || "")}</span></div>`).join("")}</div>`
    : `<span class="status-text">Belum ada riwayat perubahan.</span>`;

  // Report & Review boxes
  const showReport = mine && (t.status === "todo" || t.status === "progress");
  const showReview = mentor && t.status === "review";
  $("detailReportBox").classList.toggle("hidden", !showReport);
  $("detailReviewBox").classList.toggle("hidden", !showReview);
  $("reportError").classList.add("hidden");
  $("reviewError").classList.add("hidden");
  if (showReport) { $("reportLink").value = t.reportLink || ""; $("reportNotes").value = t.reportNotes || ""; }
  if (showReview) { $("reviewNotes").value = ""; }

  // Action buttons
  const actBox = $("detailActionButtons");
  actBox.innerHTML = "";
  const addBtn = (label, cls, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = label; b.onclick = fn; actBox.appendChild(b); };
  const taskRef = doc(db, "workspaces", state.currentWs.id, "tasks", t.id);
  const stamp = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  if (mine && t.status === "todo") {
    addBtn("Mulai kerjakan", "btn-sm", async () => {
      await updateDoc(taskRef, { status: "progress", history: arrayUnion({ text: "Mulai dikerjakan", at: stamp }) });
      logActivity(`${state.user.displayName} mulai mengerjakan “${t.title}”`);
    });
  }
  if (showReport) {
    addBtn("Kirim laporan ke mentor", "btn-primary", async () => {
      const link = safeUrl($("reportLink").value);
      if (!link) { $("reportError").textContent = "Masukkan tautan hasil kerja yang valid (https://…)."; $("reportError").classList.remove("hidden"); return; }
      const notes = $("reportNotes").value.trim();
      await updateDoc(taskRef, {
        status: "review", reportLink: link, reportNotes: notes,
        attachments: arrayUnion({ name: "Laporan hasil kerja", url: link }),
        history: arrayUnion({ text: "Laporan dikirim untuk ulasan", at: stamp })
      });
      await logActivity(`${state.user.displayName} mengirim laporan untuk “${t.title}”`);
      await notifyUser(state.currentWs.ownerId, { text: `${state.user.displayName} mengirim laporan tugas “${t.title}”.`, wsId: state.currentWs.id, wsName: state.currentWs.name, taskId: t.id });
      toast("Laporan berhasil dikirim.", "ok");
    });
  }
  if (showReview) {
    addBtn("Terima & selesaikan", "btn-primary", async () => {
      await updateDoc(taskRef, { status: "done", revisionNotes: "", history: arrayUnion({ text: "Disetujui mentor", at: stamp }) });
      await logActivity(`Mentor menyetujui tugas “${t.title}”`);
      await notifyUser(t.assigneeId, { text: `Tugas “${t.title}” telah disetujui mentor.`, wsId: state.currentWs.id, wsName: state.currentWs.name, taskId: t.id });
      toast("Tugas ditandai selesai.", "ok");
    });
    addBtn("Minta revisi", "btn-sm btn-danger-outline", async () => {
      const note = $("reviewNotes").value.trim();
      if (!note) { $("reviewError").textContent = "Tuliskan catatan bagian yang perlu direvisi."; $("reviewError").classList.remove("hidden"); return; }
      await updateDoc(taskRef, { status: "progress", revisionNotes: note, history: arrayUnion({ text: `Revisi diminta: ${note}`, at: stamp }) });
      await logActivity(`Mentor meminta revisi pada “${t.title}”`);
      await notifyUser(t.assigneeId, { text: `Revisi diminta pada “${t.title}”: ${note}`, wsId: state.currentWs.id, wsName: state.currentWs.name, taskId: t.id });
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
      const ok = await appConfirm({ title: "Hapus tugas?", message: `Tugas “${t.title}” akan dihapus permanen.`, confirmText: "Hapus tugas", danger: true });
      if (!ok) return;
      await deleteDoc(taskRef);
      if (state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; }
      $("taskDetailModal").classList.add("hidden");
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
  const today = todayISO();
  const mentor = isMentor();
  const visible = state.tasks.filter((t) => (mentor || t.assigneeId === state.user?.uid) && t.endDate);

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
  el.innerHTML = `<div class="activity-list">${state.activities.map((a) => `<div class="activity-item"><span>${esc(a.text)}</span><small>${timeAgo(a.createdAt)}</small></div>`).join("")}</div>`;
}

function renderAnnouncements() {
  const el = $("announceList");
  if (!state.announcements.length) { el.innerHTML = `<p class="empty-hint">Belum ada pengumuman di ruang kerja ini.</p>`; return; }
  const sorted = [...state.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const mentor = isMentor();
  el.innerHTML = `<div class="announce-list">${sorted.map((a) => `
    <article class="announce-card ${a.pinned ? "pinned" : ""}">
      <div class="announce-head">
        <h4>${a.pinned ? "📌 " : ""}${esc(a.title)}</h4>
        ${mentor ? `<div style="display:flex;gap:.35rem">
          <button type="button" class="btn-sm" data-edit-ann="${esc(a.id)}">Edit</button>
          <button type="button" class="btn-sm btn-danger-outline" data-del-ann="${esc(a.id)}">Hapus</button>
        </div>` : ""}
      </div>
      <p class="announce-body">${esc(a.body)}</p>
      <div class="announce-foot"><span>Oleh ${esc(a.authorName || "Mentor")}</span><span>${timeAgo(a.createdAt)}</span></div>
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
    if (ok) await deleteDoc(doc(db, "workspaces", state.currentWs.id, "announcements", b.dataset.delAnn));
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
  const html = members.length ? members.map(cardHTML).join("") : `<p class="empty-hint">Belum ada anggota.</p>`;
  $("teamMembersList").innerHTML = html;
  $("memberPresenceList").innerHTML = html;
}

function renderDivisions() {
  const box = $("divisionListContainer");
  if (!state.divisions.length) { box.innerHTML = `<p class="empty-hint">Belum ada divisi khusus. Semua anggota berada di divisi “Umum”.</p>`; return; }
  box.innerHTML = `<div class="division-list">${state.divisions.map((d) => `
    <div class="division-item">
      <div><strong>${esc(d.name)}</strong><p>${esc(d.description || "Tanpa deskripsi")}</p></div>
      <button type="button" class="btn-sm btn-danger-outline" data-del-div="${esc(d.id)}">Hapus</button>
    </div>`).join("")}</div>`;
  box.querySelectorAll("[data-del-div]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await appConfirm({ title: "Hapus divisi?", message: "Anggota divisi ini akan dipindahkan ke divisi Umum.", confirmText: "Hapus divisi", danger: true });
    if (!ok) return;
    const batch = writeBatch(db);
    Object.values(state.members).filter((m) => m.divisionId === b.dataset.delDiv).forEach((m) => {
      batch.update(doc(db, "workspaces", state.currentWs.id, "members", m.id), { divisionId: "general" });
    });
    batch.delete(doc(db, "workspaces", state.currentWs.id, "divisions", b.dataset.delDiv));
    await batch.commit();
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
function goalKey() { return `akasha_goal_${state.user?.uid}_${state.currentWs?.id}_${todayISO()}`; }
function loadDailyGoal() {
  const val = localStorage.getItem(goalKey()) || "";
  $("dailyGoalInput").value = val;
  $("dailyGoalDisplay").innerHTML = val ? `Target aktif hari ini: <strong>${esc(val)}</strong>` : "Belum ada target tersimpan untuk hari ini.";
}

/* ══════════ EVENT WIRING ══════════ */
function wireEvents() {
  // Dashboard navigation
  $("dashboardNavBtn").onclick = () => switchDashPanel("home");
  $("myWorkspacesNavBtn").onclick = () => switchDashPanel("workspaces");
  $("notificationsNavBtn").onclick = () => switchDashPanel("notifications");
  $("notificationsNavBtnTop").onclick = () => switchDashPanel("notifications");
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => switchDashPanel(b.dataset.goto)));

  const openAccount = () => { $("accountName").value = state.user?.displayName || ""; $("accountPassword").value = ""; $("accountModal").classList.remove("hidden"); };
  $("accountBtn").onclick = openAccount;
  $("accountBtnTop").onclick = openAccount;

  $("accountForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("accountName").value.trim();
    const pass = $("accountPassword").value;
    try {
      if (name && name !== state.user.displayName) {
        await updateProfile(state.user, { displayName: name });
        await setDoc(doc(db, "users", state.user.uid), { name }, { merge: true });
        $("topbarUserName").textContent = name;
        $("topbarUserAvatar").textContent = initialOf(name);
      }
      if (pass) {
        if (pass.length < 6) return toast("Kata sandi minimal 6 karakter.", "bad");
        await updatePassword(state.user, pass);
      }
      $("accountModal").classList.add("hidden");
      toast("Profil diperbarui.", "ok");
    } catch (err) { toast(err.message, "bad"); }
  });

  // Dark mode
  const darkToggle = $("darkModeToggle");
  darkToggle.checked = localStorage.getItem("akasha_dark") === "1";
  document.documentElement.classList.toggle("dark", darkToggle.checked);
  darkToggle.addEventListener("change", () => {
    document.documentElement.classList.toggle("dark", darkToggle.checked);
    localStorage.setItem("akasha_dark", darkToggle.checked ? "1" : "0");
  });

  $("markAllReadBtn").addEventListener("click", async () => {
    const batch = writeBatch(db);
    state.notifications.filter((n) => !n.read).forEach((n) => batch.update(doc(db, "users", state.user.uid, "notifications", n.id), { read: true }));
    await batch.commit();
    toast("Semua notifikasi ditandai dibaca.", "ok");
  });

  // Create & join workspace
  $("createWorkspaceBtn").onclick = () => { $("newWorkspaceName").value = ""; $("newWorkspaceCode").value = Math.random().toString(36).substring(2, 8).toUpperCase(); $("newWorkspaceDrive").value = ""; $("createWorkspaceModal").classList.remove("hidden"); };
  $("joinWorkspaceBtn").onclick = () => { $("joinCodeInput").value = ""; $("joinWorkspaceModal").classList.remove("hidden"); };

  $("createWorkspaceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("newWorkspaceName").value.trim();
    const code = $("newWorkspaceCode").value.trim().toUpperCase();
    const driveLink = safeUrl($("newWorkspaceDrive").value);
    if (!name || code.length !== 6) return toast("Nama dan kode 6 karakter wajib diisi.", "bad");
    const btn = $("createWorkspaceSubmitBtn"); btn.disabled = true;
    try {
      const wsRef = await addDoc(collection(db, "workspaces"), {
        name, code, driveLink, ownerId: state.user.uid, memberIds: [state.user.uid], createdAt: serverTimestamp()
      });
      await setDoc(doc(db, "workspaces", wsRef.id, "members", state.user.uid), {
        name: state.user.displayName || "Mentor", email: state.user.email || "", role: "mentor", divisionId: "general", lastSeen: Date.now()
      });
      $("createWorkspaceModal").classList.add("hidden");
      toast("Ruang kerja dibuat.", "ok");
      openWorkspace(wsRef.id);
    } catch (err) { toast(err.message, "bad"); } finally { btn.disabled = false; }
  });

  $("joinWorkspaceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("joinCodeInput").value.trim().toUpperCase();
    if (code.length !== 6) return toast("Kode undangan harus 6 karakter.", "bad");
    const btn = $("joinWorkspaceSubmitBtn"); btn.disabled = true;
    try {
      const snap = await getDocs(query(collection(db, "workspaces"), where("code", "==", code), limit(1)));
      if (snap.empty) return toast("Kode ruang kerja tidak ditemukan.", "bad");
      const wsDoc = snap.docs[0];
      const data = wsDoc.data();
      if ((data.memberIds || []).length >= 20 && !(data.memberIds || []).includes(state.user.uid)) return toast("Ruang kerja sudah penuh (maks 20 anggota).", "bad");
      await updateDoc(wsDoc.ref, { memberIds: arrayUnion(state.user.uid) });
      await setDoc(doc(db, "workspaces", wsDoc.id, "members", state.user.uid), {
        name: state.user.displayName || "Anggota", email: state.user.email || "", role: "worker", divisionId: "general", lastSeen: Date.now()
      }, { merge: true });
      $("joinWorkspaceModal").classList.add("hidden");
      toast(`Bergabung ke ${data.name}.`, "ok");
      openWorkspace(wsDoc.id);
    } catch (err) { toast(err.message, "bad"); } finally { btn.disabled = false; }
  });

  // Workspace tabs & actions
  $("tabTaskView").onclick = () => switchWsTab("tasks");
  $("tabCalendarView").onclick = () => { switchWsTab("calendar"); renderCalendar(); };
  $("tabActivityView").onclick = () => switchWsTab("activity");
  $("tabAnnouncementView").onclick = () => switchWsTab("announcements");
  $("tabTeamView").onclick = () => switchWsTab("team");
  $("tabDivisionView").onclick = () => switchWsTab("divisions");
  $("backToDashboardBtn").onclick = leaveToDashboard;

  // Toggle Form Pembuat Tugas
  $("toggleCreatorBtn").addEventListener("click", () => {
    const form = $("createTaskForm");
    const hidden = form.classList.toggle("hidden");
    $("toggleCreatorBtn").textContent = hidden ? "Tampilkan Form" : "Sembunyikan Form";
  });

  // Board Mode Switcher (Kanban vs Table) & Quick Action Filter
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

  $("leaveWorkspaceBtn").addEventListener("click", async () => {
    if (!state.currentWs) return;
    if (state.currentWs.ownerId === state.user.uid) return toast("Mentor pemilik tidak bisa keluar. Hapus ruang kerja bila sudah selesai.", "bad");
    const ok = await appConfirm({ title: "Keluar dari ruang kerja?", message: `Anda akan keluar dari ${state.currentWs.name}.`, confirmText: "Keluar", danger: true });
    if (!ok) return;
    await updateDoc(doc(db, "workspaces", state.currentWs.id), { memberIds: arrayRemove(state.user.uid) });
    await deleteDoc(doc(db, "workspaces", state.currentWs.id, "members", state.user.uid)).catch(() => {});
    leaveToDashboard();
  });

  $("changeCodeBtn").addEventListener("click", async () => {
    const code = await appPrompt({
      title: "Ganti kode undangan",
      message: "Kode lama otomatis tidak berlaku.",
      label: "Kode baru (6 karakter)",
      initial: Math.random().toString(36).substring(2, 8).toUpperCase(),
      validate: (v) => (/^[A-Za-z0-9]{6}$/.test(v) ? null : "Gunakan tepat 6 huruf atau angka.")
    });
    if (!code) return;
    await updateDoc(doc(db, "workspaces", state.currentWs.id), { code: code.toUpperCase() });
    toast("Kode undangan diperbarui.", "ok");
  });

  $("deleteWorkspaceBtn").addEventListener("click", async () => {
    const ok = await appConfirm({ title: "Hapus ruang kerja?", message: `Seluruh tugas dan data di “${state.currentWs.name}” akan hilang permanen.`, confirmText: "Hapus permanen", danger: true });
    if (!ok) return;
    await deleteDoc(doc(db, "workspaces", state.currentWs.id));
    leaveToDashboard();
    toast("Ruang kerja dihapus.", "ok");
  });

  $("saveDailyGoalBtn").addEventListener("click", () => {
    localStorage.setItem(goalKey(), $("dailyGoalInput").value.trim());
    loadDailyGoal();
    toast("Target harian disimpan.", "ok");
  });

  $("taskDriveSource").addEventListener("change", () => {
    $("workspaceDriveGroup").classList.toggle("hidden", $("taskDriveSource").value === "individual");
  });
  $("saveDriveBtn").addEventListener("click", async () => {
    const link = safeUrl($("driveLinkInput").value);
    if ($("driveLinkInput").value.trim() && !link) return toast("Tautan Google Drive tidak valid.", "bad");
    await updateDoc(doc(db, "workspaces", state.currentWs.id), { driveLink: link });
    toast("Tautan Drive disimpan.", "ok");
  });

  // Create task
  $("createTaskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("taskTitle").value.trim();
    if (!title) return;
    const target = $("taskAssignee").value;
    const members = Object.values(state.members);
    let recipients = [];
    if (target === "all") recipients = members.filter((m) => m.id !== state.user.uid);
    else if (target.startsWith("div:")) {
      const divId = target.slice(4);
      recipients = members.filter((m) => (m.divisionId || "general") === divId && m.id !== state.user.uid);
    } else {
      const one = state.members[target];
      if (one) recipients = [one];
    }
    if (!recipients.length) return toast("Tidak ada anggota penerima pada pilihan tersebut.", "bad");

    const subtasks = $("taskSubtasks").value.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => ({ title: s, done: false }));
    const payloadBase = {
      title,
      difficulty: $("taskDifficulty").value,
      driveSource: $("taskDriveSource").value,
      driveLink: state.currentWs.driveLink || "",
      startDate: $("startDate").value || todayISO(),
      endDate: $("endDate").value || "",
      description: $("taskDesc").value.trim(),
      subtasks,
      attachments: [],
      status: "todo",
      createdBy: state.user.uid,
      createdAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    recipients.forEach((m) => {
      const ref = doc(collection(db, "workspaces", state.currentWs.id, "tasks"));
      batch.set(ref, { ...payloadBase, assigneeId: m.id, assigneeName: m.name, divisionId: m.divisionId || "general" });
    });
    await batch.commit();
    await logActivity(`Mentor membagikan tugas “${title}” ke ${recipients.length} anggota`);
    await Promise.all(recipients.map((m) => notifyUser(m.id, { text: `Tugas baru: “${title}” di ${state.currentWs.name}.`, wsId: state.currentWs.id, wsName: state.currentWs.name })));

    $("createTaskForm").reset();
    $("taskDriveSource").dispatchEvent(new Event("change"));
    toast(`Tugas dibagikan ke ${recipients.length} anggota.`, "ok");
  });

  // Filters
  ["taskSearch", "filterStatus", "filterDifficulty", "filterDivision", "filterAssignee", "sortTasks"].forEach((id) => {
    $(id).addEventListener("input", renderTasks);
    $(id).addEventListener("change", renderTasks);
  });

  // Subtask & attachment add inside detail modal
  $("addSubtaskBtn").addEventListener("click", async () => {
    const val = $("subtaskInput").value.trim();
    if (!val || !state.activeTaskId) return;
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", state.activeTaskId), { subtasks: arrayUnion({ title: val, done: false }) });
    $("subtaskInput").value = "";
  });

  $("addAttachBtn").addEventListener("click", async () => {
    const name = $("attachName").value.trim() || "Lampiran tautan";
    const url = safeUrl($("attachUrl").value);
    if (!url || !state.activeTaskId) return toast("Masukkan URL lampiran yang valid.", "bad");
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", state.activeTaskId), { attachments: arrayUnion({ name, url }) });
    $("attachName").value = ""; $("attachUrl").value = "";
  });

  // Task Real-Time Discussion Submit
  $("taskCommentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("taskCommentInput");
    const text = inp.value.trim();
    if (!text || !state.activeTaskId || !state.currentWs) return;
    inp.value = "";
    const t = state.tasks.find((x) => x.id === state.activeTaskId);
    await addDoc(collection(db, "workspaces", state.currentWs.id, "tasks", state.activeTaskId, "comments"), {
      text,
      authorId: state.user.uid,
      authorName: state.user.displayName || "Anggota",
      createdAt: serverTimestamp()
    });
    if (t) {
      const targetUid = isMentor() ? t.assigneeId : state.currentWs.ownerId;
      await notifyUser(targetUid, {
        text: `${state.user.displayName} berkomentar di tugas “${t.title}”: "${text.slice(0, 50)}"`,
        wsId: state.currentWs.id,
        wsName: state.currentWs.name,
        taskId: t.id
      });
    }
  });

  // Edit task & announcement modals
  $("editTaskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("editTaskId").value;
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "tasks", id), {
      title: $("editTaskTitleInput").value.trim(),
      description: $("editTaskDescInput").value.trim()
    });
    $("editTaskModal").classList.add("hidden");
    toast("Tugas diperbarui.", "ok");
  });

  $("announceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("announceTitle").value.trim();
    const body = $("announceBody").value.trim();
    if (!title || !body) return;
    await addDoc(collection(db, "workspaces", state.currentWs.id, "announcements"), {
      title, body, pinned: $("announcePinned").checked, authorName: state.user.displayName || "Mentor", createdAt: serverTimestamp()
    });
    await logActivity(`Mentor memposting pengumuman “${title}”`);
    $("announceForm").reset();
    toast("Pengumuman dikirim.", "ok");
  });

  $("editAnnounceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "announcements", $("editAnnounceId").value), {
      title: $("editAnnounceTitle").value.trim(),
      body: $("editAnnounceBody").value.trim()
    });
    $("editAnnounceModal").classList.add("hidden");
    toast("Pengumuman diperbarui.", "ok");
  });

  // Divisions & member settings
  $("createDivisionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("newDivisionName").value.trim();
    if (!name) return;
    await addDoc(collection(db, "workspaces", state.currentWs.id, "divisions"), { name, description: $("newDivisionDesc").value.trim() });
    $("createDivisionForm").reset();
    toast("Divisi dibuat.", "ok");
  });

  $("editMemberForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const mid = $("editMemberId").value;
    await updateDoc(doc(db, "workspaces", state.currentWs.id, "members", mid), {
      role: $("editMemberRole").value,
      divisionId: $("editMemberDivision").value
    });
    $("editMemberModal").classList.add("hidden");
    toast("Pengaturan anggota disimpan.", "ok");
  });

  // Calendar nav
  $("calPrev").onclick = () => { state.calDate.setMonth(state.calDate.getMonth() - 1); renderCalendar(); };
  $("calNext").onclick = () => { state.calDate.setMonth(state.calDate.getMonth() + 1); renderCalendar(); };
  $("calToday").onclick = () => { state.calDate = new Date(); renderCalendar(); };

  // Modal close buttons & backdrop click
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.close;
    if (id === "taskDetailModal" && state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; state.activeTaskId = null; }
    $(id).classList.add("hidden");
  }));
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
    if (e.target === m && m.id !== "appDialog") {
      if (m.id === "taskDetailModal" && state.commentUnsub) { state.commentUnsub(); state.commentUnsub = null; state.activeTaskId = null; }
      m.classList.add("hidden");
    }
  }));
}

/* ══════════ BOOT ══════════ */
document.querySelectorAll("select[data-enhance]").forEach(enhanceSelect);
initAuthUI();
wireEvents();

onAuthStateChanged(auth, (user) => {
  state.user = user;
  if (user) {
    $("authView").classList.add("hidden");
    $("dashboardView").classList.remove("hidden");
    const name = user.displayName || user.email?.split("@")[0] || "Pengguna";
    $("topbarUserName").textContent = name;
    $("topbarUserAvatar").textContent = initialOf(name);
    subscribeDashboard();
  } else {
    $("dashboardView").classList.add("hidden");
    $("workspaceView").classList.add("hidden");
    $("authView").classList.remove("hidden");
  }
});
