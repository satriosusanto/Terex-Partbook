#!/usr/bin/env node
/**
 * Structural validation for the Franna MAC25 PartBook data.
 * Run from the repository root:
 *   node catalogs/franna-mac25/scripts/validate-data.mjs
 *
 * Known missing source descriptions and unlinked diagram callouts are reported
 * as warnings; they are not silently inferred or treated as valid mappings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../data');

function readJson(name) {
  const fullPath = path.join(dataDir, name);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}
function key(value) {
  return String(value ?? '').trim();
}
function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const k = getKey(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}
function duplicates(counts) {
  return [...counts.entries()].filter(([, count]) => count > 1);
}

const parts = readJson('parts.json');
const catalogs = readJson('catalogs.json');
const hotspots = readJson('hotspots.json');
const images = readJson('images.json');

const errors = [];
const warnings = [];
const partIdCounts = countBy(parts, row => key(row.id));
const catalogIdCounts = countBy(catalogs, row => key(row.id));
const imageKeyCounts = countBy(images, row => key(row.catalog) + '|' + key(row.image));
const partById = new Map(parts.map(row => [key(row.id), row]));
const catalogIds = new Set(catalogs.map(row => key(row.id)));
const imageKeys = new Set(images.map(row => key(row.catalog) + '|' + key(row.image)));
const catalogChildRows = catalogs.flatMap(row => Array.isArray(row.children) ? row.children : []);

for (const [id] of duplicates(partIdCounts)) errors.push('Duplicate part ID: ' + id);
for (const [id] of duplicates(catalogIdCounts)) errors.push('Duplicate catalog ID: ' + id);
for (const [id] of duplicates(imageKeyCounts)) errors.push('Duplicate catalog/image index key: ' + id);

const catalogChildIdCounts = countBy(catalogChildRows, row => key(row.id));
for (const [id] of duplicates(catalogChildIdCounts)) errors.push('Duplicate catalog child ID: ' + id);

const parityFields = ['catalog', 'position', 'part_number', 'description', 'qty', 'type', 'level'];
for (const row of catalogChildRows) {
  const part = partById.get(key(row.id));
  if (!part) {
    errors.push('Catalog child has no matching part row: ' + key(row.id));
    continue;
  }
  for (const field of parityFields) {
    if (key(row[field]) !== key(part[field])) {
      errors.push('Catalog child differs from parts.json for ' + key(row.id) + ' field ' + field);
    }
  }
}
for (const row of parts) {
  if (!catalogChildIdCounts.has(key(row.id))) {
    errors.push('Part row is missing from catalog hierarchy: ' + key(row.id));
  }
}
for (const row of parts) {
  if (!catalogIds.has(key(row.catalog))) {
    errors.push('Part row references unknown catalog: ' + key(row.id) + ' -> ' + key(row.catalog));
  }
}
for (const row of hotspots) {
  const label = key(row.catalog) + ' / position ' + key(row.position) + ' / ' + key(row.image);
  const imageKey = key(row.catalog) + '|' + key(row.image);
  if (!imageKeys.has(imageKey)) {
    errors.push('Hotspot has no matching image index: ' + label);
  }
  const width = Number(row.right) - Number(row.left);
  const height = Number(row.bottom) - Number(row.top);
  const img = images.find(item => key(item.catalog) === key(row.catalog) && key(item.image) === key(row.image));
  if (![row.left, row.top, row.right, row.bottom].every(value => Number.isFinite(Number(value)))) {
    errors.push('Hotspot has non-numeric geometry: ' + label);
  } else if (!(width > 0 && height > 0 && Number(row.left) >= 0 && Number(row.top) >= 0
    && Number(row.right) <= Number(img?.width) && Number(row.bottom) <= Number(img?.height))) {
    errors.push('Hotspot geometry is outside image bounds: ' + label);
  }
  if (key(row.part_id)) {
    const part = partById.get(key(row.part_id));
    if (!part) {
      errors.push('Hotspot references unknown part ID: ' + label + ' -> ' + key(row.part_id));
    } else {
      if (key(part.catalog) !== key(row.catalog)) {
        errors.push('Hotspot part ID belongs to another catalog: ' + label + ' -> ' + key(row.part_id));
      }
      if (key(row.part_number) && key(part.part_number) !== key(row.part_number)) {
        errors.push('Hotspot part number disagrees with part ID: ' + label + ' -> ' + key(row.part_id));
      }
    }
  }
}

const blankPartRows = parts.filter(row => !key(row.description));
const blankHotspots = hotspots.filter(row => !key(row.description));
const unlinkedHotspots = hotspots.filter(row => !key(row.part_id) && !key(row.part_number));
const blankPartNumbers = new Set(blankPartRows.map(row => key(row.part_number)).filter(Boolean));

if (blankPartRows.length) {
  warnings.push(blankPartRows.length + ' part rows have blank descriptions (' + blankPartNumbers.size + ' unique nonblank part numbers; includes placeholder rows if present).');
}
if (blankHotspots.length) warnings.push(blankHotspots.length + ' hotspot rows have blank descriptions.');
if (unlinkedHotspots.length) warnings.push(unlinkedHotspots.length + ' hotspots have neither part ID nor part number; validate against the OEM callout diagram.');

console.log('Franna MAC25 data validation');
console.log('Parts:', parts.length);
console.log('Catalogs:', catalogs.length);
console.log('Catalog child rows:', catalogChildRows.length);
console.log('Images:', images.length);
console.log('Hotspots:', hotspots.length);
console.log('Duplicate part IDs:', duplicates(partIdCounts).length);
console.log('Structural errors:', errors.length);
console.log('Warnings:', warnings.length);

for (const warning of warnings) console.warn('WARN:', warning);
for (const error of errors) console.error('ERROR:', error);

if (errors.length) process.exitCode = 1;
else console.log('PASS: structural checks passed; warnings identify unresolved source-data gaps.');
