// ---------------------------------------------------------------------------
// Climbing Tracker – Frontend
// ---------------------------------------------------------------------------

const API = "";
let filterStatus = "";
let filterType = "";
let filterDate = "";

// Read initial filter state from URL
(function initFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    filterStatus = params.get("status") || "";
    filterType = params.get("type") || "";
    filterDate = params.get("date") || "";
    document.getElementById("filter-status").value = filterStatus;
    document.getElementById("filter-type").value = filterType;
    // filter-date is populated async, set after populateDateFilter
})();

function updateURL() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);
    if (filterDate) params.set("date", filterDate);
    const qs = params.toString() ? `?${params}` : "";
    history.replaceState(null, "", `${window.location.pathname}${qs}`);
}
let sortCol = "name";
let sortAsc = true;
let allExpanded = false;
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
let allProjects = [];
let dateFilterYears = []; // cached to avoid rebuilding on every render

async function populateDateFilter() {
    const years = await api("/api/session-years");
    if (JSON.stringify(years) === JSON.stringify(dateFilterYears)) return;
    dateFilterYears = years;
    const sel = document.getElementById("filter-date");
    sel.innerHTML = `<option value="">All Time</option><option value="ytd">YTD</option>`
        + years.map(y => `<option value="${y}">${y}</option>`).join("");
    sel.value = filterDate; // restore from URL
}

async function loadProjects() {
    const params = new URLSearchParams();
    if (filterStatus !== "") params.set("status", filterStatus);
    if (filterType !== "") params.set("type", filterType);
    if (filterDate !== "") params.set("date", filterDate);
    const qs = params.toString() ? `?${params}` : "";
    allProjects = await api(`/api/projects${qs}`);
    updateURL();
    renderProjects();
}

function sortProjects(projects) {
    const sorted = [...projects];
    sorted.sort((a, b) => {
        let va, vb;
        switch (sortCol) {
            case "status": va = a.status; vb = b.status; break;
            case "name": va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); break;
            case "type": va = a.type; vb = b.type; break;
            case "grade": va = (a.grade || ""); vb = (b.grade || ""); break;
            case "location":
                va = a.location ? (a.location.crag || a.location.area || "").toLowerCase() : "";
                vb = b.location ? (b.location.crag || b.location.area || "").toLowerCase() : "";
                break;
            case "last_session":
                va = (a.sessions || []).filter(s => !s.planned).length ? a.sessions.filter(s => !s.planned)[0].date : "";
                vb = (b.sessions || []).filter(s => !s.planned).length ? b.sessions.filter(s => !s.planned)[0].date : "";
                break;
            case "next_session":
                const ap = (a.sessions || []).filter(s => s.planned);
                const bp = (b.sessions || []).filter(s => s.planned);
                va = ap.length ? ap[ap.length - 1].date : "";
                vb = bp.length ? bp[bp.length - 1].date : "";
                break;
            default: va = 0; vb = 0;
        }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
    });
    return sorted;
}

