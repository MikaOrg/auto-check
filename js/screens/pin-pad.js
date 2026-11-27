/* =====================================================================
   Ziffernfeld für die 4-stellige PIN (Mitarbeiter und Fahrzeuge).

   Nach der vierten Ziffer wird automatisch geprüft. Dafür ruft das Ziffernfeld
   onPinComplete(pin) des aktuellen Bildschirms auf (siehe login.js, vehicle.js).
   ===================================================================== */

import { PIN_LENGTH } from '../config.js';
import { $, escapeHtml } from '../helpers.js';
import { currentScreen, registerHandlers } from '../router.js';
import { session } from '../session.js';

let isChecking = false;

export function pinPadHtml(label) {
  const digitKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((digit) => `<button class="pin-key" data-action="pin-digit" data-digit="${digit}">${digit}</button>`)
    .join('');
  return `
    <div class="pin-pad">
      <div class="pin-label">${escapeHtml(label)}</div>
      <div class="pin-dots" id="pin-dots">${pinDotsHtml()}</div>
      <div class="pin-message" id="pin-message"></div>
      <div class="pin-keys">
        ${digitKeys}
        <span></span>
        <button class="pin-key" data-action="pin-digit" data-digit="0">0</button>
        <button class="pin-key pin-key-delete" data-action="pin-delete" aria-label="Letzte Ziffer löschen">⌫</button>
      </div>
    </div>`;
}

function pinDotsHtml() {
  let dots = '';
  for (let position = 0; position < PIN_LENGTH; position++) {
    dots += `<span class="pin-dot ${position < session.pinInput.length ? 'filled' : ''}"></span>`;
  }
  return dots;
}

function updateDots() {
  const dots = $('#pin-dots');
  if (dots) dots.innerHTML = pinDotsHtml();
}

export function showPinMessage(text) {
  const message = $('#pin-message');
  if (message) message.textContent = text;
}

/** Leert die Eingabe und zeigt eine Fehlermeldung, das Feld wackelt kurz. */
export function rejectPin(message) {
  session.pinInput = '';
  updateDots();
  showPinMessage(message);
  const pinPad = $('.pin-pad');
  if (pinPad) {
    pinPad.classList.remove('shake');
    void pinPad.offsetWidth; // Animation neu starten
    pinPad.classList.add('shake');
  }
}

/** Leert die Eingabe ohne Meldung, z. B. wenn im Dropdown ein anderer Name gewählt wird. */
export function resetPinPad() {
  session.pinInput = '';
  updateDots();
  showPinMessage('');
}

function addDigit(digit) {
  if (isChecking || session.pinInput.length >= PIN_LENGTH) return;
  session.pinInput += digit;
  updateDots();
  showPinMessage('');

  if (session.pinInput.length === PIN_LENGTH) {
    // Kurz warten, damit der vierte Punkt sichtbar gefüllt wird.
    // Nur prüfen, wenn sich in der Zwischenzeit nichts geändert hat.
    const screenAtInput = session.screen;
    setTimeout(() => {
      if (session.screen === screenAtInput && session.pinInput.length === PIN_LENGTH) submitPin();
    }, 150);
  }
}

function removeDigit() {
  if (isChecking) return;
  session.pinInput = session.pinInput.slice(0, -1);
  updateDots();
}

async function submitPin() {
  const screen = currentScreen();
  if (!screen.onPinComplete || isChecking) return;
  isChecking = true;
  try {
    await screen.onPinComplete(session.pinInput);
  } catch (error) {
    rejectPin(error.message);
  } finally {
    isChecking = false;
  }
}

/** Ziffern auch über eine angeschlossene Tastatur (z. B. Magic Keyboard) */
export function handlePinKeyboard(event) {
  if (!$('.pin-pad') || $('.dialog-backdrop')) return;
  const focusedTag = document.activeElement?.tagName;
  if (focusedTag === 'INPUT' || focusedTag === 'TEXTAREA') return;

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    addDigit(event.key);
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    removeDigit();
  }
}

registerHandlers({
  actions: {
    'pin-digit': (button) => addDigit(button.dataset.digit),
    'pin-delete': () => removeDigit()
  }
});
