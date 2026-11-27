/* =====================================================================
   Zugang zum Admin-Bereich.

   Beim allerersten Start gibt es noch kein Admin-Passwort: Dann erscheint
   "Admin-Passwort festlegen". Danach wird immer das Passwort abgefragt.
   ===================================================================== */

import { PASSWORD_MIN_LENGTH, TEXT_MAX_LENGTH } from '../config.js';
import { $, showToast } from '../helpers.js';
import { registerHandlers, registerScreen, showScreen } from '../router.js';
import { createStoredSecret, findPasswordProblem, verifySecret } from '../security.js';
import { saveData, store } from '../storage.js';

const passwordInput = (name, id, autocomplete) =>
  `<input type="password" id="${id}" name="${name}" autocomplete="${autocomplete}" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="${TEXT_MAX_LENGTH}">`;

const backToLogin = '<button class="link-button" data-action="back-to-login">← Zurück zur Anmeldung</button>';

function renderAdminLogin() {
  return `
    <div class="narrow stack">
      <form class="card" data-form="admin-login">
        <h1>Admin-Bereich</h1>
        <p class="subtitle">Bitte das Admin-Passwort eingeben.</p>
        <label for="admin-password">Admin-Passwort</label>
        ${passwordInput('password', 'admin-password', 'current-password')}
        <div class="form-error" id="admin-message"></div>
        <div class="button-row"><button class="button button-primary button-large" type="submit">Öffnen</button></div>
      </form>
      ${backToLogin}
    </div>`;
}

function renderAdminSetup() {
  return `
    <div class="narrow stack">
      <form class="card" data-form="admin-setup">
        <h1>Admin-Passwort festlegen</h1>
        <p class="subtitle">Dieses Passwort schützt den Admin-Bereich. Bitte gut merken, es lässt sich nicht zurücksetzen.</p>
        <label for="admin-password-new">Neues Admin-Passwort</label>
        ${passwordInput('password', 'admin-password-new', 'new-password')}
        <div class="hint">Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.</div>
        <label for="admin-password-repeat">Passwort wiederholen</label>
        ${passwordInput('repeatedPassword', 'admin-password-repeat', 'new-password')}
        <div class="form-error" id="admin-message"></div>
        <div class="button-row"><button class="button button-primary button-large" type="submit">Speichern</button></div>
      </form>
      ${backToLogin}
    </div>`;
}

let isChecking = false;

async function submitAdminLogin(form) {
  if (isChecking) return;
  isChecking = true;
  try {
    const errorMessage = await verifySecret('admin', form.elements.password.value, store.data.settings.adminPassword, 'Passwort');
    if (errorMessage) {
      $('#admin-message').textContent = errorMessage;
      form.elements.password.value = '';
      return;
    }
    showScreen('admin');
  } finally {
    isChecking = false;
  }
}

async function submitAdminSetup(form) {
  // Nur beim allerersten Start erlaubt. Sonst könnte man hierüber das Passwort überschreiben.
  if (store.data.settings.adminPassword) return showScreen('adminLogin');
  if (isChecking) return;

  const password = form.elements.password.value;
  const problem = findPasswordProblem(password, form.elements.repeatedPassword.value);
  if (problem) {
    $('#admin-message').textContent = problem;
    return;
  }

  isChecking = true;
  try {
    store.data.settings.adminPassword = await createStoredSecret(password);
    saveData();
    showToast('Admin-Passwort gespeichert.');
    showScreen('admin');
  } finally {
    isChecking = false;
  }
}

registerScreen('adminLogin', { render: renderAdminLogin });
registerScreen('adminSetup', { render: renderAdminSetup });

registerHandlers({
  actions: {
    'open-admin': () => showScreen(store.data.settings.adminPassword ? 'adminLogin' : 'adminSetup'),
    'back-to-login': () => showScreen('login')
  },
  forms: {
    'admin-login': submitAdminLogin,
    'admin-setup': submitAdminSetup
  }
});
