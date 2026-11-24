import './style.css';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, onValue, ref, set, update } from 'firebase/database';
import { firebaseConfig, firebaseReady, paths } from './config.js';

const $ = (id) => document.getElementById(id);
const now = () => Date.now();
let local = {};
try { local = JSON.parse(localStorage.getItem('tanque-iot-settings') || '{}'); }
catch { localStorage.removeItem('tanque-iot-settings'); }
const state = {
  demo: !firebaseReady,
  connected: false,
  reads: { level: false, pump: false },
  user: null,
  busy: false,
  level: null,
  pumpOn: null,
  mode: firebaseReady ? null : 'manual',
  updatedAt: null,
  controlMin: 20,
  controlMax: 90,
  alertLow: Number.isFinite(local.alertLow) ? local.alertLow : 20,
  alertHigh: Number.isFinite(local.alertHigh) ? local.alertHigh : 90,
  capacity: Number.isFinite(local.capacity) ? local.capacity : null,
  notifications: Boolean(local.notifications),
  units: local.units === 'liters' ? 'liters' : 'percent',
  history: [],
  events: [],
  readAlerts: new Set(),
  filters: { dates: '24h', type: 'all' },
};
let auth;
let database;
let unsubscribers = [];

function notice(message, kind = '') {
  $('notice').textContent = message;
  $('notice').className = `notice ${kind}`.trim();
}

function numberBetween(value, min, max) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function pumpValue(value) {
  return value === true || value === 1 ? true : value === false || value === 0 ? false : null;
}

function modeValue(value) {
  if (value === 'automatic' || value === 'automatico' || value === 'automático') return 'automatic';
  if (value === 'manual') return 'manual';
  return null;
}

function timestamp(value) {
  if (typeof value === 'number') return value < 1e11 ? value * 1000 : value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function timeText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function displayLevel() {
  if (state.level == null) return ['--', state.units === 'liters' && state.capacity ? 'L' : '%'];
  if (state.units === 'liters' && state.capacity) return [(state.level * state.capacity / 100).toFixed(1), 'L'];
  return [String(Math.round(state.level)), '%'];
}

function recordEvent(type, title, detail = '') {
  if (!state.demo && paths.events) return;
  state.events.unshift({ type, title, detail, at: now() });
  state.events = state.events.slice(0, 100);
}

function addReading(level, at = now()) {
  state.history.push({ level, at });
  state.history = state.history.slice(-500);
}

function alertItems() {
  if (state.level == null) return state.demo ? [] : [{ id: 'sensor', title: 'Sin lectura del sensor', detail: 'Revisa la conexión y la ruta de nivel.' }];
  const items = [];
  if (state.level <= state.alertLow) items.push({ id: 'low', title: 'Nivel de agua bajo', detail: `${Math.round(state.level)}% está por debajo del límite de ${state.alertLow}%.` });
  if (state.level >= state.alertHigh) items.push({ id: 'high', title: 'Nivel de agua alto', detail: `${Math.round(state.level)}% alcanzó el límite de ${state.alertHigh}%.` });
  return items;
}

function checkNewAlerts(previous) {
  const current = alertItems();
  for (const alert of current) {
    if (!previous.includes(alert.id)) {
      state.readAlerts.delete(alert.id);
      recordEvent('alert', alert.title, alert.detail);
      if (state.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(alert.title, { body: alert.detail });
      }
    }
  }
}

function renderChart() {
  const cutoff = state.filters.dates === '24h' ? now() - 86400000 : state.filters.dates === '7d' ? now() - 604800000 : 0;
  const entries = state.history.filter((item) => item.at >= cutoff);
  $('history-count').textContent = `${entries.length} ${entries.length === 1 ? 'lectura' : 'lecturas'}`;
  const chart = $('history-chart');
  chart.replaceChildren();
  $('chart-start').textContent = entries.length ? dateText(entries[0].at) : '—';
  $('chart-end').textContent = entries.length ? dateText(entries.at(-1).at) : '—';
  if (!entries.length) return;
  const values = entries.slice(-100);
  const points = values.map((item, index) => `${values.length === 1 ? 300 : index * 600 / (values.length - 1)},${240 - item.level * 2.4}`);
  const ns = 'http://www.w3.org/2000/svg';
  const area = document.createElementNS(ns, 'polygon');
  area.setAttribute('points', `0,240 ${points.join(' ')} 600,240`);
  area.setAttribute('fill', '#43bdd62e');
  chart.append(area);
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', points.join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#168db2');
  line.setAttribute('stroke-width', '4');
  line.setAttribute('stroke-linejoin', 'round');
  chart.append(line);
  const [x, y] = points.at(-1).split(',');
  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', x);
  dot.setAttribute('cy', y);
  dot.setAttribute('r', '6');
  dot.setAttribute('fill', '#073c50');
  chart.append(dot);
}

