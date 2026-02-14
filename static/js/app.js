// ---------------------------------------------------------------------------
// Climbing Tracker – Frontend
// ---------------------------------------------------------------------------

const API = "";
let currentFilter = "";
let locations = [];

const STATUS_LABELS = { 0: "To Try", 1: "Projecting", 2: "On Hold", 3: "Sent" };
const STATUS_CLASSES = { 0: "to-try", 1: "projecting", 2: "on-hold", 3: "sent" };
const TYPE_LABELS = { 0: "Sport", 1: "Boulder", 2: "Trad" };

// ---- DOM refs ----
const projectsList = document.getElementById("projects-list");
const projectModal = document.getElementById("project-modal");
const sessionModal = document.getElementById("session-modal");
const projectForm = document.getElementById("project-form");
const sessionForm = document.getElementById("session-form");

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

function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

// ---- Load Locations ----
async function loadLocations() {
    locations = await api("/api/locations");
    populateLocationSelect();
}

function populateLocationSelect() {
    const select = document.getElementById("project-location");
    select.innerHTML = `<option value="">— None —</option>` +
        locations.map(l => `<option value="${l.id}">${esc(l.crag || l.area)}</option>`).join("");
}

// ---- Location Modal (cascading country → state) ----
const locationModal = document.getElementById("location-modal");
const locationForm = document.getElementById("location-form");
const locCountry = document.getElementById("loc-country");
const locState = document.getElementById("loc-state");

document.getElementById("new-location-btn").addEventListener("click", async () => {
    locationForm.reset();
    locState.innerHTML = `<option value="">— None —</option>`;
    // Load countries if not yet loaded
    if (locCountry.options.length <= 1) {
        const countries = await api("/api/countries");
        locCountry.innerHTML = `<option value="">Select country…</option>` +
            countries.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join("");
    }
    locationModal.classList.remove("hidden");
});

locCountry.addEventListener("change", async () => {
    const code = locCountry.value;
    locState.innerHTML = `<option value="">— None —</option>`;
    if (!code) return;
    const subs = await api(`/api/countries/${code}/subdivisions`);
    if (subs.length) {
        locState.innerHTML = `<option value="">— None —</option>` +
            subs.map(s => `<option value="${s.code}">${esc(s.name)}</option>`).join("");
    }
});

document.getElementById("cancel-location").addEventListener("click", () => {
    locationModal.classList.add("hidden");
});

locationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
        country_code: locCountry.value,
        state_code: locState.value || "",
        area: document.getElementById("loc-area").value,
        crag: document.getElementById("loc-crag").value || "",
    };
    const loc = await api("/api/locations", { method: "POST", body: JSON.stringify(body) });
    locations.push(loc);
    populateLocationSelect();
    document.getElementById("project-location").value = loc.id;
    locationModal.classList.add("hidden");
});

// ---- Load & Render Projects ----
async function loadProjects() {
    const qs = currentFilter !== "" ? `?status=${currentFilter}` : "";
    const projects = await api(`/api/projects${qs}`);
    if (!projects.length) {
        projectsList.innerHTML = `<div class="empty-state"><p>No projects yet — add your first one!</p></div>`;
        return;
    }
    projectsList.innerHTML = projects.map(projectCard).join("");

    // Attach expand listeners
    projectsList.querySelectorAll(".toggle-sessions").forEach((btn) => {
        btn.addEventListener("click", () => toggleSessions(btn.dataset.id));
    });
}

function projectCard(p) {
    const locName = p.location ? esc([p.location.crag, p.location.area].filter(Boolean).join(", ")) : "";
    const pitchInfo = p.pitches && p.type !== 1 ? `${p.pitches}p` : "";
    const lengthInfo = p.length ? esc(p.length) : "";
    const meta = [pitchInfo, lengthInfo].filter(Boolean).join(" · ");

    return `
    <div class="route-card" id="project-${p.id}">
      <div class="route-header">
        <span class="route-title">${esc(p.name)}</span>
        <span class="route-grade">${esc(p.grade)}</span>
      </div>
      <div class="route-meta">
        <span class="status-badge ${STATUS_CLASSES[p.status]}">${STATUS_LABELS[p.status]}</span>
        <span class="type-badge">${TYPE_LABELS[p.type]}</span>
        ${locName ? `<span>📍 ${locName}</span>` : ""}
        ${meta ? `<span>${meta}</span>` : ""}
      </div>
      ${p.notes ? `<div class="route-notes">${esc(p.notes)}</div>` : ""}
      <div class="route-actions">
        <button class="btn-small toggle-sessions" data-id="${p.id}">Sessions ▾</button>
        <button class="btn-small accent" onclick="openSessionModal(${p.id})">+ Session</button>
        <button class="btn-small" onclick="editProject(${p.id})">Edit</button>
        <button class="btn-small danger" onclick="deleteProject(${p.id})">Delete</button>
      </div>
      <div class="attempts-section hidden" id="sessions-${p.id}"></div>
    </div>`;
}

