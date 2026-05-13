/**
 * Exports Beles Residence zone geometry from Dart hardcoded data to JSON files.
 * These JSON files will be uploaded to the backend for dynamic floor plan rendering.
 * 
 * Usage: node scripts/export_zones_json.cjs
 * Output: scripts/output/zones_typical.json, zones_17.json, zones_18.json, zones_19.json
 */
const fs = require('fs');
const path = require('path');

// Read the Dart geometry file
const dartFile = fs.readFileSync(
  path.join(__dirname, '..', '..', 'architecture-mobile', 'lib', 'features', 'marketplace', 'widgets', 'beles_geometry.dart'),
  'utf-8'
);

// Parse BelesZoneStr entries from Dart source
function parseDartZones(source, listName) {
  // Find the list declaration
  const listRegex = new RegExp(`const\\s+List<BelesZoneStr>\\s+${listName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const match = source.match(listRegex);
  if (!match) {
    console.error(`Could not find list: ${listName}`);
    return [];
  }
  
  const content = match[1];
  const zones = [];
  
  // Match each BelesZoneStr(...)
  const zoneRegex = /BelesZoneStr\(\s*id:\s*(\d+),\s*points:\s*'([^']+)',\s*labelOffset:\s*Offset\(([^)]+)\)\s*\)/g;
  let zoneMatch;
  while ((zoneMatch = zoneRegex.exec(content)) !== null) {
    const id = parseInt(zoneMatch[1]);
    const points = zoneMatch[2];
    const [lx, ly] = zoneMatch[3].split(',').map(s => parseFloat(s.trim()));
    zones.push({
      id,
      points,
      labelOffset: { x: lx, y: ly }
    });
  }
  
  return zones;
}

// Parse all 4 floor types
const zonesTypical = parseDartZones(dartFile, 'belesZonesTypical');
const zones17 = parseDartZones(dartFile, 'belesZones17');
const zones18 = parseDartZones(dartFile, 'belesZones18');
const zones19 = parseDartZones(dartFile, 'belesZones19');

console.log(`Parsed zones: typical=${zonesTypical.length}, floor17=${zones17.length}, floor18=${zones18.length}, floor19=${zones19.length}`);

// ViewBox dimensions (same for all floors)
const viewBoxWidth = 1615.75;
const viewBoxHeight = 1162.2;

// Create output directory
const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Write JSON files
const configs = [
  {
    filename: 'zones_typical.json',
    floorType: 'TYPICAL',
    floorFrom: 2,
    floorTo: 16,
    zones: zonesTypical,
    backgroundFilename: 'floor-plan-typical.webp'
  },
  {
    filename: 'zones_17.json',
    floorType: 'FLOOR_17',
    floorFrom: 17,
    floorTo: 17,
    zones: zones17,
    backgroundFilename: 'floor-plan-17.webp'
  },
  {
    filename: 'zones_18.json',
    floorType: 'FLOOR_18',
    floorFrom: 18,
    floorTo: 18,
    zones: zones18,
    backgroundFilename: 'floor-plan-18.webp'
  },
  {
    filename: 'zones_19.json',
    floorType: 'FLOOR_19_23',
    floorFrom: 19,
    floorTo: 23,
    zones: zones19,
    backgroundFilename: 'floor-plan-19.webp'
  }
];

for (const cfg of configs) {
  const jsonData = {
    floorType: cfg.floorType,
    floorFrom: cfg.floorFrom,
    floorTo: cfg.floorTo,
    viewBox: {
      width: viewBoxWidth,
      height: viewBoxHeight
    },
    backgroundFilename: cfg.backgroundFilename,
    zones: cfg.zones
  };
  
  const filePath = path.join(outDir, cfg.filename);
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`✅ Wrote ${filePath} (${cfg.zones.length} zones)`);
}

console.log('\n✅ All zone JSON files exported successfully!');
console.log('These files can be uploaded to the backend via the /files/upload/floor-plan-config endpoint.');
