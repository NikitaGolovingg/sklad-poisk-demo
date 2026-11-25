const folderIcon = `<svg class="folder-icon" viewBox="0 0 144 112" aria-hidden="true">
  <defs><linearGradient id="folder" x2="0" y2="1"><stop stop-color="#92c0f9"/><stop offset="1" stop-color="#d4e8fc"/></linearGradient></defs>
  <path fill="#448ff1" d="M15 20q0-10 11-10h38l10 9h43q10 0 10 10v58H15z"/>
  <path fill="url(#folder)" d="M11 30h115q10 0 9 10l-7 52q-1 10-11 10H22q-9 0-10-10L5 40q-1-10 6-10"/>
  <circle cx="80" cy="65" r="20" fill="#8cb9ee" stroke="white" stroke-width="9"/>
  <circle cx="80" cy="65" r="20" fill="none" stroke="#0644b3" stroke-width="6"/>
  <path d="m96 81 22 22" stroke="#0644b3" stroke-width="10" stroke-linecap="round"/>
</svg>`;
const app = document.querySelector('#app');
const backButton = document.querySelector('.header-back');
const homeButton = document.querySelector('.brand-home');
const trail = [];
let currentScreen = 'preparation';
let catalog;
let record;
const {cacheName, resources, validCatalog} = warehousePackage;

function searchScreen() {
  return `<section class="search-screen">
    ${folderIcon}
    <h1>Поиск дела на складе</h1>
    <p id="hint">Введите номер дела<br>от 6 до 210300</p>
    <form novalidate>
      <div class="search-field">
        ${singleIcon('search')}
        <input id="number" type="text" inputmode="numeric" enterkeyhint="search" autocomplete="off"
          placeholder="Номер дела" aria-label="Номер дела" aria-describedby="hint error">
        <button type="button" class="clear-query" aria-label="Очистить поиск">×</button>
      </div>
      <button type="submit" class="primary single-action" hidden>Найти</button>
      <p id="error" class="notice-error" role="alert"></p>
    </form>
    <div id="preview" aria-live="polite"></div>
  </section>`;
}

function syncHeader() {
  homeButton.disabled = !catalog;
  backButton.hidden = currentScreen === 'preparation'
    || (currentScreen === 'search' && !app.querySelector('.search-screen.editing'));
}

function goBack() {
  const previous = trail.pop();
  if (!previous) {
    render('search',{focus:false});
    homeButton.focus({preventScroll:true});
    return;
  }
  currentScreen = previous.screen;
  app.replaceChildren(previous.content);
  syncHeader();
  window.scrollTo(0,previous.scrollY);
  if (previous.mapScroll) app.querySelector('.map').scrollTo(previous.mapScroll.x,previous.mapScroll.y);
  if (previous.focusSelector) app.querySelector(previous.focusSelector)?.focus({preventScroll:true});
}
backButton.addEventListener('click', goBack);
homeButton.addEventListener('click', () => {
  if (catalog) render('search',{focus:false});
});

function warehouseMap(item) {
  const pin = `<span class="pin" style="left:${item.x * 100}%;top:${item.y * 100}%"
    role="img" aria-label="Место дела № ${singleText(item.number)}">
    <svg viewBox="0 0 28 44" aria-hidden="true"><path fill="#ed0000" d="M14 44C11 29 0 22 0 14a14 14 0 1 1 28 0c0 8-11 15-14 30Z"/><circle cx="14" cy="14" r="5" fill="white"/></svg>
  </span>`;
  return `<section class="warehouse-map"><div class="map"><div class="map-layer"><img src="plan.jpg" alt="Схема склада">${pin}</div></div>
    <button type="button" class="zoom-map" aria-pressed="false" aria-label="Увеличить схему">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7"/></svg>
    </button></section>`;
}

function toggleMap(button) {
  const view = button.previousElementSibling;
  const enlarged = view.classList.toggle('enlarged');
  button.setAttribute('aria-pressed', String(enlarged));
  button.setAttribute('aria-label', enlarged ? 'Показать целиком' : 'Увеличить схему');
  view.firstElementChild.style.width = enlarged ? '300%' : '100%';
  if (enlarged && !view.dataset.touchReady) enableMapGestures(view);
  if (enlarged) {
    const marker = view.querySelector('.pin');
    view.scrollTo(marker.offsetLeft - view.clientWidth / 2, marker.offsetTop - view.clientHeight / 2);
  } else view.scrollTo(0,0);
}

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
const views = {
  search: searchScreen,
  'single-location': () => singleLocation(record),
  'single-return': () => singleReturn(record),
  'single-done': () => singleDone(record)
};

function render(screen, {focus = true, from} = {}) {
  if (screen === 'search') {
    trail.length = 0;
    record = null;
  } else {
    const map = app.querySelector('.map');
    trail.push({
      screen:currentScreen, content:app.firstElementChild, scrollY:window.scrollY,
      mapScroll:map && {x:map.scrollLeft,y:map.scrollTop}, focusSelector:from
    });
  }
  currentScreen = screen;
  app.innerHTML = views[screen]();
  syncHeader();
  window.scrollTo(0,0);
  if (focus) app.querySelector('[data-screen-heading]')?.focus({preventScroll:true});
}