function renderEvents() {
  const list = $('events-list');
  list.replaceChildren();
  const cutoff = state.filters.dates === '24h' ? now() - 86400000 : state.filters.dates === '7d' ? now() - 604800000 : 0;
  const events = state.events.filter((event) => event.at >= cutoff && (state.filters.type === 'all' || event.type === state.filters.type)).slice(0, 8);
  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No hay eventos en este rango. Prueba otro filtro.';
    list.append(empty);
    return;
  }
  const icons = { level: 'icon-drop', pump: 'icon-power', mode: 'icon-control', alert: 'icon-bell', settings: 'icon-settings' };
  for (const event of events) {
    const row = document.createElement('div');
    row.className = 'event';
    const icon = document.createElement('span');
    icon.className = 'event-icon';
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    symbol.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${icons[event.type] || 'icon-history'}`);
    symbol.append(use);
    icon.append(symbol);
    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.title;
    const detail = document.createElement('small');
    detail.textContent = event.detail;
    body.append(title, detail);
    const time = document.createElement('time');
    time.dateTime = new Date(event.at).toISOString();
    time.textContent = timeText(event.at);
    row.append(icon, body, time);
    list.append(row);
  }
}

function renderAlerts() {
  const list = $('alerts-list');
  list.replaceChildren();
  const alerts = alertItems();
  $('alert-count').textContent = `${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}`;
  if (!alerts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-check');
    icon.append(use);
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Sin alertas activas';
    const detail = document.createElement('small');
    detail.textContent = 'El nivel está dentro de los límites configurados.';
    text.append(title, detail);
    empty.append(icon, text);
    list.append(empty);
    return;
  }
  for (const alert of alerts) {
    const row = document.createElement('div');
    row.className = `alert-item ${state.readAlerts.has(alert.id) ? 'read' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'alert-icon';
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    symbol.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-bell');
    symbol.append(use);
    icon.append(symbol);
    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = alert.title;
    const detail = document.createElement('small');
    detail.textContent = alert.detail;
    body.append(title, detail);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = state.readAlerts.has(alert.id) ? 'Leída' : 'Marcar leída';
    button.disabled = state.readAlerts.has(alert.id);
    button.addEventListener('click', () => { state.readAlerts.add(alert.id); renderAlerts(); });
    row.append(icon, body, button);
    list.append(row);
  }
}

