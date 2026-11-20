const magnifier = '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
const folderIcon = `<svg class="folder-icon" viewBox="0 0 144 112" aria-hidden="true">
  <defs><linearGradient id="folder" x2="0" y2="1"><stop stop-color="#92c0f9"/><stop offset="1" stop-color="#d4e8fc"/></linearGradient></defs>
  <path fill="#448ff1" d="M15 20q0-10 11-10h38l10 9h43q10 0 10 10v58H15z"/>
  <path fill="url(#folder)" d="M11 30h115q10 0 9 10l-7 52q-1 10-11 10H22q-9 0-10-10L5 40q-1-10 6-10"/>
  <circle cx="80" cy="65" r="20" fill="#8cb9ee" stroke="white" stroke-width="9"/>
  <circle cx="80" cy="65" r="20" fill="none" stroke="#0644b3" stroke-width="6"/>
  <path d="m96 81 22 22" stroke="#0644b3" stroke-width="10" stroke-linecap="round"/>
</svg>`;
function searchScreen(compact = false) {
  return `${compact ? '' : '<div class="search-screen">'}
    ${compact ? '' : folderIcon + '<h1>Поиск дела на складе</h1><p id="hint">Введите номер дела<br>от 6 до 210300</p>'}
    <form>
      <div class="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">${magnifier}</svg>
        <input id="number" type="text" inputmode="numeric" enterkeyhint="search"
          autocomplete="off" placeholder="Номер дела" aria-label="Номер дела"
          aria-describedby="${compact ? 'error' : 'hint error'}">
      <button type="button" class="clear-query" aria-label="Очистить поиск">×</button>
      </div>
      <button class="primary" type="submit" ${compact ? '' : 'hidden'}>Найти</button>
      <p id="error" role="alert"></p>
    </form><div id="preview" aria-live="polite"></div>
  ${compact ? '' : '</div>'}`;
}

const app=document.querySelector('#app');let catalog,record;const b=(t,a)=>`<button data-action="${a}" class="primary">${t}</button>`;const info=()=>`<article><strong>Дело № ${record.number}</strong><p>Папка: ${record.folder}<br>Стеллаж: ${record.rack}<br>Место: ${record.place}<br>Ряд ${record.row}, ярус ${record.tier}</p></article>`;
const stackIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5 43 15 24 25 5 15 24 5Zm-19 19 19 10 19-10M5 33l19 10 19-10"/></svg>';
const selectionKey = 'warehouse-document-package:selected:v1';
let selection = new Set();
let packageMatch = null;
let packageError = '';
let packageMode = false;

try {
  const saved = JSON.parse(localStorage.getItem(selectionKey) || '[]');
  if (Array.isArray(saved)) selection = new Set(saved.filter(Number.isInteger));
} catch {
  packageError = 'Не удалось прочитать сохранённую подборку.';
}

function homeScreen() {
  return `<section class="mode-choice">
    ${stackIcon}<h1>Поиск дела на складе</h1>
    <button type="button" data-action="search"><svg viewBox="0 0 24 24" aria-hidden="true">${magnifier}</svg>Найти одно дело</button>
    <button type="button" data-action="package-search">${stackIcon}Собрать пакет документов</button>
  </section>`;
}

function packageRow(item, inList = false) {
  return `<article class="package-row">
    <label class="package-check"><input type="checkbox" data-select="${item.number}"
      aria-label="Дело № ${item.number} в подборке" ${selection.has(item.number) ? 'checked' : ''}></label>
    <button type="button" class="package-detail" data-open-case="${item.number}">
      <strong>Дело № ${item.number}</strong>
      <span>Папка: ${item.folder}<br>Стеллаж: ${item.rack}<br>Место: <b>${item.place}</b></span>
    </button>
    ${inList ? `<button class="package-map" type="button" data-show-case="${item.number}">Показать на карте</button>` : ''}
  </article>`;
}

function packageSearchScreen() {
  return `<section class="package-search search-screen editing">
    <h1>Поиск на складе</h1>
    ${searchScreen(true)}
    <button type="button" id="open-package" class="primary" data-action="package-list"></button>
    <p class="selection-error" role="alert"></p>
  </section>`;
}

