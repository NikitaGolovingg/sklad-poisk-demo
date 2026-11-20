const magnifier = '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
const folderIcon = `<svg class="folder-icon" viewBox="0 0 144 112" aria-hidden="true">
  <defs><linearGradient id="folder" x2="0" y2="1"><stop stop-color="#92c0f9"/><stop offset="1" stop-color="#d4e8fc"/></linearGradient></defs>
  <path fill="#448ff1" d="M15 20q0-10 11-10h38l10 9h43q10 0 10 10v58H15z"/>
  <path fill="url(#folder)" d="M11 30h115q10 0 9 10l-7 52q-1 10-11 10H22q-9 0-10-10L5 40q-1-10 6-10"/>
  <circle cx="80" cy="65" r="20" fill="#8cb9ee" stroke="white" stroke-width="9"/>
  <circle cx="80" cy="65" r="20" fill="none" stroke="#0644b3" stroke-width="6"/>
  <path d="m96 81 22 22" stroke="#0644b3" stroke-width="10" stroke-linecap="round"/>
</svg>`;
function searchScreen() {
  return `<div class="search-screen">
    ${folderIcon}
    <h1>Поиск дела на складе</h1>
    <p id="hint">Введите номер дела<br>от 6 до 210300</p>
    <form>
      <div class="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">${magnifier}</svg>
        <input id="number" type="text" inputmode="numeric" enterkeyhint="search"
          autocomplete="off" placeholder="Номер дела" aria-label="Номер дела"
          aria-describedby="hint error">
      <button type="button" class="clear-query" aria-label="Очистить поиск">×</button>
      </div>
      <button class="primary" type="submit" hidden>Найти</button>
      <p id="error" role="alert"></p>
    </form><div id="preview" aria-live="polite"></div>
  </div>`;
}

const app=document.querySelector('#app');let catalog,record;const b=(t,a)=>`<button data-action="${a}" class="primary">${t}</button>`;const info=()=>`<article><strong>Дело № ${record.number}</strong><p>Папка: ${record.folder}<br>Стеллаж: ${record.rack}<br>Место: ${record.place}<br>Ряд ${record.row}, ярус ${record.tier}</p></article>`;
const trail = [];
let currentScreen = 'search';
function setHeader(inside) {
  document.querySelector('.header-back').hidden = !inside;
  document.querySelector('.header-menu').hidden = !inside;
}
function goBack() {
  const previous = trail.pop();
  if (!previous) { render('search'); return; }
  if (previous.form) {
    currentScreen = 'search';
    document.body.classList.add('search-active');
    app.replaceChildren(previous.form);
    setHeader(true);
  } else render(previous.screen, true);
}
document.querySelector('.header-back').addEventListener('click', goBack);
function render(s, restoring = false){
  if (s === 'search' || s === 'done') trail.length = 0;
  else if (!restoring && s !== currentScreen) trail.push({screen:currentScreen,form:app.querySelector('.search-screen')});
  currentScreen = s;
  setHeader(s !== 'search');
document.body.classList.toggle('search-active', s === 'search');app.innerHTML=s==='search'?searchScreen():s==='result'?`<form><input id="number" aria-label="Номер дела" value="${record.number}"><button class="primary">Найти</button></form><button data-action="card">${info()}</button>`:s==='card'?info()+b('Показать на карте','map')+'<article>Панорама для этого места пока не добавлена.</article>'+b('Забрать дело','return'):s==='map'?`<div class="map"><img src="plan.png" alt="Схема склада"><button class="pin" style="left:${record.x*100}%;top:${record.y*100}%" data-action="card" aria-label="Открыть дело">⚑</button></div><label>Масштаб<input id="zoom" type="range" min="1" max="3" step=".25" value="1"></label>`+info()+b('Забрать дело','return'):s==='return'?`<article class="warning">Верните папку <strong>${record.folder}</strong> между папками ${record.neighbors.join(' и ')} на стеллаж ${record.rack}, место ${record.place}.</article><article>Панорама полки пока не добавлена.</article>`+b('Подтвердить возврат','done'): `<article class="success"><b>✓</b><h1>Папка возвращена!</h1>Папка ${record.folder} успешно возвращена на место.</article>`+b('К новому поиску','search');}
app.addEventListener('submit', event => {
  event.preventDefault();
  const input = event.target.querySelector('#number');
  const value = input.value.trim();
  const valid = /^\d+$/.test(value) && Number(value) >= 6 && Number(value) <= 210300;
  const match = valid && catalog.cases.find(item => item.number === Number(value));
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
app.onclick=e=>{let a=e.target.closest('[data-action]')?.dataset.action;if(a==='prepare')prepare();else if(a)render(a)};app.oninput=e=>{if(e.target.id==='zoom'){const m=app.querySelector('.map');m.style.overflow='auto';m.firstElementChild.style.width=(e.target.value*100)+'%';m.querySelector('.pin').style.left=(record.x*e.target.value*100)+'%'}};

document.querySelector('.brand-home').addEventListener('click', () => {
  if (!catalog) return; // Preparation is the landing screen until the local catalog is ready.
  render('search');
  window.scrollTo(0, 0);
});

const cacheName = 'warehouse-screen-02-5';
const resources = ['index.html', 'style.css', 'app.js', 'plan.png', 'catalog.json', 'nopriz.png'];

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
      await cache.add(new Request(path, {cache: 'reload'}));
      app.querySelector('[role=status]').textContent = 'Сохранено ' + (index + 1) + ' из ' + resources.length;
    }
    catalog = await (await cache.match('catalog.json')).json();
    if (catalog.cases.length !== 1) throw new Error('Каталог неполон');
    await cache.put('ready', new Response('yes'));
    app.innerHTML = '<p role="status">Готово к работе без интернета</p><p>Каталог '
      + catalog.version + ' · ' + catalog.cases.length + ' дело</p>' + b('Начать поиск','search');
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
      if (catalog.cases.length === 1) {
        render('search');
        return;
      }
    }
  } catch {
    // Storage can be unavailable or cleared by the browser.
  }
  app.innerHTML = '<h1>Подготовка телефона</h1><p>На этом телефоне нет полного комплекта. Подключитесь к интернету и скачайте тестовый комплект до входа на склад.</p>'
    + b('Скачать весь комплект','prepare');
}
openApp();