function render() {
  const live = !state.demo;
  $('mode-badge').textContent = live ? 'Firebase en tiempo real' : 'Demostración';
  $('mode-badge').className = `badge ${live ? 'live' : 'demo'}`;
  $('home-live-label').className = `live-label ${live ? state.connected ? 'live' : 'error' : ''}`.trim();
  $('home-live-label').hidden = state.demo;
  $('home-live-label').lastChild.textContent = live ? state.connected ? 'Conectado a Firebase' : 'Esperando datos' : 'Datos de demostración';
  const [amount, unit] = displayLevel();
  $('level-value').textContent = amount;
  $('level-value').nextElementSibling.textContent = unit;
  $('water').style.height = `${state.level ?? 0}%`;
  $('level-progress').style.width = `${state.level ?? 0}%`;
  const levelState = state.level == null ? 'Sin lectura' : state.level <= state.alertLow ? 'Bajo' : state.level >= state.alertHigh ? 'Alto' : 'Normal';
  $('level-pill').textContent = levelState;
  $('level-pill').className = `pill ${levelState === 'Bajo' ? 'low' : levelState === 'Alto' ? 'high' : ''}`.trim();
  $('level-description').textContent = state.level == null ? 'Esperando datos' : `${Math.round(state.level)}% de capacidad`;
  const pumpText = state.pumpOn == null ? 'Sin lectura' : state.pumpOn ? 'Encendida' : 'Apagada';
  $('pump-value').textContent = pumpText;
  $('pump-description').textContent = state.pumpOn == null ? 'Aún no se mide el estado físico de la bomba.' : state.pumpOn ? 'Operando normalmente' : 'La bomba está detenida';
  $('pump-light').className = `pump-light ${state.pumpOn == null ? '' : state.pumpOn ? 'on' : 'off'}`.trim();
  $('pump-detail').textContent = state.demo ? 'Estado simulado' : state.pumpOn == null ? 'Sin señal física de la bomba' : 'Estado confirmado por Firebase';
  $('connection-text').textContent = state.demo ? 'Demostración' : state.connected ? 'Conectado' : 'Sin lectura';
  $('connection-detail').textContent = state.demo ? 'Valores simulados' : state.connected ? 'Firebase Realtime Database' : 'Esperando la primera medición';
  $('last-update').textContent = state.updatedAt == null ? '—' : timeText(state.updatedAt);
  $('last-update').previousElementSibling.textContent = state.demo || paths.updatedAt ? 'ÚLTIMA LECTURA' : 'DATO RECIBIDO';
  $('update-detail').textContent = state.updatedAt == null ? 'Esperando datos' : dateText(state.updatedAt);
  const modeText = state.mode == null ? 'No disponible' : state.mode === 'automatic' ? 'Automático' : 'Manual';
  $('mode-value').textContent = modeText;
  $('control-mode').textContent = modeText;
  $('mode-detail').textContent = live && !paths.mode ? 'Ruta de modo no configurada' : 'Control de la bomba';
  $('control-level').textContent = `${amount}${unit}`;
  $('control-pump').textContent = pumpText;
  $('mode-auto').classList.toggle('active', state.mode === 'automatic');
  $('mode-manual').classList.toggle('active', state.mode === 'manual');
  $('mode-auto').setAttribute('aria-pressed', String(state.mode === 'automatic'));
  $('mode-manual').setAttribute('aria-pressed', String(state.mode === 'manual'));
  const canSetMode = state.demo || (state.connected && state.user && !state.user.isAnonymous && paths.mode);
  $('mode-auto').disabled = !canSetMode || state.busy || state.mode === 'automatic';
  $('mode-manual').disabled = !canSetMode || state.busy || state.mode === 'manual';
  $('home-manual').disabled = !canSetMode || state.busy || state.mode === 'manual';
  $('mode-help').textContent = live && !paths.mode ? 'Falta VITE_MODE_PATH para cambiar el modo desde esta web.' : 'En modo automático, el ESP32 decide cuándo activar la bomba según sus reglas.';
  const canPump = state.demo || (state.connected && state.user && !state.user.isAnonymous && paths.pumpCommand);
  const pumpAllowed = canPump && state.mode !== 'automatic' && !state.busy;
  for (const id of ['home-pump-on', 'control-pump-on']) $(id).disabled = !pumpAllowed || state.pumpOn === true;
  for (const id of ['home-pump-off', 'control-pump-off']) $(id).disabled = !pumpAllowed || state.pumpOn === false;
  const pumpHelp = state.demo ? 'Los botones solo cambian la simulación.' : !paths.pumpCommand ? 'La bomba aún no está conectada al ESP32.' : !state.user ? 'Inicia sesión para enviar órdenes.' : state.mode === 'automatic' ? 'Cambia a modo manual para enviar una orden.' : 'El ESP32 debe confirmar el estado real de la bomba.';
  $('home-action-help').textContent = pumpHelp;
  $('control-help').textContent = pumpHelp;
  const canSaveControl = state.demo || (state.connected && state.user && !state.user.isAnonymous && paths.controlMin && paths.controlMax);
  $('save-control-thresholds').disabled = !canSaveControl || state.busy;
  $('threshold-help').textContent = live && (!paths.controlMin || !paths.controlMax) ? 'Faltan las rutas de umbrales del ESP32 en Firebase.' : 'Ejemplo: encender por debajo del mínimo y detener al llegar al máximo.';
  const canSaveSettings = state.demo || (state.connected && state.user && !state.user.isAnonymous && paths.alertLow && paths.alertHigh);
  $('save-settings').disabled = !canSaveSettings || state.busy;
  $('notifications').disabled = !('Notification' in window);
  $('settings-help').textContent = state.demo ? 'Los ajustes de demostración se guardan en este navegador.' : !state.user ? 'Inicia sesión para guardar ajustes.' : !paths.alertLow || !paths.alertHigh ? 'Faltan las rutas de alertas en Firebase.' : 'Los límites se guardan en Firebase; unidades y avisos se guardan en este navegador.';
  $('history-source').textContent = state.demo ? 'Lecturas ilustrativas de la presentación.' : paths.history ? 'Historial leído de Firebase.' : 'Solo se registran lecturas mientras esta página está abierta. Configura VITE_HISTORY_PATH para consultar datos anteriores.';
  renderChart();
  renderEvents();
  renderAlerts();
}

