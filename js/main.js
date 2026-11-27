/* =====================================================================
   Auto Check
   Startpunkt der App: lädt alle Bildschirme, verbindet Klicks und Eingaben
   mit den passenden Funktionen und startet die Hintergrundaufgaben.

   Überblick über die Dateien:
     config.js      alle Einstellungen
     helpers.js     kleine Hilfsfunktionen
     storage.js     Speichern und Laden der Daten
     security.js    PINs, Passwörter, Sperre nach Fehlversuchen
     session.js     wer ist angemeldet, was wurde angekreuzt
     router.js      Bildschirmwechsel und Zuordnung von Klicks
     dialog.js      Dialogfenster mit Formular
     email.js       E-Mail-Versand und Warteschlange
     backup.js      verschlüsselte Backups
     draft.js       Zwischenstand einer angefangenen Checkliste
     logout.js      Abmelden
     screens/       die einzelnen Bildschirme
   ===================================================================== */

import { IDLE_LOGOUT_MS } from './config.js';
import { onOutboxChanged, startOutboxWorker } from './email.js';
import { $ } from './helpers.js';
import { logout } from './logout.js';
import { getHandler, render, renderTopbar } from './router.js';
import { session } from './session.js';
import { handlePinKeyboard } from './screens/pin-pad.js';

// Jeder Bildschirm meldet sich beim Laden selbst an.
import './screens/login.js';
import './screens/vehicle.js';
import './screens/checklist.js';
import './screens/done.js';
import './screens/admin-login.js';
import './screens/admin.js';

/* ---------- Klicks und Eingaben weiterleiten ---------- */

function connectEvents() {
  // Knöpfe mit data-action="…"
  document.addEventListener('click', (event) => {
    const element = event.target.closest('[data-action]');
    if (!element || element.disabled) return;
    const handler = getHandler('action', element.dataset.action);
    if (!handler) return;
    event.preventDefault();
    Promise.resolve(handler(element)).catch(reportUnexpectedError);
  });

  // Formulare mit data-form="…"
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const handler = getHandler('form', form.dataset.form);
    if (handler) Promise.resolve(handler(form)).catch(reportUnexpectedError);
  });

  // Dropdowns und Dateiauswahl mit data-change="…"
  document.addEventListener('change', (event) => {
    const element = event.target.closest('[data-change]');
    const handler = element && getHandler('change', element.dataset.change);
    if (handler) Promise.resolve(handler(element)).catch(reportUnexpectedError);
  });

  // Textfelder mit data-input="…" (bei jedem Tastendruck)
  document.addEventListener('input', (event) => {
    const element = event.target.closest('[data-input]');
    const handler = element && getHandler('input', element.dataset.input);
    if (handler) handler(element);
  });

  // Ziffern über eine angeschlossene Tastatur
  document.addEventListener('keydown', handlePinKeyboard);
}

function reportUnexpectedError(error) {
  console.error(error);
  const toast = $('#toast');
  toast.textContent = `Unerwarteter Fehler: ${error.message}`;
  toast.className = 'toast visible error';
}

/* ---------- Automatisch abmelden bei Inaktivität ----------
   Das iPad wird von mehreren Leuten benutzt. Wer vergisst, sich abzumelden,
   wird nach einer Weile automatisch abgemeldet (Zeiten siehe config.js). */

function startIdleLogout() {
  let lastActivityAt = Date.now();
  const noteActivity = () => { lastActivityAt = Date.now(); };
  ['pointerdown', 'keydown', 'input', 'scroll'].forEach((eventName) =>
    document.addEventListener(eventName, noteActivity, { passive: true, capture: true }));

  setInterval(() => {
    const limit = IDLE_LOGOUT_MS[session.screen];
    if (limit && Date.now() - lastActivityAt > limit) {
      noteActivity();
      logout({ askBeforeDiscarding: false });
    }
  }, 10 * 1000);
}

/* ---------- Offline-Fähigkeit ---------- */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Wie Updates funktionieren, steht in sw.js.
  navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service Worker:', error));
}

/** iOS soll die Daten der App nicht bei Speicherknappheit löschen. */
function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

/* ---------- Start ---------- */

function showHttpsRequired() {
  $('#app').innerHTML = `
    <div class="narrow"><div class="card center">
      <h1>Sichere Verbindung nötig</h1>
      <p class="subtitle">Diese App muss über eine https-Adresse geöffnet werden, damit PINs, Passwörter und Backups geschützt sind.</p>
    </div></div>`;
}

// Ohne https stellt der Browser die Verschlüsselungsfunktionen nicht bereit.
if (!window.isSecureContext || !window.crypto?.subtle) {
  showHttpsRequired();
} else {
  connectEvents();
  onOutboxChanged(renderTopbar); // "Mails ausstehend" oben aktuell halten
  render();
  startOutboxWorker();
  startIdleLogout();
  registerServiceWorker();
  requestPersistentStorage();
}
