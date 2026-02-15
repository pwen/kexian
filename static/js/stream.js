// ---------------------------------------------------------------------------
// stream.js – Activity timeline grouped by month
// ---------------------------------------------------------------------------

import { api, apiBase, profileUser, esc } from "./api.js";

let streamYear = "";           // "" = all time, "ytd", or "2025"
let yearOptions = [];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchStream() {
    if (!profileUser) return [];
    let url = `${apiBase()}/stream`;
    if (streamYear === "ytd") url += "?ytd=1";
    else if (streamYear) url += `?year=${streamYear}`;
    return api(url);
}

async function fetchYears() {
    if (!profileUser) return;
    const years = await api(`${apiBase()}/session-years`);
    if (JSON.stringify(years) === JSON.stringify(yearOptions)) return;
    yearOptions = years;
    const sel = document.getElementById("stream-year");
    if (!sel) return;
    sel.innerHTML = `<option value="">All Time</option><option value="ytd">YTD</option>`
        + years.map(y => `<option value="${y}">${y}</option>`).join("");
    sel.value = streamYear;
}

// ---------------------------------------------------------------------------
// Grouping & rendering
// ---------------------------------------------------------------------------

function groupByMonth(entries) {
    const groups = {};           // key: "2026-02"
    for (const e of entries) {
        const key = e.date.slice(0, 7);     // "2026-02"
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
    }
    // Sort keys descending (newest first)
    return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(key => ({ key, entries: groups[key] }));
}

function monthHeader(key, entries) {
    const [y, m] = key.split("-");
    const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
    const sessions = entries.length;
    const sends = entries.filter(e => e.style === 1 || e.style === 2).length;
    const locs = new Set(entries.filter(e => e.location).map(e =>
        `${e.location.crag},${e.location.state_name}`
    )).size;

    let summary = `${sessions} session${sessions !== 1 ? "s" : ""}`;
    if (sends) summary += ` · ${sends} send${sends !== 1 ? "s" : ""}`;
    if (locs) summary += ` · ${locs} location${locs !== 1 ? "s" : ""}`;

    return `<div class="stream-month-header">
        <span class="stream-month-name">${monthName} ${y}</span>
        <span class="stream-month-summary">${summary}</span>
    </div>`;
}

function styleClass(style) {
    return style === 1 ? "flash" : style === 2 ? "send" : "attempt";
}

function entryHTML(e) {
    const d = new Date(e.date + "T00:00:00");
    const day = `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
    const loc = e.location
        ? ` at ${esc(e.location.crag)}${e.location.state_name ? ", " + esc(e.location.state_name) : ""}`
        : "";
    const notes = e.notes
        ? `<div class="stream-entry-notes">${esc(e.notes)}</div>`
        : "";

    return `<div class="stream-entry">
        <span class="stream-date">${day}</span>
        <span class="stream-style ${styleClass(e.style)}">${esc(e.style_label)}</span>
        <span class="stream-project">${esc(e.project_name)}</span>
        <span class="stream-grade">${esc(e.grade)}</span>
        <span class="stream-location">${loc}</span>
        ${notes}
    </div>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderStreamTab() {
    await fetchYears();
    const data = await fetchStream();
    const container = document.getElementById("stream-list");
    if (!container) return;

    if (!data.length) {
        container.innerHTML = `<p class="empty-msg">No sessions to show.</p>`;
        return;
    }

    const months = groupByMonth(data);
    container.innerHTML = months.map(({ key, entries }) =>
        monthHeader(key, entries) +
        `<div class="stream-month-entries">${entries.map(entryHTML).join("")}</div>`
    ).join("");
}

export function initStream() {
    const sel = document.getElementById("stream-year");
    if (sel) {
        sel.addEventListener("change", () => {
            streamYear = sel.value;
            renderStreamTab();
        });
    }
}
