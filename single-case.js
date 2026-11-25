const singleCaseIcons = {
  document:'<path d="M6 3h8l5 5v13H6zM14 3v6h5M9 13h7M9 17h7"/>',
  folder:'<path d="M3 8V5h7l2 2h9v2M3 9h19l-2 11H3z"/>',
  rack:'<path d="M3 3v18m18-18v18M3 12h18M3 19h18M7 5h3v4H7zm7 0h3v4h-3zM7 15h3m4 0h3"/>',
  place:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  exit:'<path d="M16 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11m-4-8h9m-4-4 4 4-4 4"/>',
  return:'<path d="M8 5 3 10l5 5m-5-5h12a5 5 0 0 1 5 5v2a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2v-2"/>',
  check:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
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
function bottomAction(text, action, icon) {
  return `<div class="bottom-action"><div class="bottom-action-inner">${singleAction(text,action,icon)}</div></div>`;
}
function singleCard(item, kind) {
  const folder = ['folder','Папка',folderRange(item.folder)];
  const rows = [['rack','Стеллаж',singleText(item.rack)]];
  if (kind === 'location') rows.push(['layers','Ряд, ярус',`Ряд ${singleText(item.row)}, ярус ${singleText(item.tier)}`]);
  if (kind !== 'result') rows.push(['place','Место',singleText(item.place)]);
  if (kind === 'return') rows.unshift(folder);
  else rows.push(folder);
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
  return `<section class="single-screen single-location has-bottom-action">
    <h1 class="visually-hidden" data-screen-heading tabindex="-1">Расположение дела</h1>
    ${warehouseMap(item)}
    ${singleCard(item,'location')}
    ${bottomAction('Забрать дело','single-return','exit')}
  </section>`;
}
function singleReturn(item, isDemo) {
  const neighbors = (item.neighbors ?? []).filter(Boolean).map(folderRange);
  const nearby = neighbors.length === 2 ? ` между папками ${neighbors.join(' и ')}`
    : neighbors.length === 1 ? ` рядом с папкой ${neighbors[0]}` : '';
  const shelf = warehousePackage.placeMedia[item.place]?.shelf;
  const showShelf = shelf && (!shelf.demo || isDemo);
  return `<section class="single-screen single-return has-bottom-action">
    <h1 class="visually-hidden" data-screen-heading tabindex="-1">Возврат папки</h1>
    <aside class="single-return-hint">${singleIcon('return')}<p>Верните папку <strong>${folderRange(item.folder)}</strong>${nearby}
    на стеллаж <strong>${singleText(item.rack)}</strong>, место <strong>${singleText(item.place)}</strong>.</p></aside>
    ${showShelf ? `<figure class="single-shelf"><img src="${singleText(shelf.file)}" alt="Вид полки для места ${singleText(item.place)}">
      ${shelf.demo ? '<figcaption>Демонстрационный вид полки</figcaption>' : ''}</figure>`
      : '<p class="single-shelf-missing">Для этого места нет изображения полки</p>'}
    ${singleCard(item,'return')}
    ${bottomAction('Подтвердить возврат','single-done','check')}
  </section>`;
}
function singleDone(item) {
  return `<section class="single-screen single-confirmation">
    <article class="success"><b aria-hidden="true">✓</b><h1 data-screen-heading tabindex="-1">Папка возвращена!</h1><p>Папка ${singleText(item.folder)} успешно возвращена на место.</p></article>
    ${singleAction('К новому поиску','search','search')}
  </section>`;
}
