import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.resolve(directory, '../..');
const names = ['figure-2-use-case-overview', 'detail-property-submission-assessment', 'detail-administration'];
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const digest = buffer => createHash('sha256').update(buffer).digest('hex');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunks(buffer) {
  assert.ok(buffer.subarray(0, 8).equals(signature), 'Actual PNG signature required');
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + length + 12;
    assert.ok(end <= buffer.length, 'Complete PNG chunk required');
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    assert.equal(crc32(buffer.subarray(offset + 4, end - 4)), buffer.readUInt32BE(end - 4), `${type} checksum`);
    chunks.push({ type, offset, end, data: buffer.subarray(offset + 8, end - 4) });
    offset = end;
  }
  return chunks;
}

function stampDpi(buffer, dpi) {
  const chunks = pngChunks(buffer);
  const density = chunks.find(chunk => chunk.type === 'pHYs');
  const pixelsPerMetre = Math.round(dpi / 0.0254);
  if (density) {
    assert.equal(density.data.readUInt32BE(0), pixelsPerMetre);
    assert.equal(density.data.readUInt32BE(4), pixelsPerMetre);
    assert.equal(density.data[8], 1);
    return buffer;
  }
  const data = Buffer.alloc(9);
  data.writeUInt32BE(pixelsPerMetre, 0);
  data.writeUInt32BE(pixelsPerMetre, 4);
  data[8] = 1;
  const chunk = Buffer.alloc(21);
  chunk.writeUInt32BE(9, 0);
  chunk.write('pHYs', 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 17)), 17);
  // Add physical-size metadata after IHDR. Pixel data remains exactly unchanged.
  const afterHeader = chunks[0].end;
  return Buffer.concat([buffer.subarray(0, afterHeader), chunk, buffer.subarray(afterHeader)]);
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function group(svg, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = svg.match(new RegExp(`<g[^>]*id="${escaped}"[^>]*>[\\s\\S]*?<\\/g>`));
  assert.ok(match, `Rendered group ${id}`);
  return match[0];
}

const exports = [];
for (const name of names) {
  const source = await fs.readFile(path.join(directory, name + '.puml'), 'utf8');
  const svg = await fs.readFile(path.join(directory, name + '.svg'), 'utf8');
  const originalPng = await fs.readFile(path.join(directory, name + '.png'));
  const png = stampDpi(originalPng, 320);
  if (!png.equals(originalPng)) await fs.writeFile(path.join(directory, name + '.png'), png);
  const sourceActors = [...source.matchAll(/^actor\s+"[^"]+"\s+as\s+(\w+)/gm)].map(match => match[1]);
  const sourceUsecases = [...source.matchAll(/^\s*usecase\s+"[^"]+"\s+as\s+(\w+)/gm)].map(match => match[1]);
  assert.ok(source.includes('rectangle "LOCUS-SF"'));
  assert.ok(!source.includes('as U13'), 'Partial publication use case stays excluded');
  assert.ok(!/Syntax Error|An error has occurred/.test(svg));
  const boundary = attributes(group(svg, 'cluster_LOCUS-SF').match(/<rect\b[^>]+>/)[0]);
  const box = { x: +boundary.x, y: +boundary.y, width: +boundary.width, height: +boundary.height };
  for (const id of sourceUsecases) {
    const node = group(svg, 'entity_' + id);
    const ellipse = attributes(node.match(/<ellipse\b[^>]+>/)[0]);
    assert.ok(+ellipse.cx - +ellipse.rx >= box.x - 1, `${name}: ${id} inside left boundary`);
    assert.ok(+ellipse.cx + +ellipse.rx <= box.x + box.width + 1, `${name}: ${id} inside right boundary`);
    assert.ok(+ellipse.cy - +ellipse.ry >= box.y - 1, `${name}: ${id} inside top boundary`);
    assert.ok(+ellipse.cy + +ellipse.ry <= box.y + box.height + 1, `${name}: ${id} inside bottom boundary`);
  }
  for (const id of sourceActors) {
    const node = group(svg, 'entity_' + id);
    assert.ok(node.includes('<path'), 'Native stick actor body');
    const ellipse = attributes(node.match(/<ellipse\b[^>]+>/)[0]);
    const outside = +ellipse.cx + +ellipse.rx < box.x || +ellipse.cx - +ellipse.rx > box.x + box.width || +ellipse.cy + +ellipse.ry < box.y || +ellipse.cy - +ellipse.ry > box.y + box.height;
    assert.ok(outside, `${name}: actor ${id} outside system boundary`);
    for (const text of node.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)) {
      const label = attributes(text[0]);
      const left = +label.x, right = left + +(label.textLength || 0), baseline = +label.y;
      assert.ok(right <= box.x || left >= box.x + box.width || baseline <= box.y || baseline >= box.y + box.height, `${name}: actor label outside boundary`);
    }
  }
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.ok(width >= 2000 && height >= 2000, 'High-resolution export required');
  const metadata = pngChunks(png).find(chunk => chunk.type === 'pHYs').data;
  exports.push({
    name, actors: sourceActors.length, usecases: sourceUsecases.length,
    png: { width, height, dpi: +(metadata.readUInt32BE(0) * 0.0254).toFixed(3), bytes: png.length },
    sha256: { source: digest(Buffer.from(source)), svg: digest(Buffer.from(svg)), png: digest(png) },
    checks: ['native actors and ellipses', 'actors and actor labels outside boundary', 'use cases inside boundary', 'no publication decision oval', 'valid PNG chunk checksums', '320 DPI physical-size metadata']
  });
}

const evidence = await fs.readFile(path.join(directory, 'evidence.md'), 'utf8');
const rows = evidence.split(/\r?\n/).filter(line => /^\| [UX]\d\d\b/.test(line)).map(line => line.slice(1, -1).split('|').map(cell => cell.trim().replaceAll('`', '')));
assert.equal(rows.length, 28, 'All evidence rows retained');
const missingCodeFiles = [];
for (const row of rows) {
  for (const match of row[3].matchAll(/(?:app|api|assets|docs)\/[\w./-]+\.(?:php|js|md)|\b(?:seller-login|seller-dashboard|investor-login|investor-dashboard|property-explorer|property-details|compare-decision|admin-properties|reports|verify-email)\.php/g)) {
    try { await fs.access(path.join(workspace, match[0])); }
    catch { missingCodeFiles.push(match[0]); }
  }
}
assert.deepEqual(missingCodeFiles, [], 'All cited code files exist');
const csvRows = [['ID / figure scope', 'Actor', 'Use case', 'Supporting code location', 'Implementation status'], ...rows];
const csv = '\ufeff' + csvRows.map(row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
await fs.writeFile(path.join(directory, 'evidence.csv'), csv);
await fs.writeFile(path.join(directory, 'export-verification.json'), JSON.stringify({ reviewDate: '2026-10-10', renderer: 'PlantUML 1.2025.7 with bundled Graphviz; local Java 17', inspection: 'Focused static code review; native rendered images visually inspected. No application end-to-end test is claimed.', evidenceRows: rows.length, codeReferencesExist: true, exports }, null, 2) + '\n');
console.log(JSON.stringify({ evidenceRows: rows.length, exports: exports.map(item => ({ name: item.name, ...item.png, actors: item.actors, usecases: item.usecases })) }, null, 2));
