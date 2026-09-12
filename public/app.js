/**
 * MSA Control de Asistencia - Evento Línea Premium
 * Frontend Logic & State Management
 */

const FORM_REGISTRATION_URL = "https://forms.gle/ZMx54sLXi2kvEavt9";
const LOCAL_STORAGE_KEY = "msa_guests_attendance_data";

// Application State
let state = {
  guests: [],
  stats: {
    totalGuests: 0,
    checkedInCount: 0,
    pendingCount: 0,
    totalCompanionsExpected: 0,
    companionsEntered: 0,
    totalPeopleEntered: 0,
    attendanceRate: 0
  },
  searchQuery: "",
  currentFilter: "all", // 'all' | 'pending' | 'checkedIn'
  qrGenerated: false
};

// DOM Elements
const searchInput = document.getElementById("searchInput");
const btnClearSearch = document.getElementById("btnClearSearch");
const searchResultCount = document.getElementById("searchResultCount");
const guestListContainer = document.getElementById("guestListContainer");
const noResultsState = document.getElementById("noResultsState");
const noResultsQuery = document.getElementById("noResultsQuery");
const loadingState = document.getElementById("loadingState");
const filterTabs = document.querySelectorAll(".filter-tab");
const syncBadge = document.getElementById("syncBadge");

// KPI elements
const kpiTotalGuests = document.getElementById("kpiTotalGuests");
const kpiCheckedIn = document.getElementById("kpiCheckedIn");
const kpiPending = document.getElementById("kpiPending");
const kpiTotalCompanionsExpected = document.getElementById("kpiTotalCompanionsExpected");
const kpiCompanionsEntered = document.getElementById("kpiCompanionsEntered");
const kpiTotalPeopleEntered = document.getElementById("kpiTotalPeopleEntered");
const kpiProgressBar = document.getElementById("kpiProgressBar");
const kpiRate = document.getElementById("kpiRate");
const countFilterAll = document.getElementById("countFilterAll");
const countFilterPending = document.getElementById("countFilterPending");
const countFilterCheckedIn = document.getElementById("countFilterCheckedIn");

const newGuestModal = document.getElementById("newGuestModal");
const btnOpenNewGuestModal = document.getElementById("btnOpenNewGuestModal");
const btnOpenNewGuestFromBanner = document.getElementById("btnOpenNewGuestFromBanner");
const btnCloseNewGuestModal = document.getElementById("btnCloseNewGuestModal");
const btnCancelNewGuest = document.getElementById("btnCancelNewGuest");
const btnQuickAddFromSearch = document.getElementById("btnQuickAddFromSearch");
const newGuestForm = document.getElementById("newGuestForm");

const btnExport = document.getElementById("btnExport");
const btnReload = document.getElementById("btnReload");

/**
 * Utility: Normalize string for search (removes accents, spaces, lowers case)
 */
function normalizeStr(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Utility: Extract digits only
 */
function getDigits(str) {
  if (!str) return "";
  return str.toString().replace(/\D/g, "");
}

/**
 * Recalculate KPI statistics based on current state.guests
 */
function calculateStats() {
  const totalGuests = state.guests.length;
  const checkedInCount = state.guests.filter(g => g.checkedIn).length;
  const pendingCount = totalGuests - checkedInCount;
  const totalCompanionsExpected = state.guests.reduce((acc, g) => acc + (parseInt(g.companions, 10) || 0), 0);
  const companionsEntered = state.guests.reduce((acc, g) => acc + (g.checkedIn ? (parseInt(g.companionsEntered, 10) || 0) : 0), 0);
  const totalPeopleEntered = checkedInCount + companionsEntered;
  const attendanceRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  state.stats = {
    totalGuests,
    checkedInCount,
    pendingCount,
    totalCompanionsExpected,
    companionsEntered,
    totalPeopleEntered,
    attendanceRate
  };

  updateKpiUI();
}

/**
 * Update UI for KPI counters
 */
function updateKpiUI() {
  kpiTotalGuests.textContent = state.stats.totalGuests;
  kpiCheckedIn.textContent = state.stats.checkedInCount;
  kpiPending.textContent = state.stats.pendingCount;
  kpiTotalCompanionsExpected.textContent = state.stats.totalCompanionsExpected;
  kpiCompanionsEntered.textContent = state.stats.companionsEntered;
  kpiTotalPeopleEntered.textContent = state.stats.totalPeopleEntered;
  kpiRate.textContent = `${state.stats.attendanceRate}%`;
  kpiProgressBar.style.width = `${state.stats.attendanceRate}%`;

  countFilterAll.textContent = state.stats.totalGuests;
  countFilterPending.textContent = state.stats.pendingCount;
  countFilterCheckedIn.textContent = state.stats.checkedInCount;
}

/**
 * Save data to LocalStorage for offline and multi-device persistence
 */
function saveToLocalStorage() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.guests));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }
}

