// ---------------------------------------------------------------------------
// app.js – Entry point: imports and initializes all modules
// ---------------------------------------------------------------------------

import { setupAuthModals, fetchCurrentUser, initProfileForm } from "./auth.js";
import { initRouter, getActiveTab } from "./router.js";
import { loadLocations, initLocationModal } from "./locations.js";
import { initSessionModal } from "./sessions.js";
import { initProjects } from "./projects.js";
import { initAscents, renderAscentsTab } from "./ascents.js";
import { initStream, renderStreamTab } from "./stream.js";

// Boot
initRouter();
setupAuthModals();
fetchCurrentUser();
initLocationModal();
initSessionModal();
initProfileForm();
initProjects();
loadLocations();
initAscents();
initStream();

// Render data tabs on activation
const activeTab = getActiveTab();
if (activeTab === "ascents") renderAscentsTab();
if (activeTab === "stream") renderStreamTab();

// Re-render when switching tabs
document.querySelectorAll('.nav-links .tab[data-tab]').forEach(tabEl => {
    tabEl.addEventListener('click', () => {
        if (tabEl.dataset.tab === "ascents") renderAscentsTab();
        if (tabEl.dataset.tab === "stream") renderStreamTab();
    });
});
