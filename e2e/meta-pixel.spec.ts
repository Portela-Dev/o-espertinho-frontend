import { test, expect, Page } from './coverage';
const origin = process.env['E2E_BASE_URL'] || 'http://localhost:4200';
const pixelId = '1918844482826551';
const consentKey = 'espertinho-marketing-consent-v1';

async function configure(page: Page, settings = { enabled: true, pixelId, allowedOrigin: origin }) {
  await page.route('**/api/marketing', route => route.fulfill({ json: settings }));
  await page.route('https://connect.facebook.net/**', route => route.fulfill({
    contentType: 'text/javascript',
    body: `window.__pixelCalls=[];window.fbq.callMethod=(...args)=>window.__pixelCalls.push(args);for(const args of window.fbq.queue)window.fbq.callMethod(...args);window.fbq.queue=[];`,
  }));
  await page.route('https://www.facebook.com/**', route => route.abort());
}
const calls = (page: Page) => page.evaluate(() => (window as any).__pixelCalls || []);
async function login(page: Page) {
  await page.addInitScript(() => {
    (window as any).google = { accounts: { id: {
      initialize(options: any) { (window as any).__pixelLogin = options.callback; },
      renderButton(element: HTMLElement) { const button = document.createElement('button'); button.textContent = 'Login Pixel teste'; button.onclick = () => (window as any).__pixelLogin({ credential: 'admin' }); element.appendChild(button); },
    } } };
  });
  await page.goto('/entrar'); await page.getByRole('button', { name: 'Login Pixel teste' }).click();
  await expect(page).not.toHaveURL(/entrar/);
}

test('marketing is opt-in, rejection persists and withdrawal stops events and clears cookies', async ({ page }) => {
  await configure(page);
  let scripts = 0; page.on('request', request => { if (request.url().includes('connect.facebook.net')) scripts++; });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cookies de marketing' })).toBeVisible();
  expect(scripts).toBe(0); expect(await calls(page)).toEqual([]);
  await page.getByRole('button', { name: 'Recusar marketing' }).click();
  await page.reload(); await expect(page.getByRole('button', { name: 'Preferências de privacidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cookies de marketing' })).toHaveCount(0); expect(scripts).toBe(0);
  await page.getByRole('button', { name: 'Preferências de privacidade' }).click();
  await page.getByRole('button', { name: 'Aceitar marketing' }).click();
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'PageView', {}]);
  expect(scripts).toBe(1);
  const recorded = await calls(page);
  expect(recorded).toContainEqual(['set', 'autoConfig', false, pixelId]);
  expect(recorded).toContainEqual(['init', pixelId]);
  await page.evaluate(() => { document.cookie = '_fbp=test; path=/'; document.cookie = '_fbc=test; path=/'; });
  await page.getByRole('button', { name: 'Preferências de privacidade' }).click();
  await page.getByRole('button', { name: 'Recusar marketing' }).click();
  expect(await calls(page)).toContainEqual(['consent', 'revoke']);
  expect(await page.evaluate(() => document.cookie)).not.toContain('_fbp=');
  expect(await page.evaluate(() => document.cookie)).not.toContain('_fbc=');
  const total = (await calls(page)).filter((c: any[]) => c[0].startsWith('track')).length;
  await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
  expect((await calls(page)).filter((c: any[]) => c[0].startsWith('track')).length).toBe(total);
});