function packageListScreen() {
  const rows = [...selection].map(number => {
    const item = catalog.cases.find(entry => entry.number === number);
    return item ? packageRow(item, true) : `<article class="package-row">
      <label class="package-check"><input type="checkbox" data-select="${number}" checked aria-label="Дело № ${number} в подборке"></label>
      <span>Дело № ${number} отсутствует в загруженном каталоге.</span></article>`;
  }).join('');
  return `<section class="package-list"><h1>Подборка (${selection.size})</h1>${rows
    || '<p>В подборке пока нет дел.</p>'}
    ${b('Добавить дела','package-search')}<p class="selection-error" role="alert"></p></section>`;
}

function refreshPackage() {
  const open = document.querySelector('#open-package');
  if (open) {
    open.disabled = selection.size === 0;
    open.textContent = 'Открыть подборку (' + selection.size + ')';
    document.querySelector('#preview').innerHTML = packageMatch ? packageRow(packageMatch) : '';
  }
  const error = app.querySelector('.selection-error');
  if (error) error.textContent = packageError;
}

function changeSelection(input) {
  const number = Number(input.dataset.select);
  const next = new Set(selection);
  if (input.checked) next.add(number);
  else next.delete(number);
  try {
    localStorage.setItem(selectionKey, JSON.stringify([...next]));
  } catch {
    packageError = 'Не удалось сохранить подборку. Повторите действие.';
    input.checked = selection.has(number);
    app.querySelector('.selection-error').textContent = packageError;
    return;
  }
  selection = next;
  packageError = '';
  if (currentScreen === 'package-list') render('package-list', true);
  else {
    const open = document.querySelector('#open-package');
    open.disabled = selection.size === 0;
    open.textContent = 'Открыть подборку (' + selection.size + ')';
    app.querySelector('.selection-error').textContent = '';
  }
}

