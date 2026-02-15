// ---------------------------------------------------------------------------
// projects.js – Project list, render, sort, filter, CRUD modal
// ---------------------------------------------------------------------------

import { api, apiBase, isOwner, profileUser, esc } from "./api.js";
import {
    filterStatus, filterType, filterState, filterDate,
    setFilterStatus, setFilterType, setFilterState, setFilterDate,
    updateURL, syncStatusButtons,
} from "./router.js";
import { openSessionModal, editSession, deleteSession } from "./sessions.js";

const STATUS_LABELS = { 0: "To Try", 1: "Projecting", 2: "On Hold", 3: "Sent" };
const STATUS_CLASSES = { 0: "to-try", 1: "projecting", 2: "on-hold", 3: "sent" };
const TYPE_LABELS = { 0: "Sport", 1: "Boulder", 2: "Trad" };

const projectsList = document.getElementById("projects-list");
const projectModal = document.getElementById("project-modal");
const projectForm = document.getElementById("project-form");

let allProjects = [];
let sortCol = "status";
let sortAsc = true;
let allExpanded = false;
let dateFilterYears = [];
let stateFilterOptions = [];

// Expose actions to inline onclick handlers
window.editProject = editProject;
window.deleteProject = deleteProject;
window.openSessionModal = openSessionModal;
window.editSession = editSession;
window.deleteSession = deleteSession;

// ---------------------------------------------------------------------------
// Filter / Date
// ---------------------------------------------------------------------------

async function populateDateFilter() {
    if (!profileUser) return;
    const years = await api(`${apiBase()}/session-years`);
    if (JSON.stringify(years) === JSON.stringify(dateFilterYears)) return;
    dateFilterYears = years;
    const sel = document.getElementById("filter-date");
    sel.innerHTML = `<option value="">All Time</option><option value="ytd">YTD</option>`
        + years.map(y => `<option value="${y}">${y}</option>`).join("");
    sel.value = filterDate;
}

async function populateStateFilter() {
    if (!profileUser) return;
    const states = await api(`${apiBase()}/project-states`);
    if (JSON.stringify(states) === JSON.stringify(stateFilterOptions)) return;
    stateFilterOptions = states;
    const sel = document.getElementById("filter-state");
    sel.innerHTML = `<option value="">All States</option>`
        + states.map(s => `<option value="${s.state_name}">${s.state_short}</option>`).join("");
    sel.value = filterState;
}

// ---------------------------------------------------------------------------
// Load & Render
// ---------------------------------------------------------------------------

export async function loadProjects() {
    if (!profileUser) return;
    const params = new URLSearchParams();
    if (filterStatus !== "") params.set("status", filterStatus);
    if (filterType !== "") params.set("type", filterType);
    if (filterState !== "") params.set("state", filterState);
    if (filterDate !== "") params.set("date", filterDate);
    const qs = params.toString() ? `?${params}` : "";
    allProjects = await api(`${apiBase()}/projects${qs}`);
    updateURL();
    renderProjects();
}

// Custom status sort order: Projecting(1) -> To Try(0) -> Sent(3) -> On Hold(2)
const STATUS_ORDER = { 1: 0, 0: 1, 3: 2, 2: 3 };

function getLastSessionDate(p) {
    const real = (p.sessions || []).filter(s => !s.planned);
    return real.length ? real[0].date : "";
}

