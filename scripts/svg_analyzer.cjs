const fs = require('fs');

const svg1 = fs.readFileSync('f:/architecture-frontend/public/парковка_1.svg', 'utf8');

// Find all path elements
const paths = svg1.match(/<path[^>]*>/g) || [];
console.log('Total paths:', paths.length);

// Let's sample styles that consist of solid blue, which is the color of the parking spots
// Blue in RGB might be rgb(0,0,255) syntax or HEX #0000ff.
const colors = new Set();
paths.forEach(p => {
    const m = p.match(/style="([^"]+)"/);
    if (m) {
        let style = m[1];
        if (style.includes('0000ff') || style.includes('blue') || style.includes('0,0,255') || style.includes('#00F')) {
            console.log('Found blue path:', p.substring(0, 100));
        }
        const fills = style.match(/fill:(#[^;]+|rgb[^;]+|none)[;"]/);
        const strokes = style.match(/stroke:(#[^;]+|rgb[^;]+|none)[;"]/);
        if (fills) colors.add('fill:' + fills[1]);
        if (strokes) colors.add('stroke:' + strokes[1]);
    }
});
console.log('Sample colors:', Array.from(colors).slice(0, 20));

// Count <rect>s
const rects = svg1.match(/<rect[^>]*>/g) || [];
console.log('Total rects:', rects.length);
rects.slice(0, 10).forEach(r => console.log(r));