/**
 * Load initial data from API or localStorage fallback
 */
async function loadData() {
  loadingState.classList.remove("hidden");
  guestListContainer.innerHTML = "";
  noResultsState.classList.add("hidden");

  try {
    const res = await fetch("/api/guests");
    if (res.ok) {
      const data = await res.json();
      if (data.guests && data.guests.length > 0) {
        // Merge with local storage check-in timestamps if available
        const localData = getLocalStorageData();
        if (localData && localData.length > 0) {
          const localMap = new Map(localData.map(g => [g.id, g]));
          state.guests = data.guests.map(g => {
            const localG = localMap.get(g.id);
            if (localG && localG.checkedIn) {
              return { ...g, checkedIn: true, checkInTime: localG.checkInTime, companionsEntered: localG.companionsEntered ?? g.companions };
            }
            return g;
          });
          // Also append any walk-ins created locally
          const walkIns = localData.filter(g => g.isWalkIn && !state.guests.some(sg => sg.id === g.id));
          state.guests = [...walkIns, ...state.guests];
        } else {
          state.guests = data.guests;
        }

        saveToLocalStorage();
        setOnlineStatus(true);
      }
    } else {
      throw new Error("API not responding with OK");
    }
  } catch (err) {
    console.warn("Using offline / localStorage data:", err);
    const localData = getLocalStorageData();
    if (localData && localData.length > 0) {
      state.guests = localData;
      setOnlineStatus(false);
      showToast("Modo sin conexión: cargando datos locales", "info");
    } else {
      showToast("Error al cargar la lista de invitados", "error");
    }
  } finally {
    loadingState.classList.add("hidden");
    calculateStats();
    renderGuestList();
    if (window.lucide) lucide.createIcons();
  }
}

function getLocalStorageData() {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
}

function setOnlineStatus(isOnline) {
  if (isOnline) {
    syncBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> En Línea`;
    syncBadge.className = "inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium";
  } else {
    syncBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Local`;
    syncBadge.className = "inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium";
  }
}

/**
 * Filter and Search logic
 */
function getFilteredGuests() {
  const query = normalizeStr(state.searchQuery);
  const queryDigits = getDigits(state.searchQuery);

  return state.guests.filter(guest => {
    // Filter by Tab
    if (state.currentFilter === "pending" && guest.checkedIn) return false;
    if (state.currentFilter === "checkedIn" && !guest.checkedIn) return false;

    // Search matching: By Name OR Phone Number
    if (!query) return true;

    const nameMatch = normalizeStr(guest.name).includes(query);
    const responsibleMatch = normalizeStr(guest.responsible).includes(query);
    const emailMatch = normalizeStr(guest.email).includes(query);
    
    // Phone matching (check normalized string and digits)
    const guestDigits = guest.phoneDigits || getDigits(guest.phone);
    const phoneMatch = (guest.phone && normalizeStr(guest.phone).includes(query)) ||
                       (queryDigits.length > 0 && guestDigits.includes(queryDigits));

    return nameMatch || phoneMatch || responsibleMatch || emailMatch;
  });
}

/**
 * Render guest list cards
 */
