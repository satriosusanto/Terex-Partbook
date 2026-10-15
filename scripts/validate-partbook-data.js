#!/usr/bin/env node
'use strict';

// Read-only validator for PartBook JSON metadata. It reports data quality issues;
// it never edits or guesses OEM part mappings.
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const candidateDirs = [path.join(root, 'data')];
const catalogsRoot = path.join(root, 'catalogs');

if (fs.existsSync(catalogsRoot)) {
  for (const entry of fs.readdirSync(catalogsRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) candidateDirs.push(path.join(catalogsRoot, entry.name, 'data'));
  }
}

const exists = (file) => fs.existsSync(file);
const readJson = (file, errors) => {
  if (!exists(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON: ${path.relative(root, file)} — ${error.message}`);
    return null;
  }
};
const asArray = (value) => Array.isArray(value) ? value : [];
const first = (obj, keys) => {
  for (const key of keys) if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  return null;
};
const countValues = (obj) => Object.values(obj || {}).reduce((n, value) => n + (Array.isArray(value) ? value.length : 0), 0);

let totals = { datasets: 0, catalogs: 0, parts: 0, images: 0, hotspots: 0, errors: 0, warnings: 0 };
const allIssues = [];

for (const dir of candidateDirs) {
  const files = {
    catalogs: path.join(dir, 'catalogs.json'),
    parts: path.join(dir, 'parts.json'),
    images: path.join(dir, 'images.json'),
    hotspots: path.join(dir, 'hotspots.json')
  };
  if (!Object.values(files).some(exists)) continue;

  const errors = [];
  const warnings = [];
  const catalogsRaw = readJson(files.catalogs, errors);
  const partsRaw = readJson(files.parts, errors);
  const imagesRaw = readJson(files.images, errors);
  const hotspotsRaw = readJson(files.hotspots, errors);

  const catalogs = asArray(catalogsRaw);
  const parts = asArray(partsRaw);
  const images = Array.isArray(imagesRaw) ? imagesRaw : Object.entries(imagesRaw || {}).map(([catalogId, image]) => ({ catalogId, image }));
  const hotspots = Array.isArray(hotspotsRaw)
    ? hotspotsRaw
    : Object.entries(hotspotsRaw || {}).flatMap(([image, rows]) => asArray(rows).map((row) => ({ image, ...row })));

  const catalogIds = new Set();
  const partIds = new Set();
  const imageNames = new Set();
  let duplicateCatalogIds = 0;
  let duplicatePartIds = 0;
  let catalogsWithoutLabel = 0;
  let partsWithoutPartNumber = 0;
  let partsWithoutDescription = 0;
  let partsWithoutPosition = 0;
  let partsWithoutQuantity = 0;

  // Count blank fields as review items rather than automatically calling them
  // corruption: parent/assembly rows can legitimately omit position/quantity.
  for (const catalog of catalogs) {
    if (!String(first(catalog, ['title', 'name', 'description', 'label']) ?? '').trim()) {
      catalogsWithoutLabel++;
    }
  }
  for (const part of parts) {
    if (!String(first(part, ['partNumber', 'part_number', 'partNo', 'part_no']) ?? '').trim()) partsWithoutPartNumber++;
    if (!String(first(part, ['description', 'desc', 'name']) ?? '').trim()) partsWithoutDescription++;
    if (!String(first(part, ['position', 'pos', 'itemLoc', 'item_loc']) ?? '').trim()) partsWithoutPosition++;
    if (!String(first(part, ['qty', 'quantity']) ?? '').trim()) partsWithoutQuantity++;
  }

  for (const catalog of catalogs) {
    const id = first(catalog, ['id', 'catalogId', 'catalog']);
    if (id === null) continue;
    if (catalogIds.has(String(id))) duplicateCatalogIds++;
    catalogIds.add(String(id));
  }
  for (const part of parts) {
    const id = first(part, ['id', 'part_id']);
    if (id !== null) {
      if (partIds.has(String(id))) duplicatePartIds++;
      partIds.add(String(id));
    }
  }
  for (const image of images) {
    const name = first(image, ['image', 'filename', 'file', 'name']);
    if (name !== null) imageNames.add(String(name));
  }

  const getCatalogRef = (record) => first(record, ['catalog', 'catalogId', 'catalog_id']);
  let partsWithUnknownCatalog = 0;
  if (catalogIds.size) {
    for (const part of parts) {
      const ref = getCatalogRef(part);
      if (ref !== null && !catalogIds.has(String(ref))) partsWithUnknownCatalog++;
    }
  }

  let hotspotsWithInvalidBounds = 0;
  let hotspotsWithMissingOrNonNumericBounds = 0;
  let hotspotsWithUnknownCatalog = 0;
  let hotspotsWithMissingImage = 0;
  let hotspotsWithUnlinkedPart = 0;
  for (const hotspot of hotspots) {
    const left = Number(hotspot.left), top = Number(hotspot.top);
    const right = Number(hotspot.right), bottom = Number(hotspot.bottom);
    // Missing/non-numeric coordinates must be reported separately. Previously these
    // rows silently passed because the degenerate-bounds check only ran for finite values.
    if (![left, top, right, bottom].every(Number.isFinite)) hotspotsWithMissingOrNonNumericBounds++;
    else if (right <= left || bottom <= top) hotspotsWithInvalidBounds++;

    const catRef = getCatalogRef(hotspot);
    if (catRef !== null && catalogIds.size && !catalogIds.has(String(catRef))) hotspotsWithUnknownCatalog++;

    const image = first(hotspot, ['image', 'imageName', 'filename']);
    if (image !== null && imageNames.size && !imageNames.has(String(image))) {
      // Some formats key hotspot maps by image while image metadata maps catalog IDs;
      // only report this check when image records expose explicit filenames.
      const hasExplicitFilenames = images.some((row) => first(row, ['image', 'filename', 'file', 'name']) !== null);
      if (hasExplicitFilenames) hotspotsWithMissingImage++;
    }

    const partRef = first(hotspot, ['part_id', 'partId', 'partID']);
    const partNumber = first(hotspot, ['part_number', 'partNumber']);
    if (partRef !== null && partIds.size && !partIds.has(String(partRef))) hotspotsWithUnlinkedPart++;
    else if (partRef === null && partNumber !== null) {
      const match = parts.some((part) =>
        String(first(part, ['part_number', 'partNumber']) ?? '') === String(partNumber) &&
        (getCatalogRef(hotspot) === null || String(getCatalogRef(part)) === String(getCatalogRef(hotspot)))
      );
      if (!match) hotspotsWithUnlinkedPart++;
    }
  }

  if (duplicateCatalogIds) warnings.push(`Duplicate catalog IDs: ${duplicateCatalogIds}`);
  if (duplicatePartIds) warnings.push(`Duplicate part IDs: ${duplicatePartIds}`);
  if (catalogsWithoutLabel) warnings.push(`Catalog records without a display label (review): ${catalogsWithoutLabel}`);
  if (partsWithoutPartNumber) warnings.push(`Part rows without a part number (review): ${partsWithoutPartNumber}`);
  if (partsWithoutDescription) warnings.push(`Part rows without a description (review): ${partsWithoutDescription}`);
  if (partsWithoutPosition) warnings.push(`Part rows without a position (review; may include valid parent/header rows): ${partsWithoutPosition}`);
  if (partsWithoutQuantity) warnings.push(`Part rows without a quantity (review; may include valid parent/header rows): ${partsWithoutQuantity}`);
  if (partsWithUnknownCatalog) warnings.push(`Parts referencing unknown catalogs: ${partsWithUnknownCatalog}`);
  if (hotspotsWithUnknownCatalog) warnings.push(`Hotspots referencing unknown catalogs: ${hotspotsWithUnknownCatalog}`);
  if (hotspotsWithInvalidBounds) warnings.push(`Hotspots with invalid bounds (right <= left or bottom <= top): ${hotspotsWithInvalidBounds}`);
  if (hotspotsWithMissingOrNonNumericBounds) warnings.push(`Hotspots with missing or non-numeric coordinate bounds: ${hotspotsWithMissingOrNonNumericBounds}`);
  if (hotspotsWithMissingImage) warnings.push(`Hotspots referencing image names not found in explicit image metadata: ${hotspotsWithMissingImage}`);
  if (hotspotsWithUnlinkedPart) warnings.push(`Hotspots with a part link/number that cannot be resolved: ${hotspotsWithUnlinkedPart}`);

  const label = path.relative(root, dir) || '.';
  const summary = {
    dataset: label,
    catalogs: catalogs.length,
    parts: parts.length,
    images: images.length,
    hotspots: hotspots.length,
    duplicateCatalogIds,
    duplicatePartIds,
    catalogsWithoutLabel,
    partsWithoutPartNumber,
    partsWithoutDescription,
    partsWithoutPosition,
    partsWithoutQuantity,
    partsWithUnknownCatalog,
    hotspotsWithUnknownCatalog,
    hotspotsWithInvalidBounds,
    hotspotsWithMissingOrNonNumericBounds,
    hotspotsWithMissingImage,
    hotspotsWithUnlinkedPart,
    errors,
    warnings
  };
  totals.datasets++;
  totals.catalogs += summary.catalogs;
  totals.parts += summary.parts;
  totals.images += summary.images;
  totals.hotspots += summary.hotspots;
  totals.errors += errors.length;
  totals.warnings += warnings.length;
  allIssues.push(summary);
}

if (totals.datasets === 0) {
  console.error('No PartBook data folders found. Run this script from the repository root.');
  process.exit(2);
}

console.log('PartBook data validation (read-only)');
console.log(JSON.stringify({ totals, datasets: allIssues }, null, 2));
if (totals.errors > 0) process.exitCode = 1;