function syncForms() {
  $('control-min').value = state.controlMin;
  $('control-max').value = state.controlMax;
  $('control-min-output').textContent = `${state.controlMin}%`;
  $('control-max-output').textContent = `${state.controlMax}%`;
  $('alert-low').value = state.alertLow;
  $('alert-high').value = state.alertHigh;
  $('capacity').value = state.capacity ?? '';
  $('notifications').checked = state.notifications;
  $('units').value = state.units;
}

function saveLocalSettings() {
  localStorage.setItem('tanque-iot-settings', JSON.stringify({
    alertLow: state.alertLow, alertHigh: state.alertHigh, capacity: state.capacity,
    notifications: state.notifications, units: state.units,
  }));
}

function readError(error) {
  state.connected = false;
  notice(`No se pudieron leer datos de Firebase: ${error.message}`, 'error');
  render();
}

function subscribeOptional(path, callback) {
  if (!path) return;
  unsubscribers.push(onValue(ref(database, path), (snapshot) => callback(snapshot.val()),
    (error) => notice(`No se pudo leer la ruta opcional ${path}: ${error.message}`, 'error')));
}

function normalizeRecords(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : typeof value === 'object' ? Object.values(value) : [];
}

function subscribe() {
  unsubscribers.forEach((stop) => stop());
  unsubscribers = [];
  state.connected = false;
  state.reads = { level: false, pump: false };
  state.level = null;
  state.pumpOn = null;
  state.history = [];
  state.events = [];
  state.mode = null;
  const check = () => {
    const wasConnected = state.connected;
    state.connected = state.reads.level;
    if (state.connected && !wasConnected) notice('Lecturas recibidas de Firebase.', 'success');
    render();
  };
  unsubscribers.push(onValue(ref(database, paths.level), (snapshot) => {
    const level = numberBetween(snapshot.val(), 0, 100);
    if (level == null) {
      state.reads.level = false;
      state.level = null;
      notice(snapshot.val() == null ? 'Esperando la primera lectura del ESP32.' : 'La lectura del sensor no es un porcentaje válido.', snapshot.val() == null ? '' : 'error');
      return check();
    }
    const previousAlerts = alertItems().map((item) => item.id);
    state.level = level;
    if (!paths.history) addReading(level);
    if (!paths.updatedAt) state.updatedAt = now();
    state.reads.level = true;
    checkNewAlerts(previousAlerts);
    check();
  }, readError));
  if (paths.pumpState) unsubscribers.push(onValue(ref(database, paths.pumpState), (snapshot) => {
    const pump = pumpValue(snapshot.val());
    if (pump == null) { state.reads.pump = false; state.pumpOn = null; return render(); }
    if (state.pumpOn != null && state.pumpOn !== pump) recordEvent('pump', pump ? 'Bomba encendida' : 'Bomba apagada', 'Estado confirmado por el ESP32');
    state.pumpOn = pump;
    state.reads.pump = true;
    check();
  }, readError));
  subscribeOptional(paths.updatedAt, (value) => { state.updatedAt = timestamp(value); render(); });
  subscribeOptional(paths.mode, (value) => { state.mode = modeValue(value); render(); });
  subscribeOptional(paths.controlMin, (value) => { state.controlMin = numberBetween(value, 0, 99) ?? state.controlMin; syncForms(); render(); });
  subscribeOptional(paths.controlMax, (value) => { state.controlMax = numberBetween(value, 1, 100) ?? state.controlMax; syncForms(); render(); });
  subscribeOptional(paths.alertLow, (value) => { state.alertLow = numberBetween(value, 0, 99) ?? state.alertLow; syncForms(); render(); });
  subscribeOptional(paths.alertHigh, (value) => { state.alertHigh = numberBetween(value, 1, 100) ?? state.alertHigh; syncForms(); render(); });
  subscribeOptional(paths.capacity, (value) => { state.capacity = numberBetween(value, 0.1, 1e9); syncForms(); render(); });
  subscribeOptional(paths.history, (value) => {
    state.history = normalizeRecords(value).map((item) => ({ level: numberBetween(item?.level, 0, 100), at: timestamp(item?.timestamp) })).filter((item) => item.level != null && item.at != null).sort((a, b) => a.at - b.at).slice(-500);
    render();
  });
  subscribeOptional(paths.events, (value) => {
    state.events = normalizeRecords(value).map((item) => ({ type: item?.type, title: item?.title, detail: item?.detail || '', at: timestamp(item?.timestamp) })).filter((item) => item.title && item.at != null).sort((a, b) => b.at - a.at).slice(0, 100);
    render();
  });
  render();
}