function renderGuestList() {
  const filtered = getFilteredGuests();
  searchResultCount.textContent = `${filtered.length}`;

  if (state.searchQuery.trim().length > 0) {
    btnClearSearch.classList.remove("hidden");
  } else {
    btnClearSearch.classList.add("hidden");
  }

  if (filtered.length === 0) {
    guestListContainer.innerHTML = "";
    noResultsQuery.textContent = state.searchQuery || "el filtro seleccionado";
    noResultsState.classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
    return;
  }

  noResultsState.classList.add("hidden");

  const html = filtered.map(guest => {
    const isCheckedIn = guest.checkedIn;
    const timeFormatted = guest.checkInTime ? formatTime(guest.checkInTime) : "";
    const totalCompanions = parseInt(guest.companions, 10) || 0;
    const compsEntered = guest.companionsEntered !== undefined ? parseInt(guest.companionsEntered, 10) : totalCompanions;

    return `
      <div class="guest-card bg-white border-2 ${isCheckedIn ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200/90'} rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden" data-id="${guest.id}">
        
        <!-- Top row: ID, Status Badge & Responsible -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-md ${guest.isWalkIn ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'} font-mono">
              ${guest.id}
            </span>
            ${guest.responsible ? `
              <span class="text-[11px] font-semibold text-slate-500 truncate max-w-[140px] sm:max-w-xs flex items-center gap-1">
                <i data-lucide="tag" class="w-3 h-3 text-brand-red flex-shrink-0"></i>
                ${escapeHtml(guest.responsible)}
              </span>
            ` : ''}
          </div>

          <!-- Status indicator badge -->
          <div>
            ${isCheckedIn ? `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
                Ingresó ${timeFormatted ? `· ${timeFormatted}` : ''}
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-brand-red border border-rose-200">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                Pendiente
              </span>
            `}
          </div>
        </div>

        <!-- Middle row: Guest Name & Contact Info -->
        <div class="space-y-1.5 mb-3.5">
          <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
            ${escapeHtml(guest.name)}
          </h3>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            ${guest.phone ? `
              <a href="tel:${guest.phone}" class="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-brand-red transition">
                <i data-lucide="phone" class="w-3.5 h-3.5 text-brand-red"></i>
                <span>${escapeHtml(guest.phone)}</span>
              </a>
            ` : `
              <span class="inline-flex items-center gap-1.5 text-slate-400 italic">
                <i data-lucide="phone-off" class="w-3.5 h-3.5"></i>
                Sin teléfono
              </span>
            `}

            ${guest.email ? `
              <span class="inline-flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
                <i data-lucide="mail" class="w-3.5 h-3.5 text-slate-400"></i>
                ${escapeHtml(guest.email)}
              </span>
            ` : ''}

            ${guest.address ? `
              <span class="inline-flex items-center gap-1.5 text-slate-500 truncate max-w-[240px]">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                ${escapeHtml(guest.address)}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Bottom Action Row: Companion Stepper & Check-In Action Button -->
        <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <!-- Companions details & stepper -->
          <div class="flex items-center justify-between sm:justify-start gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div class="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
              <i data-lucide="users" class="w-4 h-4 text-brand-red"></i>
              <span>Acompañantes:</span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                class="btn-decrement-comp w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 flex items-center justify-center transition active:scale-90 shadow-2xs"
                data-id="${guest.id}"
                title="Disminuir acompañante"
              >
                <i data-lucide="minus" class="w-3.5 h-3.5"></i>
              </button>

              <span class="font-bold text-sm text-slate-900 px-1.5 min-w-[20px] text-center" id="comp-count-${guest.id}">
                ${compsEntered}
              </span>

              <button 
                class="btn-increment-comp w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 flex items-center justify-center transition active:scale-90 shadow-2xs"
                data-id="${guest.id}"
                title="Aumentar acompañante"
              >
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Main Check-in Toggle Button -->
          <div class="flex items-center gap-2">
            ${isCheckedIn ? `
              <button 
                class="btn-toggle-checkin w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-xs font-bold transition active:scale-95 shadow-xs"
                data-id="${guest.id}"
                data-status="checkedIn"
              >
                <i data-lucide="rotate-ccw" class="w-4 h-4 text-slate-500"></i>
                <span>Deshacer Ingreso</span>
              </button>
            ` : `
              <button 
                class="btn-toggle-checkin w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-redHover text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-red/25 transition active:scale-95"
                data-id="${guest.id}"
                data-status="pending"
              >
                <i data-lucide="check" class="w-4 h-4"></i>
                <span>Permitir Ingreso</span>
              </button>
            `}
          </div>

        </div>

      </div>
    `;
  }).join("");

  guestListContainer.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

/**
 * Format timestamp to 12-hour format e.g. 10:45 AM
 */
function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch (e) {
    return "";
  }
}

/**
 * HTML Escaper helper
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Handle check-in toggle
 */
async function toggleCheckIn(guestId) {
  const guest = state.guests.find(g => g.id === guestId);
  if (!guest) return;

  const newStatus = !guest.checkedIn;
  guest.checkedIn = newStatus;
  guest.checkInTime = newStatus ? new Date().toISOString() : null;
  if (newStatus && (guest.companionsEntered === undefined || guest.companionsEntered === 0)) {
    guest.companionsEntered = guest.companions || 0;
  }

  saveToLocalStorage();
  calculateStats();
  renderGuestList();

  if (newStatus) {
    triggerConfetti();
    showToast(`Ingreso registrado: ${guest.name}`, "success");
  } else {
    showToast(`Ingreso cancelado: ${guest.name}`, "info");
  }

  // Sync with API backend in background
  try {
    const res = await fetch("/api/guests/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: guest.id,
        checkedIn: guest.checkedIn,
        companionsEntered: guest.companionsEntered
      })
    });
    if (res.ok) {
      setOnlineStatus(true);
    }
  } catch (err) {
    console.warn("Backend sync failed, saved locally", err);
    setOnlineStatus(false);
  }
}

/**
 * Increment / Decrement companion count for a guest
 */
async function adjustCompanion(guestId, delta) {
  const guest = state.guests.find(g => g.id === guestId);
  if (!guest) return;

  const current = guest.companionsEntered !== undefined ? guest.companionsEntered : (guest.companions || 0);
  const updated = Math.max(0, current + delta);
  guest.companionsEntered = updated;

  saveToLocalStorage();
  calculateStats();

  const countElem = document.getElementById(`comp-count-${guestId}`);
  if (countElem) {
    countElem.textContent = updated;
  }

  // Update in backend
  try {
    await fetch("/api/guests/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: guest.id,
        checkedIn: guest.checkedIn,
        companionsEntered: updated
      })
    });
  } catch (e) {
    // Saved locally
  }
}

/**
 * Handle new guest form submission
 */
async function handleNewGuestSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("formGuestName").value.trim();
  const phone = document.getElementById("formGuestPhone").value.trim();
  const companions = parseInt(document.getElementById("formGuestCompanions").value, 10) || 0;
  const responsible = document.getElementById("formGuestResponsible").value.trim();
  const checkInNow = document.getElementById("formCheckInNow").checked;

  if (!name) {
    showToast("Por favor ingresa el nombre del invitado", "error");
    return;
  }

  const phoneDigits = getDigits(phone);
  const newGuest = {
    id: `MSA-REG-${Date.now().toString().slice(-4)}`,
    name,
    phone,
    phoneDigits,
    email: "",
    address: "",
    responsible: responsible || "Registro en Puerta",
    companions,
    checkedIn: checkInNow,
    checkInTime: checkInNow ? new Date().toISOString() : null,
    companionsEntered: checkInNow ? companions : 0,
    notes: "Registrado en evento",
    isWalkIn: true
  };

  state.guests.unshift(newGuest);
  saveToLocalStorage();
  calculateStats();
  renderGuestList();

  closeNewGuestModal();
  newGuestForm.reset();
  document.getElementById("formCheckInNow").checked = true;

  if (checkInNow) {
    triggerConfetti();
    showToast(`Invitado registrado e ingresado: ${name}`, "success");
  } else {
    showToast(`Invitado registrado con éxito: ${name}`, "success");
  }

  // Sync with API
  try {
    await fetch("/api/guests/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGuest)
    });
  } catch (err) {
    console.warn("Guest saved locally", err);
  }
}

/**
 * Confetti celebration effect
 */
function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#E50914', '#ffffff', '#B80710']
    });
  }
}

/**
 * Toast notifications without emojis (Uses pure Lucide SVGs)
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");

  let iconName = "info";
  let borderClass = "border-slate-300";
  let bgClass = "bg-white";
  let textClass = "text-slate-700";

  if (type === "success") {
    iconName = "check-circle-2";
    borderClass = "border-emerald-300";
    textClass = "text-emerald-600";
  } else if (type === "error") {
    iconName = "alert-circle";
    borderClass = "border-brand-red/40";
    textClass = "text-brand-red";
  }

  toast.className = `flex items-center gap-2.5 p-3.5 rounded-2xl ${bgClass} ${borderClass} border-2 shadow-xl animate-fadeIn pointer-events-auto transition-all duration-300`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0 ${textClass}"></i>
    <span class="text-xs sm:text-sm font-bold text-slate-900 flex-1">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Generate QR code for Google Form Registration
 */
function openNewGuestModal(prefillName = "") {
  newGuestModal.classList.remove("hidden");
  if (prefillName) {
    document.getElementById("formGuestName").value = prefillName;
  }
  setTimeout(() => document.getElementById("formGuestName").focus(), 100);
}

function closeNewGuestModal() {
  newGuestModal.classList.add("hidden");
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  // Search input with debounce
  searchInput.addEventListener("input", e => {
    state.searchQuery = e.target.value;
    renderGuestList();
  });

  btnClearSearch.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    renderGuestList();
    searchInput.focus();
  });

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => {
        t.classList.remove("active-filter", "text-white");
        t.classList.add("text-brand-gray");
      });
      tab.classList.add("active-filter", "text-white");
      tab.classList.remove("text-brand-gray");

      state.currentFilter = tab.dataset.filter;
      renderGuestList();
    });
  });

  // Guest list clicks (Delegation for Checkin and Companions)
  guestListContainer.addEventListener("click", e => {
    const toggleBtn = e.target.closest(".btn-toggle-checkin");
    if (toggleBtn) {
      const guestId = toggleBtn.dataset.id;
      toggleCheckIn(guestId);
      return;
    }

    const plusBtn = e.target.closest(".btn-increment-comp");
    if (plusBtn) {
      const guestId = plusBtn.dataset.id;
      adjustCompanion(guestId, 1);
      return;
    }

    const minusBtn = e.target.closest(".btn-decrement-comp");
    if (minusBtn) {
      const guestId = minusBtn.dataset.id;
      adjustCompanion(guestId, -1);
      return;
    }
  });

  // Modals interactions
  if (btnOpenNewGuestModal) {
    btnOpenNewGuestModal.addEventListener("click", () => openNewGuestModal());
  }
  if (btnOpenNewGuestFromBanner) {
    btnOpenNewGuestFromBanner.addEventListener("click", () => openNewGuestModal());
  }
  if (btnCloseNewGuestModal) {
    btnCloseNewGuestModal.addEventListener("click", closeNewGuestModal);
  }
  if (btnCancelNewGuest) {
    btnCancelNewGuest.addEventListener("click", closeNewGuestModal);
  }
  if (newGuestModal) {
    newGuestModal.addEventListener("click", e => {
      if (e.target === newGuestModal) closeNewGuestModal();
    });
  }

  btnQuickAddFromSearch.addEventListener("click", () => {
    openNewGuestModal(state.searchQuery);
  });

  newGuestForm.addEventListener("submit", handleNewGuestSubmit);

  // Reload button
  btnReload.addEventListener("click", () => {
    showToast("Actualizando datos...", "info");
    loadData();
  });

  // Export Excel
  btnExport.addEventListener("click", () => {
    showToast("Generando reporte Excel...", "info");
    window.location.href = "/api/guests/export";
  });
}

// Initialize Application on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadData();
});
