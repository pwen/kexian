// ---------------------------------------------------------------------------
// router.js – Tab routing & URL filter management
// ---------------------------------------------------------------------------

import { profileUser } from "./api.js";

export let filterStatus = "";
export let filterType = "";
export let filterDate = "";

export function setFilterStatus(v) { filterStatus = v; }
export function setFilterType(v) { filterType = v; }
export function setFilterDate(v) { filterDate = v; }

export function getActiveTab() {
    const path = window.location.pathname.replace(/\/$/, "");
    if (path.endsWith("/ascents")) return "ascents";
    if (path.endsWith("/locations")) return "locations";
    if (path.endsWith("/profile")) return "profile";
    return "projects";
}

export function tabUrl(tab) {
    if (profileUser) return `/${profileUser.username}/${tab}`;
    return `/${tab}`;
}

export function switchTab(tab, pushState = true) {
    const title = tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById('nav-title').textContent = title.toUpperCase();
    document.querySelectorAll('.nav-links .tab[data-tab]').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
        t.href = tabUrl(t.dataset.tab);
    });
    document.querySelectorAll(".tab-content").forEach(tc => {
        tc.classList.toggle("active", tc.id === `tab-${tab}`);
    });
    if (pushState) {
        history.pushState({ tab }, "", tabUrl(tab));
    }
}

export function updateURL() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);
    if (filterDate) params.set("date", filterDate);
    const qs = params.toString() ? `?${params}` : "";
    history.replaceState(null, "", `${window.location.pathname}${qs}`);
}

export function initRouter() {
    // Tab click handlers
    document.querySelectorAll('.nav-links .tab[data-tab]').forEach(tabEl => {
        tabEl.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tabEl.dataset.tab);
        });
    });

    // Browser back/forward
    window.addEventListener("popstate", () => {
        switchTab(getActiveTab(), false);
    });

    // Set initial tab from URL
    switchTab(getActiveTab(), false);

    // Read initial filter state from URL
    const params = new URLSearchParams(window.location.search);
    filterStatus = params.get("status") || "";
    filterType = params.get("type") || "";
    filterDate = params.get("date") || "";
    document.getElementById("filter-status").value = filterStatus;
    document.getElementById("filter-type").value = filterType;
    // filter-date is populated async, set after populateDateFilter
}
