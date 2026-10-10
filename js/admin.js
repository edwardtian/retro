// Administrator user management for the local mirror (/admin.html).
//
// Drives the /api/auth/* endpoints served by serve.py:
//   GET    /api/auth/me              signed-in account + role check
//   GET    /api/auth/users           account list
//   POST   /api/auth/users           create an account
//   POST   /api/auth/users/<name>    edit role / games / password / disabled
//   DELETE /api/auth/users/<name>    delete an account
//   POST   /api/auth/password        change the signed-in account's password
//   POST   /api/auth/logout          sign out
//
// The page itself is gated on the server (only administrators get /admin.html),
// the /api/auth/me check below is just a nicety so an expired session lands back
// on the sign-in page instead of an empty table.
//
// Rendering is DOM-only: account names and catalog titles are never inserted as
// HTML (no innerHTML anywhere), so a crafted game id or username stays text.

(function () {
    "use strict";

    const site = window.LocalSite;
    const catalog = window.LOCAL_CATALOG && Array.isArray(window.LOCAL_CATALOG.games)
        ? window.LOCAL_CATALOG.games : [];
    const catalogById = new Map();
    catalog.forEach(function (game) {
        if (game && typeof game.id === "string") catalogById.set(game.id, game);
    });

    const LOGIN_URL = "/login.html?next=" + encodeURIComponent("/admin.html");
    // Same rules as auth.py: USERNAME_RE and PASSWORD_MIN_LENGTH.
    const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
    const USERNAME_HINT = "Username must be 1-32 characters starting with a letter or digit: " +
        "letters, digits, '.', '_' or '-'.";
    const PASSWORD_MIN_LENGTH = 6;
    const PASSWORD_HINT = "Password must be at least " + PASSWORD_MIN_LENGTH + " characters.";
    const SUCCESS_TIMEOUT_MS = 6000;

    // ------------------------------------------------------------- messages

    const alertBox = document.getElementById("admin-alert");
    let alertTimer = null;

    function hideAlert() {
        if (alertTimer) { clearTimeout(alertTimer); alertTimer = null; }
        alertBox.hidden = true;
        alertBox.replaceChildren();
    }

    function showAlert(kind, message) {
        if (alertTimer) { clearTimeout(alertTimer); alertTimer = null; }
        alertBox.className = "alert alert-" + kind + " py-2";
        alertBox.textContent = message;
        alertBox.hidden = false;
        alertBox.scrollIntoView({ block: "nearest" });
        if (kind === "success") {
            alertTimer = setTimeout(hideAlert, SUCCESS_TIMEOUT_MS);
        }
    }

    // ------------------------------------------------------------ api calls

    function apiFailure(message, status) {
        const error = new Error(message);
        error.status = status;
        return error;
    }

    async function api(method, path, body) {
        const options = { method: method, credentials: "same-origin", cache: "no-store", headers: {} };
        if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
        let response;
        try {
            response = await fetch(path, options);
        } catch (error) {
            throw apiFailure("Cannot reach the server. Is it still running?", 0);
        }
        let data = null;
        try { data = await response.json(); } catch (error) { data = null; }
        if (!response.ok) {
            const message = data && typeof data.error === "string" && data.error
                ? data.error : "Request failed with status " + response.status;
            throw apiFailure(message, response.status);
        }
        return data || {};
    }

    // Report a failed call. A 401 means the session is gone (expired or the
    // account was disabled), which sends the administrator back to sign in.
    function reportError(error) {
        if (error && error.status === 401) {
            location.replace(LOGIN_URL);
            return;
        }
        console.error(error);
        showAlert("danger", (error && error.message) || String(error));
    }

    // ------------------------------------------------------------ elements

    const accountForm = document.getElementById("account-form");
    const accountTitle = document.getElementById("account-form-title");
    const accountModeBadge = document.getElementById("account-form-mode");
    const usernameInput = document.getElementById("account-username");
    const passwordInput = document.getElementById("account-password");
    const passwordHint = document.getElementById("account-password-hint");
    const roleSelect = document.getElementById("account-role");
    const grantModeInputs = Array.prototype.slice.call(
        document.querySelectorAll('input[name="grant-mode"]'));
    const grantSelectedArea = document.getElementById("grant-selected-area");
    const grantFilter = document.getElementById("grant-filter");
    const grantList = document.getElementById("grant-list");
    const grantCount = document.getElementById("grant-count");
    const submitButton = document.getElementById("account-submit");
    const cancelButton = document.getElementById("account-cancel");
    const usersBody = document.getElementById("users-body");
    const usersEmpty = document.getElementById("users-empty");
    const passwordForm = document.getElementById("password-form");

    // -------------------------------------------------------------- state

    let catalogRows = [];    // one row per catalog game
    let unknownRows = [];    // rows for granted ids that left the catalog
    let editing = null;      // username being edited, or null in create mode
    let currentName = null;  // signed-in account name (may be unknown, see below)
    let users = [];
    let rowSeq = 0;

    // ------------------------------------------------------ games selector

    function allRows() {
        return unknownRows.concat(catalogRows);
    }

    function osBadge(game) {
        const dos = game && game.os === "dos";
        const badge = document.createElement("span");
        badge.className = "badge ms-1 " + (dos ? "text-bg-secondary" : "text-bg-primary");
        badge.textContent = (game && (game.osLabel || (dos ? "DOS" : "Windows"))) || (dos ? "DOS" : "Windows");
        return badge;
    }

    function unknownBadge() {
        const badge = document.createElement("span");
        badge.className = "badge ms-1 text-bg-warning";
        badge.textContent = "Unknown";
        return badge;
    }

    function makeRow(id, labelText, idText, badge) {
        const row = document.createElement("div");
        row.className = "form-check py-1";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input";
        input.id = "grant-row-" + (rowSeq++);
        input.value = id;
        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = input.id;
        const name = document.createElement("span");
        name.textContent = labelText;
        label.appendChild(name);
        if (idText) {
            const small = document.createElement("span");
            small.className = "local-subtle ms-1";
            small.textContent = idText;
            label.appendChild(small);
        }
        if (badge) label.appendChild(badge);
        row.appendChild(input);
        row.appendChild(label);
        row.search = (id + " " + labelText).toLowerCase();
        row.input = input;
        return row;
    }

    function buildCatalogRows() {
        catalogRows = catalog.map(function (game) {
            const id = String(game.id);
            const row = makeRow(id, game.title || id, id, osBadge(game));
            grantList.appendChild(row);
            return row;
        });
    }

    // Grants can name ids the catalog no longer has. They stay as extra rows
    // (checked) so saving the account does not silently drop them.
    function setUnknownIds(ids) {
        unknownRows.forEach(function (row) { row.remove(); });
        unknownRows = [];
        ids.forEach(function (id) {
            const row = makeRow(id, "unknown: " + id, "", unknownBadge());
            row.input.checked = true;
            grantList.insertBefore(row, grantList.firstChild);
            unknownRows.push(row);
        });
    }

    function updateGrantCount() {
        const rows = allRows();
        const selected = rows.filter(function (row) { return row.input.checked; }).length;
        grantCount.textContent = selected + " of " + rows.length + " selected";
    }

    function applyGrantFilter() {
        const needle = grantFilter.value.trim().toLowerCase();
        allRows().forEach(function (row) {
            row.hidden = needle !== "" && row.search.indexOf(needle) < 0;
        });
        updateGrantCount();
    }

    function clearGrantChecks() {
        allRows().forEach(function (row) { row.input.checked = false; });
    }

    function grantMode() {
        const chosen = grantModeInputs.filter(function (input) { return input.checked; })[0];
        return chosen ? chosen.value : "all";
    }

    function setGrantMode(mode) {
        grantModeInputs.forEach(function (input) { input.checked = input.value === mode; });
        grantSelectedArea.hidden = mode !== "selected";
    }

    // All checked games, including the ones hidden by the filter.
    function selectedGames() {
        if (grantMode() === "all") return "*";
        return allRows().filter(function (row) { return row.input.checked; })
            .map(function (row) { return row.input.value; });
    }

    // --------------------------------------------------------- form modes

    function enterCreateMode() {
        editing = null;
        setUnknownIds([]);
        clearGrantChecks();
        accountTitle.textContent = "Create account";
        accountModeBadge.hidden = true;
        accountModeBadge.textContent = "";
        usernameInput.value = "";
        usernameInput.readOnly = false;
        passwordInput.value = "";
        passwordHint.textContent = "At least " + PASSWORD_MIN_LENGTH + " characters; required for a new account.";
        roleSelect.value = "user";
        grantFilter.value = "";
        setGrantMode("all");
        applyGrantFilter();
        submitButton.textContent = "Create account";
        cancelButton.hidden = true;
    }

    // Reads the account list again before editing: another administrator or tab
    // may have changed the grants since this table was drawn, and the editor
    // must show the stored grant (including ids that left the catalog).
    async function startEdit(record) {
        let fresh = record;
        try {
            const data = await api("GET", "/api/auth/users");
            users = Array.isArray(data.users) ? data.users : users;
            renderUsers();
            fresh = users.filter(function (item) { return item.username === record.username; })[0] || record;
        } catch (error) {
            if (error && error.status === 401) { reportError(error); return; }
            console.error("Cannot refresh the account list before editing", error);
        }
        applyEditMode(fresh);
    }

    function applyEditMode(record) {
        editing = record.username;
        const grant = record.games;
        const ids = grant === "*" || !Array.isArray(grant) ? [] : grant.map(String);

        clearGrantChecks();
        if (grant === "*") {
            setUnknownIds([]);
            setGrantMode("all");
        } else {
            setUnknownIds(ids.filter(function (id) { return !catalogById.has(id); }));
            const wanted = new Set(ids);
            catalogRows.forEach(function (row) { row.input.checked = wanted.has(row.input.value); });
            setGrantMode("selected");
        }

        accountTitle.textContent = "Edit account";
        accountModeBadge.hidden = false;
        accountModeBadge.textContent = record.username;
        usernameInput.value = record.username;
        usernameInput.readOnly = true;
        passwordInput.value = "";
        passwordHint.textContent = "Leave blank to keep the current password.";
        roleSelect.value = record.role === "admin" ? "admin" : "user";
        grantFilter.value = "";
        applyGrantFilter();
        submitButton.textContent = "Save changes";
        cancelButton.hidden = false;
        hideAlert();
        accountForm.scrollIntoView({ block: "start", behavior: "smooth" });
        passwordInput.focus();
    }

    async function submitAccount(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const body = {
            role: roleSelect.value === "admin" ? "admin" : "user",
            games: selectedGames()
        };
        if (!editing) {
            if (!USERNAME_RE.test(username)) {
                showAlert("danger", USERNAME_HINT);
                usernameInput.focus();
                return;
            }
            if (password.length < PASSWORD_MIN_LENGTH) {
                showAlert("danger", PASSWORD_HINT);
                passwordInput.focus();
                return;
            }
            body.username = username;
        }
        if (password) body.password = password;

        submitButton.disabled = true;
        try {
            const data = editing
                ? await api("POST", "/api/auth/users/" + encodeURIComponent(editing), body)
                : await api("POST", "/api/auth/users", body);
            const saved = data.user && data.user.username ? data.user.username : (editing || username);
            showAlert("success", editing ? "Saved changes to \"" + saved + "\"." : "Created account \"" + saved + "\".");
            enterCreateMode();
            await refreshUsers();
        } catch (error) {
            reportError(error);
        } finally {
            submitButton.disabled = false;
        }
    }

    // ------------------------------------------------------------- account table

    function gamesCell(record) {
        const cell = document.createElement("td");
        const grant = record.games;
        if (grant === "*") {
            cell.textContent = "All games";
            cell.title = "All games, including games added later";
            return cell;
        }
        const ids = Array.isArray(grant) ? grant.map(String) : [];
        const titles = ids.map(function (id) {
            const game = catalogById.get(id);
            return game && game.title ? game.title : "unknown: " + id;
        });
        const count = document.createElement("span");
        count.textContent = ids.length + (ids.length === 1 ? " game" : " games");
        cell.appendChild(count);
        if (ids.length > 0 && ids.length <= 3) {
            const names = document.createElement("span");
            names.className = "local-subtle ms-1";
            names.textContent = "\u00b7 " + titles.join(", ");
            cell.appendChild(names);
        }
        cell.title = titles.length ? titles.join(", ") : "No games";
        return cell;
    }

    function actionButton(label, className, title, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-sm " + className;
        button.textContent = label;
        button.title = title;
        button.addEventListener("click", handler);
        return button;
    }

    async function toggleDisabled(record) {
        const disable = !record.disabled;
        if (disable && currentName && record.username === currentName &&
            !window.confirm("Disable your own account? You will be signed out immediately.")) {
            return;
        }
        try {
            const data = await api("POST", "/api/auth/users/" + encodeURIComponent(record.username),
                { disabled: disable });
            const name = data.user && data.user.username ? data.user.username : record.username;
            showAlert("success", "\"" + name + "\" is now " + (disable ? "disabled" : "active") + ".");
            await refreshUsers();
        } catch (error) {
            reportError(error);
        }
    }

    async function resetPassword(record) {
        const password = window.prompt("New password for \"" + record.username + "\":");
        if (password === null || password === "") return;
        if (password.length < PASSWORD_MIN_LENGTH) {
            showAlert("danger", PASSWORD_HINT);
            return;
        }
        try {
            await api("POST", "/api/auth/users/" + encodeURIComponent(record.username),
                { password: password });
            showAlert("success", "Password for \"" + record.username + "\" was changed.");
        } catch (error) {
            reportError(error);
        }
    }

    async function deleteUser(record) {
        if (!window.confirm("Delete the account \"" + record.username + "\"? This cannot be undone.")) return;
        try {
            await api("DELETE", "/api/auth/users/" + encodeURIComponent(record.username));
            if (editing === record.username) enterCreateMode();
            showAlert("success", "Deleted account \"" + record.username + "\".");
            await refreshUsers();
        } catch (error) {
            reportError(error);
        }
    }

    function renderUsers() {
        usersBody.replaceChildren();
        usersEmpty.hidden = users.length > 0;

        users.forEach(function (record) {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            const name = document.createElement("span");
            name.textContent = record.username;
            nameCell.appendChild(name);
            if (currentName && record.username === currentName) {
                const you = document.createElement("span");
                you.className = "badge ms-1 text-bg-light border";
                you.textContent = "you";
                nameCell.appendChild(you);
            }

            const roleCell = document.createElement("td");
            const role = document.createElement("span");
            role.className = "badge " + (record.role === "admin" ? "text-bg-primary" : "text-bg-secondary");
            role.textContent = record.role === "admin" ? "Administrator" : "User";
            roleCell.appendChild(role);

            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = "badge " + (record.disabled ? "text-bg-danger" : "text-bg-success");
            status.textContent = record.disabled ? "Disabled" : "Active";
            statusCell.appendChild(status);

            const createdCell = document.createElement("td");
            const seconds = Number(record.created);
            if (Number.isFinite(seconds) && seconds > 0) {
                const date = new Date(seconds * 1000);
                createdCell.textContent = date.toLocaleDateString();
                createdCell.title = date.toLocaleString();
            } else {
                createdCell.textContent = "-";
            }

            const actionsCell = document.createElement("td");
            actionsCell.className = "text-end";
            const group = document.createElement("div");
            group.className = "btn-group btn-group-sm";
            group.setAttribute("role", "group");
            group.setAttribute("aria-label", "Actions for " + record.username);
            group.appendChild(actionButton("Edit", "btn-outline-secondary",
                "Edit \"" + record.username + "\"", function () { startEdit(record); }));
            group.appendChild(actionButton(record.disabled ? "Enable" : "Disable",
                record.disabled ? "btn-outline-success" : "btn-outline-warning",
                (record.disabled ? "Enable" : "Disable") + " \"" + record.username + "\"",
                function () { toggleDisabled(record); }));
            group.appendChild(actionButton("Reset password", "btn-outline-secondary",
                "Set a new password for \"" + record.username + "\"", function () { resetPassword(record); }));
            group.appendChild(actionButton("Delete", "btn-outline-danger",
                "Delete \"" + record.username + "\"", function () { deleteUser(record); }));
            actionsCell.appendChild(group);

            row.appendChild(nameCell);
            row.appendChild(roleCell);
            row.appendChild(gamesCell(record));
            row.appendChild(statusCell);
            row.appendChild(createdCell);
            row.appendChild(actionsCell);
            usersBody.appendChild(row);
        });
    }

    async function refreshUsers() {
        const data = await api("GET", "/api/auth/users");
        users = Array.isArray(data.users) ? data.users : [];
        renderUsers();
    }

    // ------------------------------------------------------- own password

    async function submitOwnPassword(event) {
        event.preventDefault();
        const current = document.getElementById("password-current").value;
        const next = document.getElementById("password-new").value;
        const confirm = document.getElementById("password-confirm").value;
        if (!current) {
            showAlert("danger", "Enter your current password.");
            return;
        }
        if (!next) {
            showAlert("danger", "Enter a new password.");
            return;
        }
        if (next.length < PASSWORD_MIN_LENGTH) {
            showAlert("danger", PASSWORD_HINT);
            return;
        }
        if (next !== confirm) {
            showAlert("danger", "The new passwords do not match.");
            return;
        }
        const button = document.getElementById("password-submit");
        button.disabled = true;
        try {
            await api("POST", "/api/auth/password", { current: current, new: next });
            passwordForm.reset();
            showAlert("success", "Your password was changed.");
        } catch (error) {
            if (error && error.status >= 500) {
                // Keep the server's wording, but say which action failed.
                reportError(apiFailure("The server could not change the password: " + error.message,
                    error.status));
            } else {
                reportError(error);
            }
        } finally {
            button.disabled = false;
        }
    }

    // ------------------------------------------------------------ start-up

    function showAdminContent() {
        document.getElementById("admin-content").hidden = false;
    }

    function showNotAdmin() {
        alertBox.className = "alert alert-danger py-2";
        alertBox.replaceChildren();
        const text = document.createElement("span");
        text.textContent = "This page is only available to administrators. ";
        const link = document.createElement("a");
        link.href = "/";
        link.className = "alert-link";
        link.textContent = "Back to the game list";
        alertBox.appendChild(text);
        alertBox.appendChild(link);
        alertBox.hidden = false;
    }

    async function start() {
        if (site && typeof site.mountNav === "function") site.mountNav("admin");
        buildCatalogRows();
        enterCreateMode();

        let me;
        try {
            me = await api("GET", "/api/auth/me");
        } catch (error) {
            if (error && error.status === 401) {
                location.replace(LOGIN_URL);
                return;
            }
            reportError(error);
            return;
        }
        const user = me && me.user ? me.user : {};
        // serve.py's session payload can leave "name" null, in which case the
        // "you" badge and the self-disable warning are simply skipped.
        currentName = typeof user.name === "string" && user.name ? user.name : null;
        if (user.role !== "admin") {
            showNotAdmin();
            return;
        }
        showAdminContent();
        try {
            await refreshUsers();
        } catch (error) {
            reportError(error);
        }
    }

    grantModeInputs.forEach(function (input) {
        input.addEventListener("change", function () {
            grantSelectedArea.hidden = grantMode() !== "selected";
        });
    });
    grantFilter.addEventListener("input", applyGrantFilter);
    grantList.addEventListener("change", function (event) {
        if (event.target && event.target.type === "checkbox") updateGrantCount();
    });
    document.getElementById("grant-select-all").addEventListener("click", function () {
        allRows().forEach(function (row) { if (!row.hidden) row.input.checked = true; });
        updateGrantCount();
    });
    document.getElementById("grant-select-none").addEventListener("click", function () {
        allRows().forEach(function (row) { if (!row.hidden) row.input.checked = false; });
        updateGrantCount();
    });
    accountForm.addEventListener("submit", submitAccount);
    cancelButton.addEventListener("click", function () {
        enterCreateMode();
        hideAlert();
    });
    passwordForm.addEventListener("submit", submitOwnPassword);
    document.getElementById("sign-out").addEventListener("click", async function () {
        this.disabled = true;
        try {
            await api("POST", "/api/auth/logout");
        } catch (error) {
            console.error(error);   // sign out locally even if the call failed
        }
        location.replace("/login.html");
    });

    start();
})();
