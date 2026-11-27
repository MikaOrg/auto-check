/* =====================================================================
   Navigation: welcher Bildschirm angezeigt wird und wer auf Klicks reagiert.

   Jeder Bildschirm meldet sich hier mit registerScreen() an und liefert
   eine render()-Funktion, die das HTML zurückgibt.

   Knöpfe und Formulare im HTML tragen Kennzeichen wie data-action="open-admin".
   Die passenden Funktionen werden mit registerHandlers() angemeldet;
   main.js leitet Klicks und Eingaben dann an sie weiter.
   ===================================================================== */

import { APP_NAME } from './config.js';
import { $, countLabel, escapeHtml } from './helpers.js';
import { session } from './session.js';
import { store } from './storage.js';

const screens = {};
const handlers = { action: {}, form: {}, change: {}, input: {} };

/**
 * @param name    Name des Bildschirms, z. B. "login"
 * @param screen  { render(), afterRender?(), onPinComplete?(pin), hasFooter? }
 */
export function registerScreen(name, screen) {
  screens[name] = screen;
}

/**
 * @param actions  data-action="…"  → Funktion(element), bei Klick
 * @param forms    data-form="…"    → Funktion(form), beim Absenden
 * @param changes  data-change="…"  → Funktion(element), bei Auswahl im Dropdown
 * @param inputs   data-input="…"   → Funktion(element), bei jeder Texteingabe
 */
export function registerHandlers({ actions = {}, forms = {}, changes = {}, inputs = {} }) {
  Object.assign(handlers.action, actions);
  Object.assign(handlers.form, forms);
  Object.assign(handlers.change, changes);
  Object.assign(handlers.input, inputs);
}

/** Wird von main.js aufgerufen. type ist "action", "form", "change" oder "input". */
export function getHandler(type, name) {
  return handlers[type][name];
}

export function currentScreen() {
  return screens[session.screen];
}

/** Zeichnet den aktuellen Bildschirm neu. */
export function render() {
  const screen = currentScreen();
  const app = $('#app');
  app.className = screen.hasFooter ? 'with-footer' : '';
  app.innerHTML = screen.render();
  renderTopbar();
  if (screen.afterRender) screen.afterRender();
}

/** Wechselt zu einem anderen Bildschirm. */
export function showScreen(name) {
  session.screen = name;
  session.pinInput = '';
  render();
  window.scrollTo(0, 0);
}

/** Kopfzeile: Name der App, Hinweise (offline, ausstehende Mails), angemeldeter Mitarbeiter. */
export function renderTopbar() {
  const parts = [];
  if (!navigator.onLine) parts.push('<span class="pill-warning">Offline</span>');

  const waitingMails = store.outbox.length;
  if (waitingMails) parts.push(`<span class="pill-warning">${countLabel(waitingMails, 'Mail', 'Mails')} ausstehend</span>`);

  const employeeScreens = ['vehicle', 'checklist', 'done'];
  if (session.employee && employeeScreens.includes(session.screen)) {
    parts.push(`<span class="topbar-user">${escapeHtml(session.employee.name)}</span>`);
    parts.push('<button class="button button-small" data-action="logout">Abmelden</button>');
  }

  // Firmenname aus dem Admin-Bereich, z. B. "Auto Check - Musterfirma"
  const { companyName } = store.data.settings;
  const title = companyName ? `${APP_NAME} - ${companyName}` : APP_NAME;
  document.title = title;

  $('#topbar').innerHTML = `
    <div class="brand"><img src="icons/icon-180.png" alt=""><span>${escapeHtml(title)}</span></div>
    <div class="topbar-right">${parts.join('')}</div>`;
}