const trail = [];
let currentScreen = 'home';
function setHeader(inside) {
  document.querySelector('.header-back').hidden = !inside;
  document.querySelector('.header-menu').hidden = !inside;
}
function goBack() {
  const previous = trail.pop();
  if (!previous) { render(currentScreen === 'search' && app.querySelector('.editing') ? 'search' : 'home'); return; }
  if (previous.record) record = previous.record;
  if (previous.form) {
    currentScreen = previous.screen;
    document.body.classList.add('search-active');
    app.replaceChildren(previous.form);
    setHeader(true);
    if (currentScreen === 'package-search') refreshPackage();
  } else render(previous.screen, true);
}
document.querySelector('.header-back').addEventListener('click', goBack);
function warehouseMap(records) {
  const pins = records.map(item => `<button class="pin" style="left:${item.x*100}%;top:${item.y*100}%" data-case="${item.number}" aria-label="Дело № ${item.number}"><svg viewBox="0 0 28 44" aria-hidden="true"><path fill="#ed0000" d="M14 44C11 29 0 22 0 14a14 14 0 1 1 28 0c0 8-11 15-14 30Z"/></svg></button>`).join('');
  return `<section class="warehouse-map"><div class="map"><div class="map-layer"><img src="plan.png" alt="Схема склада">${pins}</div></div><button type="button" class="zoom-map" aria-pressed="false" aria-label="Увеличить схему"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7"/></svg></button></section>`;
}
app.addEventListener('click', event => {
  const pin = event.target.closest('[data-case]');
  if (pin) {record = catalog.cases.find(item => item.number === Number(pin.dataset.case));render('card');return;}
  const button = event.target.closest('.zoom-map');
  if (!button) return;
  const view = button.previousElementSibling;
  const enlarged = view.classList.toggle('enlarged');
  button.setAttribute('aria-pressed',String(enlarged));
  button.setAttribute('aria-label', enlarged ? 'Показать целиком' : 'Увеличить схему');
  view.firstElementChild.style.width = enlarged ? '300%' : '100%';
  if (enlarged && !view.dataset.touchReady) enableMapGestures(view);
  if (enlarged) {
    const marker = view.querySelector('.pin');
    if (marker) view.scrollTo(marker.offsetLeft - view.clientWidth/2, marker.offsetTop - view.clientHeight/2);
  } else view.scrollTo(0,0);
});
function enableMapGestures(view) {
  view.dataset.touchReady = 'true';
  const layer = view.firstElementChild;
  let previous;
  function sample(touches) {
    const a = touches[0], b = touches[1] || a;
    const rect = view.getBoundingClientRect();
    return {x:(a.clientX+b.clientX)/2-rect.left, y:(a.clientY+b.clientY)/2-rect.top,
      distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};
  }
  let moved = false;
  view.addEventListener('touchstart', event => {
    if (!view.classList.contains('enlarged')) return;
    previous = sample(event.touches);
    moved = event.touches.length > 1;
  }, {passive:true});
  view.addEventListener('touchmove', event => {
    if (!previous || !view.classList.contains('enlarged')) return;
    event.preventDefault();
    const now = sample(event.touches);
    const oldScale = layer.getBoundingClientRect().width / view.clientWidth;
    const scale = previous.distance && now.distance
      ? Math.max(1, Math.min(6, oldScale * now.distance / previous.distance)) : oldScale;
    const left = (view.scrollLeft + previous.x) * scale / oldScale - now.x;
    const top = (view.scrollTop + previous.y) * scale / oldScale - now.y;
    layer.style.width = scale * 100 + '%';
    view.scrollTo(left, top);
    moved = true;
    previous = now;
  }, {passive:false});
  function finish(event) {
    if (!previous) return;
    if (moved && event.cancelable) event.preventDefault();
    previous = event.touches.length ? sample(event.touches) : null;
  }
  view.addEventListener('touchend', finish, {passive:false});
  view.addEventListener('touchcancel', finish, {passive:false});
}
function render(s, restoring = false){
  if (s === 'home' || s === 'search' || s === 'done') trail.length = 0;
  else if (!restoring && s !== currentScreen) trail.push({screen:currentScreen,form:app.querySelector('.search-screen'),record});
  if (s === 'home' || s === 'search') packageMode = false;
  if (s.startsWith('package-')) packageMode = true;
  if (s === 'package-search' && !restoring) packageMatch = null;
  currentScreen = s;
  setHeader(s !== 'search' && s !== 'home');
document.body.classList.toggle('search-active', s === 'search' || s === 'package-search');app.innerHTML=s==='home'?homeScreen():s==='package-search'?packageSearchScreen():s==='package-list'?packageListScreen():s==='search'?searchScreen():s==='result'?`<form><input id="number" aria-label="Номер дела" value="${record.number}"><button class="primary">Найти</button></form><button data-action="card">${info()}</button>`:s==='card'?info()+b('Показать на карте','map')+'<article>Панорама для этого места пока не добавлена.</article>'+(packageMode ? '' : b('Забрать дело','return')):s==='map'?warehouseMap([record])+info()+(packageMode ? '' : b('Забрать дело','return')):s==='return'?`<article class="warning">Верните папку <strong>${record.folder}</strong> между папками ${record.neighbors.join(' и ')} на стеллаж ${record.rack}, место ${record.place}.</article><article>Панорама полки пока не добавлена.</article>`+b('Подтвердить возврат','done'): `<article class="success"><b>✓</b><h1>Папка возвращена!</h1>Папка ${record.folder} успешно возвращена на место.</article>`+b('К новому поиску','search');
  refreshPackage();
}
app.addEventListener('submit', event => {
  event.preventDefault();
  const input = event.target.querySelector('#number');
  const value = input.value.trim();
  const valid = /^\d+$/.test(value) && Number(value) >= 6 && Number(value) <= 210300;
  const match = valid && catalog.cases.find(item => item.number === Number(value));
  if (match && currentScreen === 'package-search') {
    packageMatch = match;
    input.blur();
    refreshPackage();
    return;
  }
  if (match) {
    record = match;
    input.blur();
    document.querySelector('#preview').innerHTML = '<button class="case-preview" data-action="card">' + info() + '</button>';
    return;
  }

  let error = document.querySelector('#error');
  if (!error) {
    error = document.createElement('p');
    error.id = 'error';
    error.setAttribute('role', 'alert');
    event.target.append(error);
  }
  input.setAttribute('aria-invalid', String(!valid));
  error.textContent = valid ? 'Дело не найдено в загруженном каталоге'
    : value ? 'Введите целый номер от 6 до 210300.' : 'Введите номер дела.';
});
app.addEventListener('click', event => {
  const clear = event.target.closest('.clear-query');
  if (!clear) return;
  const input = clear.form.querySelector('#number');
  input.value = '';
  input.dispatchEvent(new Event('input', {bubbles:true}));
  input.focus({preventScroll:true});
});
app.addEventListener('input', event => {
  if (event.target.id !== 'number') return;
  if (currentScreen === 'package-search') packageMatch = null;
  document.querySelector('#preview')?.replaceChildren();
  event.target.removeAttribute('aria-invalid');
  const error = document.querySelector('#error');
  if (error) error.textContent = '';
});
function openSearch(input) {
  const screen = input.closest('.search-screen');
  if (!screen || screen.classList.contains('editing')) return;
  const start = input.getBoundingClientRect().top;
  screen.classList.add('editing');
  setHeader(true);
  const offset = start - input.getBoundingClientRect().top;
  const submit = screen.querySelector('[type=submit]');
  submit.hidden = false;
  // Only animate decoration. Safari positions its keyboard against the real input.
  if (offset && !matchMedia('(prefers-reduced-motion: reduce)').matches && submit.animate) {
    screen.querySelector('.search-field svg').animate(
      [{transform:'translateY(calc(-50% + '+offset+'px))',opacity:0.25},
       {transform:'translateY(-50%)',opacity:1}], {duration:180});
    submit.animate([{opacity:0},{opacity:1}], {duration:180});
  }
}
app.addEventListener('touchend', event => {
  const input = event.target.closest('.search-field')?.querySelector('input');
  if (!input || event.changedTouches.length !== 1 || input.closest('.editing')) return;
  event.preventDefault();
  openSearch(input);
  input.focus({preventScroll:true});
}, {passive:false});
app.addEventListener('focusin', event => {
  if (event.target.id === 'number') openSearch(event.target);
});
app.addEventListener('change', event => {
  if (event.target.matches('[data-select]')) changeSelection(event.target);
});
app.addEventListener('click', event => {
  const caseAction = event.target.closest('[data-open-case], [data-show-case]');
  if (caseAction) {
    record = catalog.cases.find(item => item.number === Number(caseAction.dataset.openCase || caseAction.dataset.showCase));
    if (record) render(caseAction.hasAttribute('data-show-case') ? 'map' : 'card');
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'prepare') prepare();
  else if (action === 'package-search' && currentScreen === 'package-list') goBack();
  else if (action) render(action);
});

