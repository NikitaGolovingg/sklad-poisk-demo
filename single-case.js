const singleCaseIcons = {
  document:'<path d="M6 3h8l5 5v13H6zM14 3v6h5M9 13h7M9 17h7"/>',
  folder:'<path d="M3 8V5h7l2 2h9v2M3 9h19l-2 11H3z"/>',
  rack:'<path d="M3 3v18m18-18v18M3 12h18M3 19h18M7 5h3v4H7zm7 0h3v4h-3zM7 15h3m4 0h3"/>',
  place:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  exit:'<path d="M16 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11m-4-8h9m-4-4 4 4-4 4"/>',
  return:'<path d="M8 5 3 10l5 5m-5-5h12a5 5 0 0 1 5 5v2a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2v-2"/>',
  check:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'
};
function singleIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round">${singleCaseIcons[name]}</svg>`;
}
function singleText(value) {
  return String(value ?? '—').replace(/[&<>"']/g, character =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[character]);
}
function folderRange(value) {
  return singleText(String(value).replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1 – '));
}
function singleAction(text, action, icon) {
  return `<button type="button" class="primary single-action" data-action="${action}">${singleIcon(icon)}${text}</button>`;
}
function singleCard(item, kind) {
  const rows = [
    ['folder','Папка',folderRange(item.folder)], ['rack','Стеллаж',singleText(item.rack)]
  ];
  if (kind === 'location') rows.push(['layers','Ряд, ярус',`Ряд ${singleText(item.row)}, ярус ${singleText(item.tier)}`]);
  if (kind !== 'result') rows.push(['place','Место',singleText(item.place)]);
  const title = kind === 'return' ? '' : `<div class="single-card-title">${singleIcon('document')}<strong>Дело № ${singleText(item.number)}</strong></div>`;
  return `<article class="single-card single-card-${kind}">${title}
    <dl>${rows.map(([icon, label, value]) => `<div class="single-row">
      ${singleIcon(icon)}<dt>${label}:</dt><dd>${value}</dd></div>`).join('')}</dl>
    ${kind === 'result' ? singleAction('К расположению дела','single-location','place') : ''}
  </article>`;
}
function singleResult(item) {
  return `<section class="single-result">${singleCard(item,'result')}</section>`;
}
function singleLocation(item) {
  const panorama = warehousePackage.placeMedia[item.place]?.panorama;
  return `<section class="single-screen single-location">
    ${warehouseMap([item], {readOnlyPin:true})}
    ${singleCard(item,'location')}
    <button type="button" class="single-panorama-button" data-action="single-panorama" ${panorama ? '' : 'disabled aria-label="Посмотреть стеллаж — панорама недоступна"'}>
      <span class="single-panorama-mark" aria-hidden="true"><span>360°</span><svg viewBox="0 0 52 19"><path d="M9 3C1 5 1 9 7 12c5 3 13 4 22 4M30 11l5 5-6 2M38 15c14-3 16-9 5-12"/></svg></span>
      <span class="single-panorama-label">Посмотреть стеллаж</span>
    </button>
    ${singleAction('Забрать дело','single-return','exit')}
  </section>`;
}
function singleReturn(item, isDemo) {
  const neighbors = (item.neighbors ?? []).filter(Boolean).map(folderRange);
  const nearby = neighbors.length === 2 ? ` между папками ${neighbors.join(' и ')}`
    : neighbors.length === 1 ? ` рядом с папкой ${neighbors[0]}` : '';
  const shelf = warehousePackage.placeMedia[item.place]?.shelf;
  const showShelf = shelf && (!shelf.demo || isDemo);
  return `<section class="single-screen single-return">
    <aside class="single-return-hint">${singleIcon('return')}<p>Верните папку <strong>${folderRange(item.folder)}</strong>${nearby}
    на стеллаж <strong>${singleText(item.rack)}</strong>, место <strong>${singleText(item.place)}</strong>.</p></aside>
    ${showShelf ? `<figure class="single-shelf"><img src="${singleText(shelf.file)}" alt="Вид полки для места ${singleText(item.place)}">
      ${shelf.demo ? '<figcaption>Демонстрационный вид полки</figcaption>' : ''}</figure>`
      : '<p class="single-shelf-missing">Для этого места нет изображения полки</p>'}
    ${singleCard(item,'return')}
    ${singleAction('Подтвердить возврат','single-done','check')}
  </section>`;
}
function singleDone(item) {
  return `<section class="single-screen single-confirmation">
    <article class="success"><b>✓</b><h1>Папка возвращена!</h1>Папка ${singleText(item.folder)} успешно возвращена на место.</article>
    ${singleAction('К новому поиску','search','search')}
  </section>`;
}
function singlePanorama(item) {
  const path = warehousePackage.placeMedia[item.place]?.panorama;
  return `<section class="single-screen"><h1>Стеллаж ${singleText(item.rack)}</h1>
    <div class="single-panorama-view" tabindex="0" role="img" aria-label="Панорама места ${singleText(item.place)}">
      <img src="${singleText(path)}" alt="">
    </div>
    <div class="single-panorama-controls">
      <button type="button" data-pan="-1">Повернуть влево</button>
      <button type="button" data-pan="1">Повернуть вправо</button>
    </div></section>`;
}
function enableSinglePanorama(root) {
  const view = root.querySelector('.single-panorama-view');
  const img = view.querySelector('img');
  let offset = 0;
  let drag;
  function move(amount) {
    offset += amount;
    view.style.backgroundPositionX = offset + 'px';
  }
  function loaded() {
    view.style.backgroundImage = 'url(' + JSON.stringify(img.src) + ')';
  }
  function unavailable() {
    view.textContent = 'Не удалось открыть панораму';
    view.removeAttribute('role');
    view.removeAttribute('aria-label');
    root.querySelectorAll('[data-pan]').forEach(button => { button.disabled = true; });
  }
  img.addEventListener('load',loaded,{once:true});
  img.addEventListener('error',unavailable,{once:true});
  if (img.complete) {
    if (img.naturalWidth) loaded();
    else unavailable();
  }
  view.addEventListener('pointerdown', event => {
    drag = event.clientX;
    view.setPointerCapture(event.pointerId);
  });
  view.addEventListener('pointermove', event => {
    if (!view.hasPointerCapture(event.pointerId) || drag === undefined) return;
    move(event.clientX - drag);
    drag = event.clientX;
  });
  view.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? 80 : -80);
    }
  });
  root.querySelectorAll('[data-pan]').forEach(button => {
    button.addEventListener('click', () => move(-Number(button.dataset.pan) * 80));
  });
}