function renderProjects() {
    if (!allProjects.length) {
        projectsList.innerHTML = `<div class="empty-state"><p>No projects yet — add your first one!</p></div>`;
        return;
    }
    const sorted = sortProjects(allProjects);
    const arrow = (col) => sortCol === col ? (sortAsc ? " ▲" : " ▼") : "";

    let html = `<table class="projects-table">
      <thead><tr>
        <th class="sortable" data-col="status">Status${arrow("status")}</th>
        <th class="sortable" data-col="name">Name${arrow("name")}</th>
        <th class="sortable" data-col="type">Type${arrow("type")}</th>
        <th class="sortable" data-col="grade">Grade${arrow("grade")}</th>
        <th class="sortable" data-col="location">Location${arrow("location")}</th>
        <th class="sortable" data-col="last_session">Last Session${arrow("last_session")}</th>
        <th class="sortable" data-col="next_session">Next Session${arrow("next_session")}</th>
        <th>Actions</th>
      </tr></thead><tbody>`;

    for (const p of sorted) {
        const locName = p.location ? esc([p.location.crag, p.location.area].filter(Boolean).join(", ")) : "";
        const realSessions = p.sessions ? p.sessions.filter(s => !s.planned) : [];
        const plannedSessions = p.sessions ? p.sessions.filter(s => s.planned) : [];
        const lastDate = realSessions.length ? realSessions[0].date : "";
        const nextDate = plannedSessions.length ? plannedSessions[plannedSessions.length - 1].date : "";
        const sessionCount = p.sessions ? p.sessions.length : 0;

        const sessionsHtml = sessionCount
            ? p.sessions.map(s => `
              <div class="attempt-item${s.planned ? ' planned' : ''}">
                <span class="session-date">${s.date}</span>
                <span class="session-style style-${s.planned ? 'planned' : s.style_label.toLowerCase()}">${s.planned ? 'Planned' : s.style_label}</span>
                <span class="session-note">${s.notes ? esc(s.notes) : ""}</span>
                <span class="session-actions">
                  <button class="btn-icon edit-icon" onclick="editSession(${s.id}, ${p.id})" title="Edit">&#9998;</button>
                  <button class="btn-icon danger" onclick="deleteSession(${s.id}, ${p.id})" title="Delete">✕</button>
                </span>
              </div>`).join("")
            : `<p class="no-sessions">No sessions yet.</p>`;

        html += `
          <tr class="project-row" data-id="${p.id}">
            <td><span class="status-badge ${STATUS_CLASSES[p.status]}">${STATUS_LABELS[p.status]}</span></td>
            <td class="col-name">${esc(p.name)}</td>
            <td><span class="type-badge">${TYPE_LABELS[p.type]}</span></td>
            <td><span class="route-grade">${esc(p.grade)}</span></td>
            <td class="col-location">${locName ? `📍 ${locName}` : ""}</td>
            <td class="col-date">${lastDate}</td>
            <td class="col-date">${nextDate}</td>
            <td class="col-actions">
              <button class="btn-icon edit-icon" onclick="editProject(${p.id})" title="Edit">&#9998;</button>
              <button class="btn-icon danger" onclick="deleteProject(${p.id})" title="Delete">✕</button>
              <button class="btn-icon accent" onclick="openSessionModal(${p.id})" title="Log Session">📝</button>
            </td>
          </tr>
          <tr class="sessions-row hidden" id="sessions-row-${p.id}">
            <td colspan="8">
              <div class="sessions-block">
                <div class="sessions-header">
                  <h4 class="sessions-heading">Sessions${sessionCount ? ` (${sessionCount})` : ""}</h4>
                </div>
                ${sessionsHtml}
              </div>
            </td>
          </tr>`;
    }
    html += `</tbody></table>`;
    projectsList.innerHTML = html;

    // Attach sort listeners
    projectsList.querySelectorAll(".sortable").forEach(th => {
        th.addEventListener("click", () => {
            const col = th.dataset.col;
            if (sortCol === col) { sortAsc = !sortAsc; } else { sortCol = col; sortAsc = true; }
            renderProjects();
        });
    });

    // Attach row-click to toggle sessions
    projectsList.querySelectorAll(".project-row").forEach(tr => {
        tr.addEventListener("click", (e) => {
            if (e.target.closest("button")) return; // don't toggle when clicking action buttons
            const id = tr.dataset.id;
            const sessRow = document.getElementById(`sessions-row-${id}`);
            sessRow.classList.toggle("hidden");
        });
    });
}

// ---- Toggle All Sessions ----
document.getElementById("toggle-all-sessions").addEventListener("click", () => {
    allExpanded = !allExpanded;
    document.getElementById("toggle-all-sessions").textContent = allExpanded ? "Hide Sessions" : "Show Sessions";
    document.querySelectorAll(".sessions-row").forEach(row => {
        row.classList.toggle("hidden", !allExpanded);
    });
});

// ---- Filter Dropdowns ----
document.getElementById("filter-status").addEventListener("change", (e) => {
    filterStatus = e.target.value;
    loadProjects();
});
document.getElementById("filter-type").addEventListener("change", (e) => {
    filterType = e.target.value;
    loadProjects();
});
document.getElementById("filter-date").addEventListener("change", (e) => {
    filterDate = e.target.value;
    loadProjects();
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
    document.getElementById("session-style").value = "0";
    document.getElementById("session-planned").checked = false;
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
    document.getElementById("session-style").value = s.style;
    document.getElementById("session-planned").checked = s.planned;
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
        style: document.getElementById("session-style").value,
        planned: document.getElementById("session-planned").checked,
        notes: document.getElementById("session-notes").value,
    };
    if (sessionId) {
        await api(`/api/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
        await api(`/api/projects/${projectId}/sessions`, { method: "POST", body: JSON.stringify(body) });
    }
    sessionModal.classList.add("hidden");
    loadProjects();
});

async function deleteSession(sessionId, projectId) {
    if (!confirm("Delete this session?")) return;
    await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
    loadProjects();
}

// ---- Flatpickr date picker ----
const sessionDatePicker = flatpickr("#session-date", {
    dateFormat: "Y-m-d",
    defaultDate: "today",
    theme: "dark",
    onChange: function (selectedDates) {
        if (selectedDates.length) {
            const isFuture = selectedDates[0] > new Date();
            document.getElementById("session-planned").checked = isFuture;
        }
    },
});

// ---- Init ----
loadLocations();
populateDateFilter();
loadProjects();
