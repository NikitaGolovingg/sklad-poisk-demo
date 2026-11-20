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
      <label class="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true">${magnifier}</svg>
        <input id="number" type="text" inputmode="numeric" enterkeyhint="search"
          autocomplete="off" placeholder="Номер дела" aria-label="Номер дела"
          aria-describedby="hint error">
      </label>
      <button class="primary" type="submit" hidden>Найти</button>
      <p id="error" role="alert"></p>
    </form><div id="preview" aria-live="polite"></div>
  </div>`;
}

const app=document.querySelector('#app');let catalog,record;const b=(t,a)=>`<button data-action="${a}" class="primary">${t}</button>`;const info=()=>`<article><strong>Дело № ${record.number}</strong><p>Папка: ${record.folder}<br>Стеллаж: ${record.rack}<br>Место: ${record.place}<br>Ряд ${record.row}, ярус ${record.tier}</p></article>`;
function render(s){document.body.classList.toggle('search-active', s === 'search');app.innerHTML=s==='search'?searchScreen():s==='result'?`<form><input id="number" aria-label="Номер дела" value="${record.number}"><button class="primary">Найти</button></form><button data-action="card">${info()}</button>`:s==='card'?info()+b('Показать на карте','map')+'<article>Панорама для этого места пока не добавлена.</article>'+b('Забрать дело','return'):s==='map'?`<div class="map"><img src="plan.png" alt="Схема склада"><button class="pin" style="left:${record.x*100}%;top:${record.y*100}%" data-action="card" aria-label="Открыть дело">⚑</button></div><label>Масштаб<input id="zoom" type="range" min="1" max="3" step=".25" value="1"></label>`+info()+b('Забрать дело','return')+b('Назад','card'):s==='return'?`<article class="warning">Верните папку <strong>${record.folder}</strong> между папками ${record.neighbors.join(' и ')} на стеллаж ${record.rack}, место ${record.place}.</article><article>Панорама полки пока не добавлена.</article>`+b('Подтвердить возврат','done'): `<article class="success"><b>✓</b><h1>Папка возвращена!</h1>Папка ${record.folder} успешно возвращена на место.</article>`+b('К новому поиску','search');}
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
app.addEventListener('input', event => {
  if (event.target.id !== 'number') return;
  document.querySelector('#preview')?.replaceChildren();
  event.target.removeAttribute('aria-invalid');
  const error = document.querySelector('#error');
  if (error) error.textContent = '';
});
app.addEventListener('focusin', event => {
  const screen = event.target.closest('.search-screen');
  if (event.target.id !== 'number' || !screen || screen.classList.contains('editing')) return;
  const field = screen.querySelector('.search-field');
  const start = field.getBoundingClientRect().top;
  screen.classList.add('editing');
  const offset = start - field.getBoundingClientRect().top;
  const reveal = () => { screen.querySelector('[type=submit]').hidden = false; };
  if (offset && field.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const movement = field.animate([{transform:'translateY('+offset+'px)'},{transform:'translateY(0)'}],
      {duration:280,easing:'cubic-bezier(.2,.75,.3,1)'});
    movement.finished.then(reveal,reveal);
  } else reveal();
});
function fitSearchToViewport() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--visible-height', height + 'px');
}
window.visualViewport?.addEventListener('resize', fitSearchToViewport);
window.addEventListener('resize', fitSearchToViewport);
fitSearchToViewport();
app.onclick=e=>{let a=e.target.closest('[data-action]')?.dataset.action;if(a==='prepare')prepare();else if(a)render(a)};app.oninput=e=>{if(e.target.id==='zoom'){const m=app.querySelector('.map');m.style.overflow='auto';m.firstElementChild.style.width=(e.target.value*100)+'%';m.querySelector('.pin').style.left=(record.x*e.target.value*100)+'%'}};

const cacheName = 'warehouse-screen-02-1';
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