function sortProjects(projects) {
    const sorted = [...projects];
    sorted.sort((a, b) => {
        let va, vb;
        switch (sortCol) {
            case "status":
                va = STATUS_ORDER[a.status] ?? 99;
                vb = STATUS_ORDER[b.status] ?? 99;
                if (va !== vb) return sortAsc ? va - vb : vb - va;
                // Secondary: last session date descending (latest first)
                const da = getLastSessionDate(a);
                const db = getLastSessionDate(b);
                if (da > db) return -1;
                if (da < db) return 1;
                return 0;
            case "name": va = (a.name || "").toLowerCase(); vb = (b.name || "").toLowerCase(); break;
            case "type": va = a.type; vb = b.type; break;
            case "grade": va = (a.grade || ""); vb = (b.grade || ""); break;
            case "location":
                va = a.location ? (a.location.crag || a.location.area || "").toLowerCase() : "";
                vb = b.location ? (b.location.crag || b.location.area || "").toLowerCase() : "";
                break;
            case "last_session":
                va = getLastSessionDate(a);
                vb = getLastSessionDate(b);
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
        const msg = isOwner() ? "No projects yet — add your first one!" : "No projects yet.";
        projectsList.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
        return;
    }
    const sorted = sortProjects(allProjects);
    const arrow = (col) => sortCol === col ? (sortAsc ? " ▲" : " ▼") : "";
    const owner = isOwner();

    let html = `<table class="projects-table">
      <colgroup>
        <col style="width:11%">
        <col style="width:${owner ? '16%' : '20%'}">
        <col style="width:8%">
        <col style="width:9%">
        <col style="width:${owner ? '16%' : '20%'}">
        <col style="width:${owner ? '12%' : '16%'}">
        <col style="width:${owner ? '12%' : '16%'}">
        ${owner ? '<col style="width:16%">' : ''}
      </colgroup>
      <thead><tr>
        <th class="sortable" data-col="status">Status${arrow("status")}</th>
        <th class="sortable" data-col="name">Name${arrow("name")}</th>
        <th class="sortable" data-col="type">Type${arrow("type")}</th>
        <th class="sortable" data-col="grade">Grade${arrow("grade")}</th>
        <th class="sortable" data-col="location">Location${arrow("location")}</th>
        <th class="sortable" data-col="last_session">Last Session${arrow("last_session")}</th>
        <th class="sortable" data-col="next_session">Next Session${arrow("next_session")}</th>
        ${owner ? '<th>Actions</th>' : ''}
      </tr></thead><tbody>`;

    for (const p of sorted) {
        const locName = p.location ? esc([p.location.crag, p.location.state_short || p.location.state_name].filter(Boolean).join(", ")) : "";
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
                ${owner ? `<span class="session-actions">
                  <button class="btn-icon edit-icon" onclick="editSession(${s.id}, ${p.id})" title="Edit">&#9998;</button>
                  <button class="btn-icon danger" onclick="deleteSession(${s.id}, ${p.id})" title="Delete">✕</button>
                </span>` : ''}
              </div>`).join("")
            : "";

        html += `
          <tr class="project-row" data-id="${p.id}">
            <td><span class="status-badge ${STATUS_CLASSES[p.status]}">${STATUS_LABELS[p.status]}</span></td>
            <td class="col-name">${esc(p.name)}</td>
            <td><span class="type-badge">${TYPE_LABELS[p.type]}</span></td>
            <td><span class="route-grade">${esc(p.grade)}</span></td>
            <td class="col-location">${locName ? `📍 ${locName}` : ""}</td>
            <td class="col-date">${lastDate}</td>
            <td class="col-date">${nextDate}</td>
            ${owner ? `<td class="col-actions">
              <button class="btn-icon edit-icon" onclick="editProject(${p.id})" title="Edit">&#9998;</button>
              <button class="btn-icon danger" onclick="deleteProject(${p.id})" title="Delete">✕</button>
              <button class="btn-icon accent" onclick="openSessionModal(${p.id})" title="Log Session">📝</button>
            </td>` : ''}
          </tr>`;

        if (sessionCount) {
            html += `
          <tr class="sessions-row hidden" id="sessions-row-${p.id}">
            <td colspan="${owner ? 8 : 7}">
              <div class="sessions-block">
                <div class="sessions-header">
                  <h4 class="sessions-heading">Sessions (${sessionCount})</h4>
                </div>
                ${sessionsHtml}
              </div>
            </td>
          </tr>`;
        }
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
            if (e.target.closest("button")) return;
            const id = tr.dataset.id;
            const row = document.getElementById(`sessions-row-${id}`);
            if (!row) return;
            row.classList.toggle("hidden");
        });
    });
}

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------

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
    if (gradeBoulder.querySelector(`option[value="${grade}"]`)) gradeBoulder.value = grade;
    if (gradeRope.querySelector(`option[value="${grade}"]`)) gradeRope.value = grade;
}

// ---------------------------------------------------------------------------
// Project modal
// ---------------------------------------------------------------------------

async function editProject(id) {
    const project = allProjects.find(p => p.id === id);
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
    await api(`${apiBase()}/projects/${id}`, { method: "DELETE" });
    loadProjects();
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initProjects() {
    typeSelect.addEventListener("change", toggleTypeFields);

    // Add project button
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

    // Project form submit
    projectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("project-id").value;
        const body = {
            name: document.getElementById("project-name").value,
            grade: getGradeValue(),
            type: parseInt(document.getElementById("project-type").value),
            status: parseInt(document.getElementById("project-status").value),
            pitches: document.getElementById("project-pitches").value ? parseInt(document.getElementById("project-pitches").value) : null,
            length: document.getElementById("project-length").value || null,
            location_id: document.getElementById("project-location").value ? parseInt(document.getElementById("project-location").value) : null,
        };
        if (id) {
            await api(`${apiBase()}/projects/${id}`, { method: "PUT", body: JSON.stringify(body) });
        } else {
            await api(`${apiBase()}/projects`, { method: "POST", body: JSON.stringify(body) });
        }
        projectModal.classList.add("hidden");
        loadProjects();
    });

    // Toggle all sessions
    document.getElementById("toggle-all-sessions").addEventListener("click", () => {
        allExpanded = !allExpanded;
        document.getElementById("toggle-all-sessions").textContent = allExpanded ? "Hide Sessions" : "Show Sessions";
        document.querySelectorAll(".sessions-row").forEach(row => {
            row.classList.toggle("hidden", !allExpanded);
        });
    });

    // Status multi-select dropdown
    const statusWrap = document.getElementById("filter-status");
    const statusTrigger = statusWrap.querySelector(".multi-select-trigger");
    const statusDropdown = statusWrap.querySelector(".multi-select-dropdown");
    statusTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        statusDropdown.classList.toggle("hidden");
    });
    statusDropdown.addEventListener("click", (e) => e.stopPropagation());
    statusDropdown.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
            const checked = [...statusDropdown.querySelectorAll("input:checked")].map(c => c.value);
            setFilterStatus(checked.join(","));
            syncStatusButtons();
            loadProjects();
        });
    });
    document.addEventListener("click", () => statusDropdown.classList.add("hidden"));
    document.getElementById("filter-type").addEventListener("change", (e) => {
        setFilterType(e.target.value);
        loadProjects();
    });
    document.getElementById("filter-state").addEventListener("change", (e) => {
        setFilterState(e.target.value);
        loadProjects();
    });
    document.getElementById("filter-date").addEventListener("change", (e) => {
        setFilterDate(e.target.value);
        loadProjects();
    });

    // Populate async filters & load
    populateDateFilter();
    populateStateFilter();
    loadProjects();
}
