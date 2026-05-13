/**
 * Generates a Flyway V20 migration SQL file that seeds floor_plan_configs
 * with inline zones_data from the exported JSON files.
 */
const fs = require('fs');
const path = require('path');

const configs = [
  { file: 'zones_typical.json', type: 'TYPICAL', from: 2, to: 16, bg: '/floor-plan-typical.webp' },
  { file: 'zones_17.json', type: 'FLOOR_17', from: 17, to: 17, bg: '/floor-plan-17.webp' },
  { file: 'zones_18.json', type: 'FLOOR_18', from: 18, to: 18, bg: '/floor-plan-18.webp' },
  { file: 'zones_19.json', type: 'FLOOR_19_23', from: 19, to: 23, bg: '/floor-plan-19.webp' },
];

const lines = [
  '-- V20: Seed Beles Residence floor plan configurations',
  '-- Generated from exported zone JSON files',
  '-- building_id = 2 is Beles Residence Корпус A',
  '',
];

for (const cfg of configs) {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'output', cfg.file), 'utf-8')
  );
  
  // Only keep zones array for inline data
  const zonesOnly = JSON.stringify({ zones: data.zones });
  
  // Escape single quotes for SQL
  const escaped = zonesOnly.replace(/'/g, "''");
  
  lines.push(
    `INSERT INTO floor_plan_configs (building_id, floor_type, floor_from, floor_to, background_url, zones_data, viewbox_width, viewbox_height)`,
    `VALUES (2, '${cfg.type}', ${cfg.from}, ${cfg.to}, '${cfg.bg}', '${escaped}', ${data.viewBox.width}, ${data.viewBox.height});`,
    ''
  );
}

const outPath = path.join(__dirname, '..', '..', 'architecture', 'src', 'main', 'resources', 'db', 'migration', 'V20__Seed_Beles_Floor_Plan_Configs.sql');
fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
console.log('Wrote migration to: ' + outPath);
