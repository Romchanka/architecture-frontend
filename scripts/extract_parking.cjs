const fs = require('fs');

function parsePathToSegments(d) {
    if (!d) return [];
    const tokens = d.replace(/[A-Za-z]/g, match => ` ${match} `).trim().split(/[\s,]+/);
    const segments = [];
    let cx = 0, cy = 0, cmd = '';
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (/[A-Za-z]/.test(token)) cmd = token;
        else {
            if (cmd === 'M' || cmd === 'm') {
                const xStr = token; const yStr = tokens[++i];
                if (xStr === undefined || yStr === undefined) continue;
                if (cmd === 'm' && cx === 0 && cy === 0 && segments.length === 0) { cx = parseFloat(xStr); cy = parseFloat(yStr); }
                else if (cmd === 'm') { cx += parseFloat(xStr); cy += parseFloat(yStr); }
                else { cx = parseFloat(xStr); cy = parseFloat(yStr); }
                cmd = cmd === 'm' ? 'l' : 'L';
            } else if (cmd === 'L' || cmd === 'l') {
                const xStr = token; const yStr = tokens[++i];
                let nx = parseFloat(xStr), ny = parseFloat(yStr);
                if (cmd === 'l') { nx += cx; ny += cy; }
                segments.push({x1:cx, y1:cy, x2:nx, y2:ny});
                cx = nx; cy = ny;
            } else if (cmd === 'H' || cmd === 'h') {
                let nx = parseFloat(token);
                if (cmd === 'h') nx += cx;
                segments.push({x1:cx, y1:cy, x2:nx, y2:cy});
                cx = nx;
            } else if (cmd === 'V' || cmd === 'v') {
                let ny = parseFloat(token);
                if (cmd === 'v') ny += cy;
                segments.push({x1:cx, y1:cy, x2:cx, y2:ny});
                cy = ny;
            }
        }
    }
    return segments;
}

function extractBoundingBoxes(filePath) {
    const svg = fs.readFileSync(filePath, 'utf8');
    const segments = [];
    const pathRegex = /<path([^>]+)>/g;
    let match;
    while ((match = pathRegex.exec(svg)) !== null) {
        const tag = match[0];
        if (tag.includes('stroke:#0000ff') || tag.includes('stroke:blue')) {
            const dMatch = tag.match(/d="([^"]+)"/);
            if (dMatch) segments.push(...parsePathToSegments(dMatch[1]));
        }
    }

    console.log(`Extracted ${segments.length} blue line segments from ${filePath}.`);
    
    // Instead of precise connectedness, let's divide the space into a grid of 5x5 units
    // and find connected components of grid cells that contain lines.
    const GRID_SIZE = 5;
    const grid = new Map(); // key -> list of segment indices
    const getGridKey = (x, y) => `${Math.floor(x/GRID_SIZE)},${Math.floor(y/GRID_SIZE)}`;
    
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        // interpolate points along the segment to fill grid
        const dist = Math.hypot(s.x2-s.x1, s.y2-s.y1);
        const steps = Math.ceil(dist / GRID_SIZE) + 1;
        for (let j=0; j<=steps; j++) {
            const t = steps === 0 ? 0 : j/steps;
            const x = s.x1 + t*(s.x2-s.x1);
            const y = s.y1 + t*(s.y2-s.y1);
            const key = getGridKey(x, y);
            grid.set(key, true);
        }
    }

    // Connect contiguous grid cells
    const cellIds = new Map();
    const cells = Array.from(grid.keys());
    for(let i=0; i<cells.length; i++) cellIds.set(cells[i], i);
    
    const parent = new Int32Array(cells.length);
    for(let i=0; i<parent.length; i++) parent[i] = i;
    
    function find(i) {
        let root = i;
        while (parent[root] !== root) root = parent[root];
        let curr = i;
        while (parent[curr] !== root) {
            let next = parent[curr];
            parent[curr] = root;
            curr = next;
        }
        return root;
    }
    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    }
    
    const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    
    for (let i=0; i<cells.length; i++) {
        const [gx, gy] = cells[i].split(',').map(Number);
        for(let k=0; k<8; k++){
            const nkey = `${gx+dx[k]},${gy+dy[k]}`;
            if (cellIds.has(nkey)) {
                union(i, cellIds.get(nkey));
            }
        }
    }
    
    const clusters = new Map();
    for (let i=0; i<cells.length; i++) {
        const root = find(i);
        if(!clusters.has(root)) clusters.set(root, []);
        clusters.get(root).push(cells[i]);
    }
    
    const boxes = [];
    for (const [root, clusterCells] of clusters.entries()) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const cell of clusterCells) {
            const [gx, gy] = cell.split(',').map(Number);
            const cx = gx * GRID_SIZE;
            const cy = gy * GRID_SIZE;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx + GRID_SIZE);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy + GRID_SIZE);
        }
        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 20 && h > 20 && w < 250 && h < 250) {
            boxes.push({ minX, minY, maxX, maxY, w, h });
        }
    }
    console.log(`Found ${boxes.length} bounding boxes.`);
    return boxes;
}

const b1 = extractBoundingBoxes('f:/architecture-frontend/public/парковка_1.svg');
const b2 = extractBoundingBoxes('f:/architecture-frontend/public/парковка-2.svg');

fs.writeFileSync('f:/architecture-frontend/scripts/extracted.json', JSON.stringify({L1: b1, L2: b2}, null, 2));