function showPreparation(content) {
  currentScreen = 'preparation';
  app.innerHTML = `<section class="preparation-card">${content}</section>`;
  syncHeader();
}

function clearResult(input) {
  input.closest('.search-screen').classList.remove('single-search-with-result');
  app.querySelector('#preview').replaceChildren();
  app.querySelector('#error').textContent = '';
  input.removeAttribute('aria-invalid');
  record = null;
}

function openSearch(input) {
  const screen = input.closest('.search-screen');
  if (screen.classList.contains('editing')) return;
  screen.classList.add('editing');
  screen.querySelector('[type=submit]').hidden = false;
  syncHeader();
}

app.addEventListener('submit', event => {
  event.preventDefault();
  const input = event.target.querySelector('#number');
  if (!input || !catalog) return;
  openSearch(input);
  const value = input.value.trim();
  clearResult(input);
  const valid = /^\d+$/.test(value) && Number(value) >= 6 && Number(value) <= 210300;
  const match = valid && catalog.cases.find(item => item.number === Number(value));
  if (match) {
    record = match;
    input.blur();
    input.closest('.search-screen').classList.add('single-search-with-result');
    app.querySelector('#preview').innerHTML = singleResult(match);
    return;
  }
  if (!valid) input.setAttribute('aria-invalid','true');
  app.querySelector('#error').textContent = valid ? 'Дело не найдено в загруженном каталоге'
    : value ? 'Введите целый номер от 6 до 210300.' : 'Введите номер дела.';
});

app.addEventListener('input', event => {
  if (event.target.id === 'number') clearResult(event.target);
});
app.addEventListener('focusin', event => {
  if (event.target.id === 'number') openSearch(event.target);
});
app.addEventListener('touchend', event => {
  const input = event.target.closest('#number');
  if (!input || event.changedTouches.length !== 1 || input.closest('.editing')) return;
  event.preventDefault();
  openSearch(input);
  input.focus({preventScroll:true});
}, {passive:false});
app.addEventListener('click', event => {
  const clear = event.target.closest('.clear-query');
  if (clear) {
    const input = clear.form.querySelector('#number');
    input.value = '';
    clearResult(input);
    input.focus({preventScroll:true});
    return;
  }
  const zoom = event.target.closest('.zoom-map');
  if (zoom) {
    toggleMap(zoom);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'prepare' && currentScreen === 'preparation') prepare();
  else if (action === 'search' && catalog) render('search',{focus:false});
  else if (record && Object.hasOwn(views,action)) render(action,{from:`[data-action="${action}"]`});
});

async function prepare() {
  showPreparation('<h1>Подготовка телефона</h1><p role="status">Загрузка полного комплекта…</p>');
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
    const status = app.querySelector('[role=status]');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let completed = 0;
    try {
      await Promise.all(resources.map(async path => {
        const url = path + '?release=' + cacheName;
        const response = await fetch(url, {cache:'no-store', signal:controller.signal});
        if (!response.ok) throw new Error('Incomplete download: ' + path);
        await cache.put(path, response);
        status.textContent = 'Сохранено ' + (++completed) + ' из ' + resources.length;
      }));
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
    const downloaded = await (await cache.match('catalog.json')).json();
    if (!validCatalog(downloaded)) throw new Error('Каталог неполон');
    await cache.put('ready', new Response('yes'));
    catalog = downloaded;
    render('search',{focus:false});
    document.querySelector('#app-status').textContent = 'Готово к работе без интернета';
  } catch {
    showPreparation('<h1>Подготовка телефона</h1><p class="notice-error" role="alert">Не удалось сохранить комплект. Проверьте подключение и свободное место, затем повторите загрузку.</p>'
      + singleAction('Повторить загрузку','prepare','download'));
  }
}

async function openApp() {
  try {
    const cache = await caches.open(cacheName);
    const complete = (await Promise.all(resources.map(path => cache.match(path)))).every(Boolean);
    if (navigator.serviceWorker?.controller && complete && await cache.match('ready')) {
      const downloaded = await (await cache.match('catalog.json')).json();
      if (validCatalog(downloaded)) {
        catalog = downloaded;
        render('search',{focus:false});
        return;
      }
    }
  } catch {
    // Safari may have removed the offline files.
  }
  showPreparation('<h1>Подготовка телефона</h1><p>Скачайте комплект перед входом на склад. После загрузки поиск, схема и возврат папки будут доступны без интернета.</p>'
    + singleAction('Скачать весь комплект','prepare','download'));
}

if ('serviceWorker' in navigator && navigator.onLine) {
  navigator.serviceWorker.getRegistration().then(registration => registration?.update()).catch(() => {});
}
openApp();
