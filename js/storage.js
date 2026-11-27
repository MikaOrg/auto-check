/* =====================================================================
   Speichern und Laden aller Daten.

   Es gibt keinen Server: Alles liegt im Speicher dieses iPads (localStorage).
   Aufbau der Daten:

   store.data.settings.companyName     Firmenname für Kopfzeile und E-Mail (optional)
   store.data.settings.adminPassword   { salt, hash, iterations } oder null
   store.data.settings.lastBackupAt    Zeitpunkt des letzten Backups oder ''
   store.data.settings.emailjs         { serviceId, templateId, publicKey }
   store.data.employees                [{ id, name, pin }]
   store.data.vehicleTypes             [{ id, name, checkItems: [{ id, text }] }]
   store.data.vehicles                 [{ id, plate, typeId, pin }]
   store.outbox                        Checklisten, deren E-Mail noch aussteht

   PINs und Passwörter werden nie im Klartext gespeichert, nur als Hash (siehe security.js).
   ===================================================================== */

import { STORAGE_KEYS } from './config.js';
import { createId, showError } from './helpers.js';

/* ---------- Lesen und Schreiben ---------- */

export function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Gibt false zurück, wenn das Speichern fehlschlägt (z. B. Speicher voll). */
export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try { localStorage.removeItem(key); } catch { /* nichts zu tun */ }
}

/* ---------- Bereinigen ----------
   Alles, was geladen wird (auch aus Backups), läuft durch diese Funktionen.
   Falsche Datentypen, fehlende Felder und unsichere IDs werden repariert,
   damit eine kaputte oder manipulierte Datei die App nicht durcheinanderbringt. */

export const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const asText = (value) => (typeof value === 'string' ? value.trim() : '');
const asObjectList = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : []);

// IDs landen in HTML-Attributen, deshalb sind nur harmlose Zeichen erlaubt.
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const asSafeId = (value) => (typeof value === 'string' && SAFE_ID_PATTERN.test(value) ? value : createId());

/** Ein gespeicherter PIN- oder Passwort-Hash, sonst null */
function asStoredSecret(value) {
  if (!isPlainObject(value)) return null;
  const { salt, hash, iterations } = value;
  const isValid = typeof salt === 'string' && typeof hash === 'string'
    && Number.isInteger(iterations) && iterations >= 1000 && iterations <= 5000000;
  return isValid ? { salt, hash, iterations } : null;
}

export function sanitizeData(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const settings = isPlainObject(source.settings) ? source.settings : {};
  const emailjs = isPlainObject(settings.emailjs) ? settings.emailjs : {};

  // Fahrzeugtypen bekommen eventuell neue IDs; die Fahrzeuge werden passend umgehängt.
  const newTypeIds = new Map();
  const vehicleTypes = asObjectList(source.vehicleTypes).map((type) => {
    const id = asSafeId(type.id);
    newTypeIds.set(type.id, id);
    return {
      id,
      name: asText(type.name),
      checkItems: asObjectList(type.checkItems).map((item) => ({ id: asSafeId(item.id), text: asText(item.text) }))
    };
  });

  return {
    settings: {
      companyName: asText(settings.companyName),
      adminPassword: asStoredSecret(settings.adminPassword),
      lastBackupAt: asText(settings.lastBackupAt),
      emailjs: {
        serviceId: asText(emailjs.serviceId),
        templateId: asText(emailjs.templateId),
        publicKey: asText(emailjs.publicKey)
      }
    },
    employees: asObjectList(source.employees).map((employee) => ({
      id: asSafeId(employee.id),
      name: asText(employee.name),
      pin: asStoredSecret(employee.pin)
    })),
    vehicleTypes,
    vehicles: asObjectList(source.vehicles).map((vehicle) => ({
      id: asSafeId(vehicle.id),
      plate: asText(vehicle.plate),
      typeId: newTypeIds.get(vehicle.typeId) || '',
      pin: asStoredSecret(vehicle.pin)
    }))
  };
}

export function sanitizeOutbox(raw) {
  return asObjectList(raw).map((report) => ({
    id: asSafeId(report.id),
    createdAt: asText(report.createdAt),
    employeeName: asText(report.employeeName),
    plate: asText(report.plate),
    vehicleTypeName: asText(report.vehicleTypeName),
    results: asObjectList(report.results).map((result) => ({
      text: asText(result.text),
      status: result.status === 'bad' ? 'bad' : 'ok',
      note: asText(result.note)
    })),
    attempts: Number.isInteger(report.attempts) ? report.attempts : 0,
    lastError: asText(report.lastError),
    lastErrorWasTemporary: report.lastErrorWasTemporary === true
  }));
}

/* ---------- Der aktuelle Datenbestand ---------- */

export const store = {
  data: sanitizeData(readJson(STORAGE_KEYS.data)),
  outbox: sanitizeOutbox(readJson(STORAGE_KEYS.outbox))
};

const SAVE_FAILED = 'Speichern fehlgeschlagen. Ist der Speicher des iPads voll?';

export function saveData() {
  if (!writeJson(STORAGE_KEYS.data, store.data)) showError(SAVE_FAILED);
}

export function saveOutbox() {
  if (!writeJson(STORAGE_KEYS.outbox, store.outbox)) showError(SAVE_FAILED);
}

/** Ersetzt alle Daten, z. B. beim Einspielen eines Backups. */
export function replaceAllData(rawData, rawOutbox) {
  store.data = sanitizeData(rawData);
  store.outbox = sanitizeOutbox(rawOutbox);
  saveData();
  saveOutbox();
}

/* ---------- Nachschlagen ---------- */

export const findEmployee = (id) => store.data.employees.find((employee) => employee.id === id);
export const findVehicle = (id) => store.data.vehicles.find((vehicle) => vehicle.id === id);
export const findVehicleType = (id) => store.data.vehicleTypes.find((type) => type.id === id);
