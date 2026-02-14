// ---------------------------------------------------------------------------
// auth.js – Login, signup, logout, auth nav
// ---------------------------------------------------------------------------

import { currentUser, setCurrentUser, isOwner, esc } from "./api.js";

export async function fetchCurrentUser() {
    const res = await fetch("/api/auth/me");
    setCurrentUser(await res.json());
    renderAuthNav();
    renderOwnerUI();
}

function renderAuthNav() {
    const el = document.getElementById("auth-nav");
    if (!el) return;
    if (currentUser) {
        el.innerHTML = `
            <img src="${esc(currentUser.avatar_url)}" alt="avatar" class="nav-avatar" />
            <a href="/${esc(currentUser.username)}/projects" class="nav-user">${esc(currentUser.username)}</a>
            <a href="#" id="logout-btn" class="tab">Logout</a>`;
        document.getElementById("logout-btn").addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
        });
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
    const addBtn = document.getElementById("add-project-btn");
    if (addBtn) addBtn.style.display = isOwner() ? "" : "none";
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
