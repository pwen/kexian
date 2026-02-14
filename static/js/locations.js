// ---------------------------------------------------------------------------
// locations.js – Location modal & cascading country → state
// ---------------------------------------------------------------------------

import { api, esc } from "./api.js";

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
}

export function initLocationModal() {
    const locationModal = document.getElementById("location-modal");
    const locationForm = document.getElementById("location-form");
    const locCountry = document.getElementById("loc-country");
    const locState = document.getElementById("loc-state");

    document.getElementById("new-location-btn").addEventListener("click", async () => {
        locationForm.reset();
        locState.innerHTML = `<option value="">— None —</option>`;
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
}
