// Runs `astro build` with retrying deletes/renames on Windows.
// Why: on Windows, freshly written files are often briefly locked (antivirus / indexer / sync clients).
// Astro 7 removes its temporary `.prerender` folder and Vite renames its deps cache without retries,
// which turns those short locks into spurious EBUSY build failures. No-op on other platforms (CI).
import fs from 'node:fs';

if (process.platform === 'win32') {
  const RETRY = new Set(['EBUSY', 'EPERM', 'EACCES', 'ENOTEMPTY']);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const retrying = (fn) => async (...args) => {
    for (let i = 0; ; i++) {
      try {
        return await fn(...args);
      } catch (e) {
        if (i >= 20 || !RETRY.has(e.code)) throw e;
        await sleep(100 + i * 50);
      }
    }
  };
  const retryingSync = (fn) => (...args) => {
    for (let i = 0; ; i++) {
      try {
        return fn(...args);
      } catch (e) {
        if (i >= 20 || !RETRY.has(e.code)) throw e;
        sleepSync(100 + i * 50);
      }
    }
  };
  fs.promises.rm = retrying(fs.promises.rm);
  fs.promises.rename = retrying(fs.promises.rename);
  fs.rmSync = retryingSync(fs.rmSync);
  fs.renameSync = retryingSync(fs.renameSync);
  const rename = fs.rename;
  fs.rename = (a, b, cb) => retrying((x, y) => new Promise((res, rej) => rename(x, y, (e) => (e ? rej(e) : res()))))(a, b).then(() => cb(null), cb);
}

const { build } = await import('astro');
await build({ root: process.cwd(), ...(process.argv[2] ? { outDir: process.argv[2] } : {}) });
