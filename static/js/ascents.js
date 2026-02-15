// ---------------------------------------------------------------------------
// ascents.js – Grade distribution bar charts (Chart.js)
// ---------------------------------------------------------------------------

import { api, apiBase, profileUser } from "./api.js";

let boulderChart = null;
let routeChart = null;
let ascentsYear = "";          // "" = all time, "ytd", or "2025"
let yearOptions = [];
let lastAscentsData = [];      // cache for drill-down

// ---------------------------------------------------------------------------
// Grade bucket helpers
// ---------------------------------------------------------------------------

const BOULDER_GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

const ROUTE_BUCKETS = [
    "5.11-", "5.11", "5.11+",
    "5.12-", "5.12", "5.12+",
    "5.13-", "5.13", "5.13+",
];

/** Map a letter grade like "5.11a" to an MP-style bucket like "5.11-" */
function routeBucket(grade) {
    if (!grade) return null;
    const m = grade.match(/^5\.(\d+)([a-d])$/i);
    if (!m) return null;
    const num = m[1];
    const letter = m[2].toLowerCase();
    if (letter === "a") return `5.${num}-`;
    if (letter === "d") return `5.${num}+`;
    return `5.${num}`;          // b or c → base
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchAscents() {
    if (!profileUser) return [];
    let url = `${apiBase()}/ascents`;
    if (ascentsYear === "ytd") url += "?ytd=1";
    else if (ascentsYear) url += `?year=${ascentsYear}`;
    return api(url);
}

async function fetchYears() {
    if (!profileUser) return;
    const years = await api(`${apiBase()}/session-years`);
    if (JSON.stringify(years) === JSON.stringify(yearOptions)) return;
    yearOptions = years;
    const sel = document.getElementById("ascents-year");
    if (!sel) return;
    sel.innerHTML = `<option value="">All Time</option><option value="ytd">YTD</option>`
        + years.map(y => `<option value="${y}">${y}</option>`).join("");
    sel.value = ascentsYear;
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------

function buildCounts(data, grades, typeCodes, bucketFn) {
    const counts = {};
    grades.forEach(g => { counts[g] = 0; });
    data.filter(d => typeCodes.includes(d.type)).forEach(d => {
        const key = bucketFn ? bucketFn(d.grade) : d.grade;
        if (key && key in counts) counts[key]++;
    });
    return grades.map(g => counts[g]);
}

function makeChart(canvasId, labels, data, color, title, onClick) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const cfg = {
        type: "bar",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: color,
                borderRadius: 3,
                maxBarThickness: 36,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0 && onClick) {
                    const idx = elements[0].index;
                    onClick(labels[idx]);
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: title,
                    color: "#e4e4e7",
                    font: { family: "'JetBrains Mono', monospace", size: 14, weight: "600" },
                    padding: { bottom: 12 },
                },
                tooltip: {
                    bodyFont: { family: "'JetBrains Mono', monospace" },
                    titleFont: { family: "'JetBrains Mono', monospace" },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#a1a1aa", font: { family: "'JetBrains Mono', monospace", size: 11 } },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#a1a1aa",
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        stepSize: 1,
                        precision: 0,
                    },
                    grid: { color: "rgba(161,161,170,0.15)" },
                },
            },
        },
    };

    return new Chart(ctx, cfg);
}

// ---------------------------------------------------------------------------
// Drill-down modal
// ---------------------------------------------------------------------------

function showDrillDown(bucketLabel, typeCodes, bucketFn) {
    const matches = lastAscentsData
        .filter(d => typeCodes.includes(d.type))
        .filter(d => {
            const key = bucketFn ? bucketFn(d.grade) : d.grade;
            return key === bucketLabel;
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const title = document.getElementById("ascent-detail-title");
    const list = document.getElementById("ascent-detail-list");
    const modal = document.getElementById("ascent-detail-modal");
    if (!title || !list || !modal) return;

    title.textContent = `${bucketLabel}  (${matches.length})`;
    list.innerHTML = matches.map(d => {
        const loc = d.location ? d.location.state_short || d.location.state_name || d.location.crag : "";
        const locSpan = loc ? `<span class="ad-loc">${loc}</span>` : "";
        const styleClass = d.style_label === "Flash" ? "flash" : d.style_label === "Send" ? "send" : "attempt";
        return `<li class="ad-item">
            <span class="ad-name">${d.project_name}</span>
            <span class="ad-grade">${d.grade}</span>
            <span class="ad-style ${styleClass}">${d.style_label}</span>
            ${locSpan}
            <span class="ad-date">${d.date || ""}</span>
        </li>`;
    }).join("");

    modal.classList.remove("hidden");
}

// Close modal on backdrop click
document.addEventListener("click", (e) => {
    const modal = document.getElementById("ascent-detail-modal");
    if (modal && e.target === modal) modal.classList.add("hidden");
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderAscentsTab() {
    await fetchYears();
    const data = await fetchAscents();
    lastAscentsData = data;

    // Boulder chart
    const boulderCounts = buildCounts(data, BOULDER_GRADES, [1], null);
    if (boulderChart) boulderChart.destroy();
    boulderChart = makeChart("chart-boulders", BOULDER_GRADES, boulderCounts, "#22c55e", "Boulders by Grade",
        (label) => showDrillDown(label, [1], null));

    // Route chart
    const routeCounts = buildCounts(data, ROUTE_BUCKETS, [0, 2], routeBucket);
    if (routeChart) routeChart.destroy();
    routeChart = makeChart("chart-routes", ROUTE_BUCKETS, routeCounts, "#ef4444", "Rock Routes by Grade",
        (label) => showDrillDown(label, [0, 2], routeBucket));
}

export function initAscents() {
    const sel = document.getElementById("ascents-year");
    if (sel) {
        sel.addEventListener("change", () => {
            ascentsYear = sel.value;
            renderAscentsTab();
        });
    }
}
