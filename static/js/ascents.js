// ---------------------------------------------------------------------------
// ascents.js – Grade distribution bar charts (Chart.js)
// ---------------------------------------------------------------------------

import { api, apiBase, profileUser } from "./api.js";

let boulderChart = null;
let routeChart = null;
let ascentsYear = "";          // "" = all time, "ytd", or "2025"
let yearOptions = [];

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

function makeChart(canvasId, labels, data, color, title) {
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
// Public API
// ---------------------------------------------------------------------------

export async function renderAscentsTab() {
    await fetchYears();
    const data = await fetchAscents();

    // Boulder chart
    const boulderCounts = buildCounts(data, BOULDER_GRADES, [1], null);
    if (boulderChart) boulderChart.destroy();
    boulderChart = makeChart("chart-boulders", BOULDER_GRADES, boulderCounts, "#22c55e", "Boulders by Grade");

    // Route chart
    const routeCounts = buildCounts(data, ROUTE_BUCKETS, [0, 2], routeBucket);
    if (routeChart) routeChart.destroy();
    routeChart = makeChart("chart-routes", ROUTE_BUCKETS, routeCounts, "#ef4444", "Rock Routes by Grade");
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