async function commandPump(on) {
  if (state.mode === 'automatic') return;
  if (state.demo) {
    state.pumpOn = on;
    recordEvent('pump', on ? 'Bomba encendida' : 'Bomba apagada', 'Acción de demostración');
    notice(`Simulación: bomba ${on ? 'encendida' : 'apagada'}.`, 'success');
    render();
    return;
  }
  if (!state.connected || !state.user || !paths.pumpCommand || state.busy) return;
  state.busy = true; render();
  try {
    await set(ref(database, paths.pumpCommand), on);
    notice(`Orden de ${on ? 'encendido' : 'apagado'} enviada. Esperando confirmación del ESP32.`, 'success');
  } catch (error) { notice(`No se pudo enviar la orden: ${error.message}`, 'error'); }
  finally { state.busy = false; render(); }
}

async function setMode(mode) {
  if (state.demo) {
    state.mode = mode;
    recordEvent('mode', `Modo ${mode === 'automatic' ? 'automático' : 'manual'}`, 'Cambio de demostración');
    notice(`Simulación: modo ${mode === 'automatic' ? 'automático' : 'manual'}.`, 'success');
    render();
    return;
  }
  if (!state.connected || !state.user || !paths.mode || state.busy) return;
  state.busy = true; render();
  try { await set(ref(database, paths.mode), mode); notice('Cambio de modo enviado a Firebase. Esperando confirmación del ESP32.', 'success'); }
  catch (error) { notice(`No se pudo cambiar el modo: ${error.message}`, 'error'); }
  finally { state.busy = false; render(); }
}

