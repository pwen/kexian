// ---------------------------------------------------------------------------
// auth.js – Login, signup, logout, auth nav
// ---------------------------------------------------------------------------

import { currentUser, setCurrentUser, isOwner, esc } from "./api.js";
import { switchTab, getActiveTab } from "./router.js";

export async function fetchCurrentUser() {
    const res = await fetch("/api/auth/me");
    setCurrentUser(await res.json());
    renderAuthNav();
    renderOwnerUI();
    if (getActiveTab() === "profile") populateProfile();
}

function renderAuthNav() {
    const el = document.getElementById("auth-nav");
    if (!el) return;
    if (currentUser) {
        el.innerHTML = `
            <img src="${esc(currentUser.avatar_url)}" alt="avatar" class="nav-avatar" />
            <a href="/${esc(currentUser.username)}/profile" class="nav-user tab" data-tab="profile">${esc(currentUser.username)}</a>
            <a href="#" id="logout-btn" class="tab">Logout</a>`;
        document.getElementById("logout-btn").addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
        });
        // Username → profile tab
        const userLink = el.querySelector('.nav-user[data-tab="profile"]');
        if (userLink) {
            userLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchTab("profile");
                populateProfile();
            });
        }
    } else {
        el.innerHTML = `
            <a href="#" id="show-login" class="tab">Log In</a>
            <a href="#" id="show-signup" class="tab">Sign Up</a>`;
        document.getElementById("show-login").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("login-modal").classList.remove("hidden");
        });
        document.getElementById("show-signup").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("signup-modal").classList.remove("hidden");
        });
    }
}

export function renderOwnerUI() {
    const show = isOwner();
    const addBtn = document.getElementById("add-project-btn");
    if (addBtn) addBtn.style.display = show ? "" : "none";
    const addLocBtn = document.getElementById("add-location-btn");
    if (addLocBtn) addLocBtn.style.display = show ? "" : "none";
    // Profile save button only for owner
    const profileSave = document.getElementById("profile-save-btn");
    if (profileSave) profileSave.style.display = show ? "" : "none";
}

export function populateProfile() {
    if (!currentUser) return;
    document.getElementById("profile-avatar").src = currentUser.avatar_url;
    document.getElementById("profile-username").textContent = currentUser.username;
    document.getElementById("profile-height").value = currentUser.height_cm ?? "";
    document.getElementById("profile-reach").value = currentUser.reach_cm ?? "";
    document.getElementById("profile-saved").classList.add("hidden");
}

export function initProfileForm() {
    const form = document.getElementById("profile-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = {
            height_cm: document.getElementById("profile-height").value !== "" ? parseFloat(document.getElementById("profile-height").value) : null,
            reach_cm: document.getElementById("profile-reach").value !== "" ? parseFloat(document.getElementById("profile-reach").value) : null,
        };
        const res = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            const updated = await res.json();
            setCurrentUser(updated);
            const saved = document.getElementById("profile-saved");
            saved.classList.remove("hidden");
            setTimeout(() => saved.classList.add("hidden"), 2000);
        }
    });
}

export function setupAuthModals() {
    // Login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const errEl = document.getElementById("login-error");
            errEl.classList.add("hidden");
            const body = {
                username: document.getElementById("login-username").value,
                password: document.getElementById("login-password").value,
                remember: document.getElementById("login-remember").checked,
            };
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                errEl.textContent = data.error;
                errEl.classList.remove("hidden");
                return;
            }
            window.location.href = `/${data.username}/projects`;
        });
        document.getElementById("cancel-login").addEventListener("click", () => {
            document.getElementById("login-modal").classList.add("hidden");
        });
    }

    // Signup form
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const errEl = document.getElementById("signup-error");
            errEl.classList.add("hidden");
            const body = {
                username: document.getElementById("signup-username").value,
                password: document.getElementById("signup-password").value,
                height_cm: document.getElementById("signup-height").value !== "" ? document.getElementById("signup-height").value : null,
                reach_cm: document.getElementById("signup-reach").value !== "" ? document.getElementById("signup-reach").value : null,
            };
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                errEl.textContent = data.error;
                errEl.classList.remove("hidden");
                return;
            }
            window.location.href = `/${data.username}/projects`;
        });
        document.getElementById("cancel-signup").addEventListener("click", () => {
            document.getElementById("signup-modal").classList.add("hidden");
        });
    }

    // Switch between modals
    const switchToSignup = document.getElementById("switch-to-signup");
    if (switchToSignup) switchToSignup.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("login-modal").classList.add("hidden");
        document.getElementById("signup-modal").classList.remove("hidden");
    });
    const switchToLogin = document.getElementById("switch-to-login");
    if (switchToLogin) switchToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("signup-modal").classList.add("hidden");
        document.getElementById("login-modal").classList.remove("hidden");
    });
}
