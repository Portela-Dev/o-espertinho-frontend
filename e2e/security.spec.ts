import { test, expect } from './coverage';
test('CSP preserva hidratação e bloqueia script inline injetado', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Content Security Policy'))
      violations.push(m.text());
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain(
    "script-src 'self'",
  );
  await expect(page.locator('product-card').first()).toBeVisible();
  await page.getByRole('textbox', { name: 'Buscar ofertas' }).fill('Monitor');
  await page
    .locator('.search-bar')
    .getByRole('button', { name: /Buscar/ })
    .click();
  await expect(page.locator('product-card')).toHaveCount(1);
  expect(violations).toEqual([]);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__forbiddenInline=true';
    document.body.appendChild(script);
  });
  expect(
    await page.evaluate(() => (window as any).__forbiddenInline),
  ).toBeUndefined();
});
test('operação sensível pede Google com nonce e repete a requisição após confirmação', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).google = {
      accounts: {
        id: {
          initialize(options: any) {
            (window as any).__securityGoogle = options;
          },
          renderButton(el: HTMLElement) {
            const b = document.createElement('button');
            b.textContent = 'Confirmar Google teste';
            b.onclick = () =>
              (window as any).__securityGoogle.callback({
                credential: (window as any).__securityGoogle.nonce
                  ? 'confirmed-admin'
                  : 'admin',
                select_by: 'btn',
              });
            el.replaceChildren(b);
          },
        },
      },
    };
  });
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Confirmar Google teste' }).click();
  await expect(page).not.toHaveURL(/entrar/);
  await page.goto('/admin/profiles');
  let attempts = 0,
    confirmed = false;
  await page.route('**/api/auth/reauth/challenge', (route) =>
    route.fulfill({ json: { nonce: 'security-nonce-test' } }),
  );
  await page.route('**/api/auth/reauth', async (route) => {
    expect(route.request().postDataJSON().credential).toBe('confirmed-admin');
    confirmed = true;
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/admin/access-profiles', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts++;
    if (!confirmed)
      return route.fulfill({
        status: 403,
        json: { error: 'Confirme sua conta.', code: 'ADMIN_REAUTH_REQUIRED' },
      });
    return route.continue();
  });
  await page.getByRole('button', { name: /Novo perfil/ }).click();
  const modal = page.getByRole('dialog').filter({ hasText: 'Novo perfil' });
  await modal.getByLabel('Nome', { exact: true }).fill('Perfil segurança E2E');
  await modal.getByRole('button', { name: 'Salvar perfil' }).click();
  const confirmation = page
    .getByRole('dialog')
    .filter({ hasText: 'Confirme sua conta' });
  await expect(confirmation).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__securityGoogle?.nonce))
    .toBe('security-nonce-test');
  await confirmation
    .getByRole('button', { name: 'Confirmar Google teste' })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.locator('.toast[aria-live=polite]')).toContainText(
    'Perfil salvo',
  );
  expect(attempts).toBe(2);
});
