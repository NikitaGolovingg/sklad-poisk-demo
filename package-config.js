const singleCasePlaceMedia = {
  'С-3-4': {shelf:{file:'demo-shelf.jpg', demo:true}}
};
const warehousePackage = {
  cacheName: 'warehouse-document-package-shell-v7',
  placeMedia: singleCasePlaceMedia,
  resources: ['index.html', 'style.css', 'package-config.js', 'single-case.js', 'app.js', 'plan.jpg', 'catalog.json', 'nopriz.png',
    ...new Set(Object.values(singleCasePlaceMedia).flatMap(media => [media.shelf?.file, media.panorama].filter(Boolean)))],
  validCatalog(catalog) {
    if (catalog?.version !== 'package-test-1' || !Array.isArray(catalog.cases)
      || catalog.cases.length === 0 || catalog.cases.length !== catalog.count) return false;
    const numbers = new Set();
    const places = new Map();
    for (const item of catalog.cases) {
      if (!item || !Number.isInteger(item.number) || item.number < 6 || item.number > 210300
        || numbers.has(item.number) || !item.folderId || !item.place) return false;
      if (places.has(item.folderId) && places.get(item.folderId) !== item.place) return false;
      numbers.add(item.number);
      places.set(item.folderId, item.place);
    }
    return true;
  }
};
