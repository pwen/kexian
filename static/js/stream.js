// ---------------------------------------------------------------------------
// stream.js – Activity timeline grouped by month → date (theCrag style)
// ---------------------------------------------------------------------------

import { api, apiBase, profileUser, esc } from "./api.js";

let streamYear = "";           // "" = all time, "ytd", or "2025"
let yearOptions = [];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
// Grouping helpers
// ---------------------------------------------------------------------------

function groupByMonth(entries) {
    const groups = {};
    for (const e of entries) {
        const key = e.date.slice(0, 7);
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
    }
    return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(key => ({ key, entries: groups[key] }));
}

function groupByDate(entries) {
    const groups = {};
    for (const e of entries) {
        if (!groups[e.date]) groups[e.date] = [];
        groups[e.date].push(e);
    }
    return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(date => ({ date, entries: groups[date] }));
}

// ---------------------------------------------------------------------------
// Natural language summary for a day's sessions
// ---------------------------------------------------------------------------

function plural(n, singular) {
    return `${n} ${singular}${n !== 1 ? "s" : ""}`;
}

function typeName(type) {
    return type === 1 ? "boulder" : "route";
}

/** Build "flashed 1 boulder and worked on 2 routes" style summary */
function daySummary(entries) {
    // Group by (style_label, type) → count
    const buckets = {};
    let hasSend = false;
    for (const e of entries) {
        const verb = e.style === 1 ? "flashed" : e.style === 2 ? "sent" : "worked on";
        if (e.style === 1 || e.style === 2) hasSend = true;
        const noun = typeName(e.type);
        const key = `${verb}|${noun}`;
        if (!buckets[key]) buckets[key] = { verb, noun, count: 0 };
        buckets[key].count++;
    }

    const parts = Object.values(buckets).map(b => `${b.verb} ${plural(b.count, b.noun)}`);

    // Join with commas + "and"
    let text = "";
    if (parts.length === 0) text = "";
    else if (parts.length === 1) text = parts[0];
    else if (parts.length === 2) text = `${parts[0]} and ${parts[1]}`;
    else text = parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];

    if (hasSend) text += " 🎉";
    return text;
}

function dayLocation(entries) {
    const states = new Set();
    for (const e of entries) {
        if (e.location && e.location.state_name) {
            states.add(e.location.state_name);
        }
    }
    if (!states.size) return "";
    return " in " + [...states].join(" and ");
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function monthHeader(key, entries) {
    const [y, m] = key.split("-");
    const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
    const sessions = entries.length;
    const sends = entries.filter(e => e.style === 1 || e.style === 2).length;

    let summary = `${plural(sessions, "session")}`;
    if (sends) summary += ` · ${plural(sends, "send")}`;

    return `<div class="stream-month-header">
        <span class="stream-month-name">${monthName} ${y}</span>
        <span class="stream-month-summary">${summary}</span>
    </div>`;
}

function styleClass(style) {
    return style === 1 ? "flash" : style === 2 ? "send" : "attempt";
}

function dateGroupHTML(dateStr, entries) {
    const d = new Date(dateStr + "T00:00:00");
    const dayName = DAY_NAMES[d.getDay()];
    const dayNum = d.getDate();
    const monthAbbr = MONTH_NAMES[d.getMonth()].slice(0, 3);
    const year = d.getFullYear().toString().slice(-2);
    const username = profileUser ? profileUser.username : "User";

    const summary = daySummary(entries);
    const location = dayLocation(entries);

    const itemsHTML = entries.map(e => {
        const badge = `<span class="stream-grade-badge">${esc(e.grade)}</span>`;
        const styleCls = styleClass(e.style);
        const dot = `<span class="stream-dot ${styleCls}"></span>`;
        return `<div class="stream-item">
            ${dot} ${badge} <span class="stream-project-name">${esc(e.project_name)}</span>
        </div>`;
    }).join("");

    return `<div class="stream-day">
        <div class="stream-day-date">
            <span class="stream-day-name">${dayName}</span>
            <span class="stream-day-num">${dayNum}</span>
            <span class="stream-day-month">${monthAbbr} ${year}</span>
        </div>
        <div class="stream-day-content">
            <div class="stream-day-summary">
                <strong>${esc(username)}</strong> ${summary}${esc(location)}.
            </div>
            <div class="stream-day-items">${itemsHTML}</div>
        </div>
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
    container.innerHTML = months.map(({ key, entries }) => {
        const days = groupByDate(entries);
        return monthHeader(key, entries) +
            `<div class="stream-month-entries">${days.map(d => dateGroupHTML(d.date, d.entries)).join("")}</div>`;
    }).join("");
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
