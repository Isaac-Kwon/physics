// Tiny static server for a build folder, mounted at the site base (/physics). Lets several builds be previewed at once
// (astro preview allows only one instance per project).
//   node scripts/serve-static.mjs .build-x 4420
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dir = 'dist', port = '4420'] = process.argv.slice(2);
const root = path.resolve(dir);
const BASE = '/physics';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.xml': 'application/xml',
};

http
  .createServer((req, res) => {
    let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (!url.startsWith(BASE)) {
      res.writeHead(302, { location: BASE + '/' });
      return res.end();
    }
    let file = path.join(root, url.slice(BASE.length));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/html' });
      return fs.createReadStream(path.join(root, '404.html')).on('error', () => res.end('Not found')).pipe(res);
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(Number(port), () => console.log(`serving ${root} at http://localhost:${port}${BASE}/`));