test('valid consent survives reload, public content and affiliate clicks are distinct from purchases', async ({ page }) => {
  await configure(page);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ granted: true, at: Date.now() })), consentKey);
  await login(page);
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'PageView', {}]);
  const products = await (await page.request.get('/api/products')).json();
  const product = await (await page.request.get('/api/products/' + products.items[0].id)).json();
  const offer = product.offers[0];
  await page.goto('/oferta/' + offer.id);
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'ViewContent', { content_ids: [offer.id], content_type: 'product', catalog_kind: 'offer' }]);
  await page.getByRole('button', { name: 'Favoritar oferta', exact: true }).first().click();
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'AddToWishlist', { content_ids: [offer.id], content_type: 'product' }]);
  await page.route('https://www.amazon.com.br/**', route => route.abort());
  await page.locator('.offer-main-cta').evaluate((element: HTMLElement) => { element.addEventListener('click', event => event.preventDefault()); element.click(); });
  await expect.poll(() => calls(page)).toContainEqual(['trackSingleCustom', pixelId, 'AffiliateClick', { offer_id: offer.id }]);
  await page.locator('.detail-copy > .text-link').click();
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'ViewContent', { content_ids: [product.id], content_type: 'product', catalog_kind: 'product' }]);
  const recorded = await calls(page);
  expect(recorded.filter((c: any[]) => c[2] === 'ViewContent')).toHaveLength(2);
  expect(recorded.some((c: any[]) => c.includes('Purchase'))).toBe(false);
  expect(JSON.stringify(recorded)).not.toContain('@gmail');
});

for (const path of ['/entrar', '/privacidade', '/?q=segredo', '/?token=segredo', '/#segredo']) {
  test('does not load marketing on private or sensitive URL ' + path, async ({ page }) => {
    await configure(page);
    await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ granted: true, at: Date.now() })), consentKey);
    let scripts = 0; page.on('request', request => { if (request.url().includes('connect.facebook.net')) scripts++; });
    await page.goto(path); await expect(page.getByRole('button', { name: 'Preferências de privacidade' })).toBeVisible();
    expect(scripts).toBe(0); expect(await calls(page)).toEqual([]);
  });
}

test('wrong origin and disabled settings fail closed; expired consent asks again', async ({ page }) => {
  await configure(page, { enabled: true, pixelId, allowedOrigin: 'https://other.example' });
  await page.goto('/'); await expect(page.locator('marketing-consent .preferences')).toHaveCount(0);
  await configure(page, { enabled: false, pixelId, allowedOrigin: origin });
  await page.reload(); await expect(page.locator('marketing-consent .preferences')).toHaveCount(0);
  await configure(page);
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ granted: true, at: 1 })), consentKey);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Cookies de marketing' })).toBeVisible();
  expect(await calls(page)).toEqual([]);
});

test('admin configures only a numeric pixel ID with versioned save', async ({ page }) => {
  await login(page); await page.goto('/admin/marketing');
  const initial = await (await page.request.get('/api/admin/marketing')).json();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pixel Meta');
  const checkbox = page.getByLabel('Habilitar Pixel Meta'); await checkbox.setChecked(!initial.enabled);
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect.poll(async () => (await (await page.request.get('/api/admin/marketing')).json()).enabled).toBe(!initial.enabled);
  await checkbox.setChecked(initial.enabled); await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect.poll(async () => (await (await page.request.get('/api/admin/marketing')).json()).enabled).toBe(initial.enabled);
});

test('withdrawal in another tab stops tracking in the existing document', async ({ page }) => {
  await configure(page); await page.goto('/');
  await page.getByRole('button', { name: 'Aceitar marketing' }).click();
  await expect.poll(() => calls(page)).toContainEqual(['trackSingle', pixelId, 'PageView', {}]);
  await page.evaluate(key => {
    localStorage.setItem(key, JSON.stringify({ granted: false, at: Date.now() }));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, consentKey);
  expect(await calls(page)).toContainEqual(['consent', 'revoke']);
  await page.evaluate(key => {
    localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, consentKey);
  await expect(page.getByRole('heading', { name: 'Cookies de marketing' })).toBeVisible();
});

test('settings failure and invalid ID do not interrupt the catalog or load a tracker', async ({ page }) => {
  await configure(page, { enabled: true, pixelId: '<script>', allowedOrigin: origin });
  await page.goto('/'); await expect(page.locator('.site-footer')).toBeVisible();
  await expect(page.locator('marketing-consent .preferences')).toHaveCount(0);
  await page.route('**/api/marketing', route => route.fulfill({ status: 503, json: { error: 'Temporariamente indisponível' } }));
  await page.reload(); await expect(page.locator('.site-footer')).toBeVisible();
  expect(await calls(page)).toEqual([]);
});
