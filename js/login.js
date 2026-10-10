// Sign-in page. Kept dependency-free on purpose: nothing here may require a
// session (catalog.js and local-site.js are both gated behind the login).
//
// On success the cookie is set by the server and the browser is sent back to
// the page it originally asked for (?next=), which is only honoured when it is
// a path on this site.

(function () {
    "use strict";

    const form = document.getElementById("login-form");
    const username = document.getElementById("login-username");
    const password = document.getElementById("login-password");
    const submit = document.getElementById("login-submit");
    const errorBox = document.getElementById("login-error");
    const noticeBox = document.getElementById("login-notice");

    function show(box, message) {
        box.textContent = message;
        box.hidden = !message;
    }

    function safeNext() {
        const value = new URLSearchParams(window.location.search).get("next") || "/";
        // Only a same-site absolute path: "//host" and "http://..." are refused.
        if (!value.startsWith("/") || value.startsWith("//")) return "/";
        return value;
    }

    async function redirectIfSignedIn() {
        try {
            const response = await fetch("/api/auth/me", { cache: "no-store" });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                if (payload.authEnabled === false) {
                    show(noticeBox, "Sign-in is disabled on this server; opening the game list...");
                    window.location.replace(safeNext());
                }
                return;
            }
            const payload = await response.json();
            const role = payload.user && payload.user.role;
            show(noticeBox, "Already signed in as " + payload.user.name + " - redirecting...");
            window.location.replace(role === "admin" && safeNext() === "/" ? "/" : safeNext());
        } catch (error) { /* offline: leave the form usable */ }
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        show(errorBox, "");
        if (!username.value.trim() || !password.value) {
            show(errorBox, "Enter your username and password.");
            return;
        }
        submit.disabled = true;
        submit.textContent = "Signing in...";
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.value.trim(), password: password.value }),
                cache: "no-store"
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                show(errorBox, payload.error || "Sign-in failed.");
                password.value = "";
                password.focus();
                return;
            }
            window.location.replace(safeNext());
        } catch (error) {
            show(errorBox, "Could not reach the server: " + error.message);
        } finally {
            submit.disabled = false;
            submit.textContent = "Sign in";
        }
    });

    redirectIfSignedIn();
    username.focus();
})();