function showPage() {
  const page = ['inicio', 'control', 'historial', 'alertas'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
  for (const name of ['inicio', 'control', 'historial', 'alertas']) $(`page-${name}`).hidden = name !== page;
  document.querySelectorAll('.bottom-nav a').forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

function exportCsv() {
  const rows = [['fecha', 'tipo', 'detalle', 'nivel_porcentaje']];
  for (const item of state.history) rows.push([new Date(item.at).toISOString(), 'nivel', 'Lectura de nivel', item.level]);
  for (const item of state.events) rows.push([new Date(item.at).toISOString(), item.type, `${item.title}: ${item.detail}`, '']);
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte_tanque_agua.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('Reporte CSV descargado con los datos disponibles en la web.', 'success');
}

for (const id of ['home-pump-on', 'control-pump-on']) $(id).addEventListener('click', () => commandPump(true));
for (const id of ['home-pump-off', 'control-pump-off']) $(id).addEventListener('click', () => commandPump(false));
$('home-manual').addEventListener('click', () => setMode('manual'));
$('mode-auto').addEventListener('click', () => setMode('automatic'));
$('mode-manual').addEventListener('click', () => setMode('manual'));
$('control-min').addEventListener('input', () => { $('control-min-output').textContent = `${$('control-min').value}%`; });
$('control-max').addEventListener('input', () => { $('control-max-output').textContent = `${$('control-max').value}%`; });
$('save-control-thresholds').addEventListener('click', async () => {
  const min = Number($('control-min').value);
  const max = Number($('control-max').value);
  if (min >= max) return notice('El nivel mínimo debe ser menor que el máximo.', 'error');
  if (state.demo) {
    state.controlMin = min; state.controlMax = max;
    recordEvent('settings', 'Umbrales de control guardados', `${min}%–${max}% (demostración)`);
    notice('Umbrales de control guardados en la demostración.', 'success');
    return render();
  }
  if (!state.connected || !state.user || !paths.controlMin || !paths.controlMax) return;
  state.busy = true; render();
  try { await update(ref(database), { [paths.controlMin]: min, [paths.controlMax]: max }); notice('Umbrales enviados a Firebase.', 'success'); }
  catch (error) { notice(`No se pudieron guardar los umbrales: ${error.message}`, 'error'); }
  finally { state.busy = false; render(); }
});
$('settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const low = Number($('alert-low').value);
  const high = Number($('alert-high').value);
  const capacity = $('capacity').value === '' ? null : Number($('capacity').value);
  const units = $('units').value;
  if (low >= high) return notice('La alerta de bajo nivel debe ser menor que la de alto nivel.', 'error');
  if (units === 'liters' && !capacity) return notice('Indica la capacidad del tanque para mostrar litros.', 'error');
  if (!state.demo && capacity != null && !paths.capacity) return notice('Falta VITE_CAPACITY_PATH para guardar la capacidad en Firebase.', 'error');
  if (!state.demo && (!state.connected || !state.user || !paths.alertLow || !paths.alertHigh)) return;
  if (!state.demo) {
    state.busy = true; render();
    const changes = { [paths.alertLow]: low, [paths.alertHigh]: high };
    if (paths.capacity) changes[paths.capacity] = capacity;
    try { await update(ref(database), changes); }
    catch (error) { state.busy = false; render(); return notice(`No se pudieron guardar los ajustes: ${error.message}`, 'error'); }
    state.busy = false;
  }
  const previousAlerts = alertItems().map((item) => item.id);
  state.alertLow = low; state.alertHigh = high; state.capacity = capacity;
  state.units = units; state.notifications = $('notifications').checked;
  let notificationsDenied = false;
  if (state.notifications && 'Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (state.notifications && 'Notification' in window && Notification.permission !== 'granted') {
    state.notifications = false;
    $('notifications').checked = false;
    notificationsDenied = true;
    notice('El navegador no permitió las notificaciones. Los avisos seguirán visibles en la app.', 'error');
  }
  saveLocalSettings();
  checkNewAlerts(previousAlerts);
  recordEvent('settings', 'Ajustes guardados', `Alertas ${low}%–${high}%`);
  if (!notificationsDenied) {
    notice(state.demo ? 'Ajustes guardados en esta demostración.' : 'Ajustes guardados en Firebase.', 'success');
  }
  render();
});
$('apply-filters').addEventListener('click', () => { state.filters = { dates: $('date-filter').value, type: $('type-filter').value }; renderChart(); renderEvents(); });
$('export-csv').addEventListener('click', exportCsv);
$('reports-link').addEventListener('click', () => { location.hash = 'historial'; exportCsv(); });
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => {
  location.hash = button.dataset.go;
  if (button.dataset.focus) setTimeout(() => $(button.dataset.focus).scrollIntoView({ behavior: 'smooth' }), 80);
}));
window.addEventListener('hashchange', showPage);
$('cancel-login').addEventListener('click', () => $('login-dialog').close());
$('auth-button').addEventListener('click', async () => {
  if (state.user && !state.user.isAnonymous) { await signOut(auth); notice('Sesión cerrada.'); }
  else $('login-dialog').showModal();
});
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('login-error').textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('email').value, $('password').value);
    $('password').value = '';
    $('login-dialog').close();
    notice('Sesión iniciada.', 'success');
  } catch (error) { $('login-error').textContent = `No se pudo iniciar sesión: ${error.code || error.message}`; }
});

