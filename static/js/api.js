// ---------------------------------------------------------------------------
// api.js – Shared helpers and state
// ---------------------------------------------------------------------------

export let currentUser = null;
export const profileUser = window.__PROFILE_USER__;

export function setCurrentUser(user) {
    currentUser = user;
}

export function isOwner() {
    return currentUser && profileUser && currentUser.id === profileUser.id;
}

export function apiBase() {
    return profileUser ? `/api/${profileUser.username}` : "/api";
}

export async function api(path, opts = {}) {
    const res = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...opts,
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
}

export function today() {
    return new Date().toISOString().slice(0, 10);
}

export function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}
