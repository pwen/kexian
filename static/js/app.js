// ---------------------------------------------------------------------------
// Climbing Tracker – Frontend
// ---------------------------------------------------------------------------

const API = "";
let currentFilter = "";

// ---- DOM refs ----
const routesList     = document.getElementById("routes-list");
const routeModal     = document.getElementById("route-modal");
const attemptModal   = document.getElementById("attempt-modal");
const routeForm      = document.getElementById("route-form");
const attemptForm    = document.getElementById("attempt-form");

// ---- Helpers ----
async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 204) return null;
  return res.json();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Load & Render Routes ----
async function loadRoutes() {
  const qs = currentFilter ? `?status=${currentFilter}` : "";
  const routes = await api(`/api/routes${qs}`);
  if (!routes.length) {
    routesList.innerHTML = `<div class="empty-state"><p>No routes yet — add your first project!</p></div>`;
    return;
  }
  routesList.innerHTML = routes.map(routeCard).join("");

  // Attach expand listeners
  routesList.querySelectorAll(".toggle-attempts").forEach((btn) => {
    btn.addEventListener("click", () => toggleAttempts(btn.dataset.id));
  });
}

function routeCard(r) {
  return `
    <div class="route-card" id="route-${r.id}">
      <div class="route-header">
        <span class="route-title">${esc(r.name)}</span>
        <span class="route-grade">${esc(r.grade)}</span>
      </div>
      <div class="route-meta">
        <span class="status-badge ${r.status}">${r.status}</span>
        ${r.location ? `<span>📍 ${esc(r.location)}</span>` : ""}
        <span>${r.style}</span>
        ${r.sent_at ? `<span>✅ Sent ${r.sent_at}</span>` : ""}
      </div>
      ${r.notes ? `<div class="route-notes">${esc(r.notes)}</div>` : ""}
      <div class="route-actions">
        <button class="btn-small toggle-attempts" data-id="${r.id}">Attempts ▾</button>
        <button class="btn-small" onclick="openAttemptModal(${r.id})">+ Attempt</button>
        <button class="btn-small" onclick="editRoute(${r.id})">Edit</button>
        <button class="btn-small danger" onclick="deleteRoute(${r.id})">Delete</button>
      </div>
      <div class="attempts-section hidden" id="attempts-${r.id}"></div>
    </div>`;
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ---- Attempts Toggle ----
async function toggleAttempts(routeId) {
  const section = document.getElementById(`attempts-${routeId}`);
  if (!section.classList.contains("hidden")) {
    section.classList.add("hidden");
    return;
  }
  const attempts = await api(`/api/routes/${routeId}/attempts`);
  if (!attempts.length) {
    section.innerHTML = `<h3>Attempts</h3><p style="font-size:0.8rem;color:var(--muted)">No attempts logged yet.</p>`;
  } else {
    section.innerHTML = `<h3>Attempts (${attempts.length})</h3>` + attempts.map(a => `
      <div class="attempt-item">
        <span>${a.date} — <span class="attempt-result ${a.result}">${a.result}</span></span>
        <span>${a.notes ? esc(a.notes) : ""}</span>
        <button class="btn-small danger" onclick="deleteAttempt(${a.id}, ${routeId})">✕</button>
      </div>`).join("");
  }
  section.classList.remove("hidden");
}

// ---- Filter Buttons ----
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.status;
    loadRoutes();
  });
});

// ---- Route Modal ----
document.getElementById("add-route-btn").addEventListener("click", () => {
  document.getElementById("modal-title").textContent = "Add Route";
  routeForm.reset();
  document.getElementById("route-id").value = "";
  routeModal.classList.remove("hidden");
});

document.getElementById("cancel-route").addEventListener("click", () => {
  routeModal.classList.add("hidden");
});

routeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("route-id").value;
  const body = {
    name:     document.getElementById("route-name").value,
    grade:    document.getElementById("route-grade").value,
    location: document.getElementById("route-location").value,
    style:    document.getElementById("route-style").value,
    status:   document.getElementById("route-status").value,
    notes:    document.getElementById("route-notes").value,
  };
  if (id) {
    await api(`/api/routes/${id}`, { method: "PUT", body: JSON.stringify(body) });
  } else {
    await api("/api/routes", { method: "POST", body: JSON.stringify(body) });
  }
  routeModal.classList.add("hidden");
  loadRoutes();
});

async function editRoute(id) {
  const route = (await api("/api/routes")).find(r => r.id === id);
  if (!route) return;
  document.getElementById("modal-title").textContent = "Edit Route";
  document.getElementById("route-id").value       = route.id;
  document.getElementById("route-name").value      = route.name;
  document.getElementById("route-grade").value     = route.grade;
  document.getElementById("route-location").value  = route.location || "";
  document.getElementById("route-style").value     = route.style;
  document.getElementById("route-status").value    = route.status;
  document.getElementById("route-notes").value     = route.notes || "";
  routeModal.classList.remove("hidden");
}

async function deleteRoute(id) {
  if (!confirm("Delete this route and all its attempts?")) return;
  await api(`/api/routes/${id}`, { method: "DELETE" });
  loadRoutes();
}

// ---- Attempt Modal ----
function openAttemptModal(routeId) {
  attemptForm.reset();
  document.getElementById("attempt-route-id").value = routeId;
  document.getElementById("attempt-date").value = today();
  attemptModal.classList.remove("hidden");
}

document.getElementById("cancel-attempt").addEventListener("click", () => {
  attemptModal.classList.add("hidden");
});

attemptForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const routeId = document.getElementById("attempt-route-id").value;
  const body = {
    date:   document.getElementById("attempt-date").value,
    result: document.getElementById("attempt-result").value,
    notes:  document.getElementById("attempt-notes").value,
  };
  await api(`/api/routes/${routeId}/attempts`, { method: "POST", body: JSON.stringify(body) });
  attemptModal.classList.add("hidden");
  loadRoutes();
});

async function deleteAttempt(attemptId, routeId) {
  await api(`/api/attempts/${attemptId}`, { method: "DELETE" });
  toggleAttempts(routeId);  // refresh
}

// ---- Init ----
loadRoutes();