document.querySelector('.brand-home').addEventListener('click', () => {
  if (!catalog) return; // Preparation is the landing screen until the local catalog is ready.
  render('home');
  window.scrollTo(0, 0);
});

const {cacheName, resources, validCatalog} = warehousePackage;

async function prepare() {
  app.innerHTML = '<p role="status">Загрузка полного комплекта…</p>';
  try {
    await navigator.serviceWorker.register('sw.js');
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve, reject) => {
        const workers = navigator.serviceWorker;
        function check() {
          if (!workers.controller) return;
          clearTimeout(timer);
          workers.removeEventListener('controllerchange', check);
          resolve();
        }
        const timer = setTimeout(() => {
          workers.removeEventListener('controllerchange', check);
          reject(new Error('Service worker did not take control'));
        }, 10000);
        workers.addEventListener('controllerchange', check);
        check();
      });
    }
    const cache = await caches.open(cacheName);
    for (const [index, path] of resources.entries()) {
      const response = await fetch(path + '?release=' + cacheName, {cache:'no-store'});
      if (!response.ok) throw new Error('Incomplete download: ' + path);
      await cache.put(path, response);
      app.querySelector('[role=status]').textContent = 'Сохранено ' + (index + 1) + ' из ' + resources.length;
    }
    catalog = await (await cache.match('catalog.json')).json();
    if (!validCatalog(catalog)) throw new Error('Каталог неполон');
    await cache.put('ready', new Response('yes'));
    app.innerHTML = '<p role="status">Готово к работе без интернета</p><p>Каталог '
      + catalog.version + ' · ' + catalog.cases.length + ' дела</p>' + b('Продолжить','home');
  } catch {
    app.innerHTML = '<p role="alert">Не удалось сохранить комплект. Откройте сайт по HTTPS, проверьте связь и свободное место.</p>'
      + b('Повторить загрузку','prepare');
  }
}

async function openApp() {
  try {
    const cache = await caches.open(cacheName);
    const complete = (await Promise.all(resources.map(path => cache.match(path)))).every(Boolean);
    if (navigator.serviceWorker.controller && complete && await cache.match('ready')) {
      catalog = await (await cache.match('catalog.json')).json();
      if (validCatalog(catalog)) {
        render('home');
        return;
      }
    }
  } catch {
    // Storage can be unavailable or cleared by the browser.
  }
  app.innerHTML = '<h1>Подготовка телефона</h1><p>На этом телефоне нет полного комплекта. Подключитесь к интернету и скачайте тестовый комплект до входа на склад.</p>'
    + b('Скачать весь комплект','prepare');
}
// Check online even when the complete offline package is already on the phone.
if ('serviceWorker' in navigator && navigator.onLine) {
  navigator.serviceWorker.getRegistration().then(registration => registration?.update()).catch(() => {});
}
openApp();