// ---- Sessions Toggle ----
async function toggleSessions(projectId) {
    const section = document.getElementById(`sessions-${projectId}`);
    if (!section.classList.contains("hidden")) {
        section.classList.add("hidden");
        return;
    }
    const sessions = await api(`/api/projects/${projectId}/sessions`);
    if (!sessions.length) {
        section.innerHTML = `<h3>Sessions</h3><p style="font-size:0.8rem;color:var(--muted)">No sessions logged yet.</p>`;
    } else {
        section.innerHTML = `<h3>Sessions (${sessions.length})</h3>` + sessions.map(s => `
      <div class="attempt-item">
        <span>${s.date}</span>
        <span>${s.notes ? esc(s.notes) : ""}</span>
        <button class="btn-small" onclick="editSession(${s.id}, ${projectId})">Edit</button>
        <button class="btn-small danger" onclick="deleteSession(${s.id}, ${projectId})">✕</button>
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
        loadProjects();
    });
});

// ---- Type-dependent field toggles ----
const typeSelect = document.getElementById("project-type");
const pitchesGroup = document.getElementById("pitches-group");
const gradeRope = document.getElementById("project-grade-rope");
const gradeBoulder = document.getElementById("project-grade-boulder");

function toggleTypeFields() {
    const isBoulder = typeSelect.value === "1";
    pitchesGroup.style.display = isBoulder ? "none" : "";
    if (isBoulder) document.getElementById("project-pitches").value = "";
    gradeRope.classList.toggle("hidden", isBoulder);
    gradeBoulder.classList.toggle("hidden", !isBoulder);
}

function getGradeValue() {
    return typeSelect.value === "1" ? gradeBoulder.value : gradeRope.value;
}

function setGradeValue(grade) {
    if (gradeBoulder.querySelector(`option[value="${grade}"]`)) {
        gradeBoulder.value = grade;
    }
    if (gradeRope.querySelector(`option[value="${grade}"]`)) {
        gradeRope.value = grade;
    }
}

typeSelect.addEventListener("change", toggleTypeFields);

// ---- Project Modal ----
document.getElementById("add-project-btn").addEventListener("click", () => {
    document.getElementById("modal-title").textContent = "Add Project";
    projectForm.reset();
    document.getElementById("project-id").value = "";
    document.getElementById("project-type").value = "1";
    document.getElementById("project-status").value = "0";
    toggleTypeFields();
    projectModal.classList.remove("hidden");
});

document.getElementById("cancel-project").addEventListener("click", () => {
    projectModal.classList.add("hidden");
});

projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("project-id").value;
    const typeVal = parseInt(document.getElementById("project-type").value);
    const body = {
        name: document.getElementById("project-name").value,
        grade: getGradeValue(),
        type: typeVal,
        status: parseInt(document.getElementById("project-status").value),
        pitches: document.getElementById("project-pitches").value ? parseInt(document.getElementById("project-pitches").value) : null,
        length: document.getElementById("project-length").value || null,
        location_id: document.getElementById("project-location").value ? parseInt(document.getElementById("project-location").value) : null,
    };
    if (id) {
        await api(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
        await api("/api/projects", { method: "POST", body: JSON.stringify(body) });
    }
    projectModal.classList.add("hidden");
    loadProjects();
});

async function editProject(id) {
    const project = (await api("/api/projects")).find(p => p.id === id);
    if (!project) return;
    document.getElementById("modal-title").textContent = "Edit Project";
    document.getElementById("project-id").value = project.id;
    document.getElementById("project-name").value = project.name;
    setGradeValue(project.grade);
    document.getElementById("project-type").value = project.type;
    document.getElementById("project-status").value = project.status;
    document.getElementById("project-pitches").value = project.pitches || "";
    document.getElementById("project-length").value = project.length || "";
    document.getElementById("project-location").value = project.location_id || "";
    toggleTypeFields();
    projectModal.classList.remove("hidden");
}

async function deleteProject(id) {
    if (!confirm("Delete this project and all its sessions?")) return;
    await api(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
}

// ---- Session Modal ----
function openSessionModal(projectId) {
    document.getElementById("session-modal-title").textContent = "Log Session";
    sessionForm.reset();
    document.getElementById("session-id").value = "";
    document.getElementById("session-project-id").value = projectId;
    document.getElementById("session-date").value = today();
    sessionModal.classList.remove("hidden");
}

async function editSession(sessionId, projectId) {
    const sessions = await api(`/api/projects/${projectId}/sessions`);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    document.getElementById("session-modal-title").textContent = "Edit Session";
    document.getElementById("session-id").value = s.id;
    document.getElementById("session-project-id").value = projectId;
    document.getElementById("session-date").value = s.date;
    document.getElementById("session-notes").value = s.notes || "";
    sessionModal.classList.remove("hidden");
}

document.getElementById("cancel-session").addEventListener("click", () => {
    sessionModal.classList.add("hidden");
});

sessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sessionId = document.getElementById("session-id").value;
    const projectId = document.getElementById("session-project-id").value;
    const body = {
        date: document.getElementById("session-date").value,
        notes: document.getElementById("session-notes").value,
    };
    if (sessionId) {
        await api(`/api/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
        await api(`/api/projects/${projectId}/sessions`, { method: "POST", body: JSON.stringify(body) });
    }
    sessionModal.classList.add("hidden");
    toggleSessions(projectId);
});

async function deleteSession(sessionId, projectId) {
    await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
    toggleSessions(projectId);  // refresh
}

// ---- Init ----
loadLocations();
loadProjects();
