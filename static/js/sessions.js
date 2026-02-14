// ---------------------------------------------------------------------------
// sessions.js – Session modal & CRUD
// ---------------------------------------------------------------------------

import { api, apiBase, today } from "./api.js";
import { loadProjects } from "./projects.js";

const sessionModal = document.getElementById("session-modal");
const sessionForm = document.getElementById("session-form");

export function openSessionModal(projectId) {
    document.getElementById("session-modal-title").textContent = "Log Session";
    sessionForm.reset();
    document.getElementById("session-id").value = "";
    document.getElementById("session-project-id").value = projectId;
    document.getElementById("session-date").value = today();
    document.getElementById("session-style").value = "0";
    document.getElementById("session-planned").checked = false;
    sessionModal.classList.remove("hidden");
}

export async function editSession(sessionId, projectId) {
    const sessions = await api(`${apiBase()}/projects/${projectId}/sessions`);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    document.getElementById("session-modal-title").textContent = "Edit Session";
    document.getElementById("session-id").value = s.id;
    document.getElementById("session-project-id").value = projectId;
    document.getElementById("session-date").value = s.date;
    document.getElementById("session-style").value = s.style;
    document.getElementById("session-planned").checked = s.planned;
    document.getElementById("session-notes").value = s.notes || "";
    sessionModal.classList.remove("hidden");
}

export async function deleteSession(sessionId, projectId) {
    if (!confirm("Delete this session?")) return;
    await api(`${apiBase()}/sessions/${sessionId}`, { method: "DELETE" });
    loadProjects();
}

export function initSessionModal() {
    document.getElementById("cancel-session").addEventListener("click", () => {
        sessionModal.classList.add("hidden");
    });

    sessionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sessionId = document.getElementById("session-id").value;
        const projectId = document.getElementById("session-project-id").value;
        const body = {
            date: document.getElementById("session-date").value,
            style: document.getElementById("session-style").value,
            planned: document.getElementById("session-planned").checked,
            notes: document.getElementById("session-notes").value,
        };
        if (sessionId) {
            await api(`${apiBase()}/sessions/${sessionId}`, { method: "PUT", body: JSON.stringify(body) });
        } else {
            await api(`${apiBase()}/projects/${projectId}/sessions`, { method: "POST", body: JSON.stringify(body) });
        }
        sessionModal.classList.add("hidden");
        loadProjects();
    });

    // Flatpickr date picker
    flatpickr("#session-date", {
        dateFormat: "Y-m-d",
        defaultDate: "today",
        theme: "dark",
        onChange: function (selectedDates) {
            if (selectedDates.length) {
                const isFuture = selectedDates[0] > new Date();
                document.getElementById("session-planned").checked = isFuture;
            }
        },
    });
}
