import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

let server; let origin;
test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    if (request.url === '/') { response.setHeader('content-type', 'text/html'); response.end('<style data-risklab-styler="server"></style><main></main>'); return; }
    try { response.setHeader('content-type', 'text/javascript'); response.end(await readFile(join(process.cwd(), 'dist', 'esm', request.url.slice(1)))); }
    catch { response.statusCode = 404; response.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => new Promise((resolve) => server.close(resolve)));

test('adopts server CSS and resolves hydrated atomic conflicts', async ({ page }) => {
  await page.goto(origin);
  const result = await page.evaluate(async () => {
    const core = await import('/index.js');
    const server = await import('/server.js');
    const collector = server.createServerStyleCollector('rs');
    const initial = collector.css({ color: 'red', padding: 8 }, 'button');
    core.globalStyleRegistry.hydrate(collector.getCSS(), collector.getHydrationData());
    const next = core.css({ color: 'blue' }, 'button');
    return { className: core.props(initial, next).className, styleCount: document.querySelectorAll('style[data-risklab-styler]').length };
  });
  expect(result.styleCount).toBe(1);
  expect(result.className.split(' ')).toHaveLength(2);
});