if (state.demo) {
  const start = now() - 8 * 3600000;
  [56, 58, 61, 64, 63, 67, 71, 73, 72, 70, 68, 66, 65, 68, 72].forEach((level, index) => addReading(level, start + index * 30 * 60000));
  state.level = 72;
  state.pumpOn = false;
  state.updatedAt = now();
  state.events = [
    { type: 'level', title: 'Nivel actualizado', detail: '72% de capacidad', at: now() - 12 * 60000 },
    { type: 'pump', title: 'Bomba apagada', detail: 'Operación manual', at: now() - 45 * 60000 },
    { type: 'mode', title: 'Modo manual', detail: 'Control disponible', at: now() - 2 * 3600000 },
  ];
  setInterval(() => {
    const previousAlerts = alertItems().map((item) => item.id);
    if (state.mode === 'automatic') {
      if (state.level <= state.controlMin) state.pumpOn = true;
      if (state.level >= state.controlMax) state.pumpOn = false;
    }
    state.level = Math.max(0, Math.min(100, state.level + (state.pumpOn ? 0.8 : -0.2)));
    state.updatedAt = now();
    addReading(state.level);
    checkNewAlerts(previousAlerts);
    render();
  }, 4000);
} else {
  notice('Esperando la primera lectura del ESP32.');
  const app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
  $('auth-button').hidden = !paths.pumpCommand && !paths.mode;
  onAuthStateChanged(auth, (user) => {
    state.user = user;
    $('auth-button').dataset.firebaseUid = user?.uid || '';
    $('auth-button').textContent = user && !user.isAnonymous ? 'Cerrar sesión' : 'Iniciar sesión';
    if (user) subscribe();
    else signInAnonymously(auth).catch((error) => notice(`No se pudo iniciar la lectura: ${error.message}`, 'error'));
  }, (error) => notice(`Error de autenticación: ${error.message}`, 'error'));
}

syncForms();
showPage();
render();
