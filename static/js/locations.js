// ---------------------------------------------------------------------------
// locations.js – Location modal & cascading country → state, plus management
// ---------------------------------------------------------------------------

import { api, esc, isOwner } from "./api.js";

let locations = [];

export function getLocations() { return locations; }

export function populateLocationSelect() {
    const select = document.getElementById("project-location");
    select.innerHTML = `<option value="">— None —</option>` +
        locations.map(l => `<option value="${l.id}">${esc(l.crag || l.area)}</option>`).join("");
}

export async function loadLocations() {
    locations = await api("/api/locations");
    populateLocationSelect();
    renderLocationsTab();
}

// ---------------------------------------------------------------------------
// Locations Tab – list, edit, delete
// ---------------------------------------------------------------------------

export function renderLocationsTab() {
    const container = document.getElementById("locations-list");
    if (!container) return;
    const owner = isOwner();

    if (!locations.length) {
        container.innerHTML = `<div class="empty-state"><p>No locations yet.</p></div>`;
        return;
    }

    let html = `<table class="locations-table">
      <thead><tr>
        <th>Crag</th>
        <th>Area</th>
        <th>State</th>
        <th>Country</th>
        ${owner ? '<th>Actions</th>' : ''}
      </tr></thead><tbody>`;

    for (const l of locations) {
        html += `<tr>
          <td>${esc(l.crag || "—")}</td>
          <td>${esc(l.area)}</td>
          <td>${esc(l.state_name || "—")}</td>
          <td>${esc(l.country_name)}</td>
          ${owner ? `<td class="col-actions">
            <button class="btn-icon edit-icon" onclick="editLocation(${l.id})" title="Edit">&#9998;</button>
            <button class="btn-icon danger" onclick="deleteLocation(${l.id})" title="Delete">✕</button>
          </td>` : ''}
        </tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function _loadCountriesInto(selectEl) {
    if (selectEl.options.length <= 1) {
        const countries = await api("/api/countries");
        selectEl.innerHTML = `<option value="">Select country…</option>` +
            countries.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join("");
    }
}

async function _loadSubdivisionsInto(countryCode, selectEl, preselect = "") {
    selectEl.innerHTML = `<option value="">— None —</option>`;
    if (!countryCode) return;
    const subs = await api(`/api/countries/${countryCode}/subdivisions`);
    if (subs.length) {
        selectEl.innerHTML = `<option value="">— None —</option>` +
            subs.map(s => `<option value="${s.code}"${s.code === preselect ? ' selected' : ''}>${esc(s.name)}</option>`).join("");
    }
}

// ---------------------------------------------------------------------------
// Edit location
// ---------------------------------------------------------------------------
window.editLocation = async function (id) {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;

    const modal = document.getElementById("edit-location-modal");
    const form = document.getElementById("edit-location-form");
    const countrySelect = document.getElementById("edit-loc-country");
    const stateSelect = document.getElementById("edit-loc-state");

    document.getElementById("edit-loc-id").value = loc.id;
    document.getElementById("edit-loc-area").value = loc.area;
    document.getElementById("edit-loc-crag").value = loc.crag || "";

    await _loadCountriesInto(countrySelect);
    countrySelect.value = loc.country_code;
    await _loadSubdivisionsInto(loc.country_code, stateSelect, loc.state_code);

    modal.classList.remove("hidden");
};

// ---------------------------------------------------------------------------
// Delete location
// ---------------------------------------------------------------------------
window.deleteLocation = async function (id) {
    const loc = locations.find(l => l.id === id);
    if (!loc) return;
    if (!confirm(`Delete location "${loc.display_name}"?`)) return;
    try {
        await api(`/api/locations/${id}`, { method: "DELETE" });
        locations = locations.filter(l => l.id !== id);
        populateLocationSelect();
        renderLocationsTab();
    } catch (e) {
        alert(e.error || e.message || "Cannot delete location");
    }
};

// ---------------------------------------------------------------------------
// Init – wire up modals (create + edit)
// ---------------------------------------------------------------------------
export function initLocationModal() {
    // --- Create location modal (from project form) ---
    const locationModal = document.getElementById("location-modal");
    const locationForm = document.getElementById("location-form");
    const locCountry = document.getElementById("loc-country");
    const locState = document.getElementById("loc-state");

    document.getElementById("new-location-btn").addEventListener("click", async () => {
        locationForm.reset();
        locState.innerHTML = `<option value="">— None —</option>`;
        await _loadCountriesInto(locCountry);
        locationModal.classList.remove("hidden");
    });

    locCountry.addEventListener("change", async () => {
        await _loadSubdivisionsInto(locCountry.value, locState);
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
        renderLocationsTab();
        document.getElementById("project-location").value = loc.id;
        locationModal.classList.add("hidden");
    });

    // --- "Add Location" button on the Locations tab ---
    const addLocBtn = document.getElementById("add-location-btn");
    if (addLocBtn) {
        addLocBtn.addEventListener("click", async () => {
            locationForm.reset();
            locState.innerHTML = `<option value="">— None —</option>`;
            await _loadCountriesInto(locCountry);
            locationModal.classList.remove("hidden");
        });
    }

    // --- Edit location modal ---
    const editModal = document.getElementById("edit-location-modal");
    const editForm = document.getElementById("edit-location-form");
    const editCountry = document.getElementById("edit-loc-country");
    const editState = document.getElementById("edit-loc-state");

    editCountry.addEventListener("change", async () => {
        await _loadSubdivisionsInto(editCountry.value, editState);
    });

    document.getElementById("cancel-edit-location").addEventListener("click", () => {
        editModal.classList.add("hidden");
    });

    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("edit-loc-id").value;
        const body = {
            country_code: editCountry.value,
            state_code: editState.value || "",
            area: document.getElementById("edit-loc-area").value,
            crag: document.getElementById("edit-loc-crag").value || "",
        };
        const updated = await api(`/api/locations/${id}`, { method: "PUT", body: JSON.stringify(body) });
        const idx = locations.findIndex(l => l.id === updated.id);
        if (idx !== -1) locations[idx] = updated;
        populateLocationSelect();
        renderLocationsTab();
        editModal.classList.add("hidden");
    });
}
