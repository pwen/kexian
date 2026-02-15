// ---------------------------------------------------------------------------
// app.js – Entry point: imports and initializes all modules
// ---------------------------------------------------------------------------

import { setupAuthModals, fetchCurrentUser, initProfileForm } from "./auth.js";
import { initRouter } from "./router.js";
import { loadLocations, initLocationModal } from "./locations.js";
import { initSessionModal } from "./sessions.js";
import { initProjects } from "./projects.js";

// Boot
initRouter();
setupAuthModals();
fetchCurrentUser();
initLocationModal();
initSessionModal();
initProfileForm();
initProjects();
loadLocations();
