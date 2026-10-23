import { test, expect, Page, BrowserContext } from './coverage';
async function googleMock(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    const state = {
      initialize: 0,
      prompt: 0,
      cancel: 0,
      disable: 0,
      options: {} as any,
    };
    (window as any).__googleState = state;
    (window as any).google = {
      accounts: {
        id: {
          initialize(options: any) {
            state.initialize++;
            state.options = options;
            (window as any).__googleCredential = options.callback;
          },
          renderButton(el: HTMLElement) {
            const b = document.createElement('button');
            b.textContent = 'Google de teste';
            b.onclick = () => {
              (window as any).__googleCredential({
                credential: 'returning-user',
                select_by: 'btn',
              });
            };
            el.appendChild(b);
          },
          prompt() {
            state.prompt++;
            queueMicrotask(() =>
              (window as any).__googleCredential({
                credential: 'returning-user',
                select_by: 'fedcm_auto',
              }),
            );
          },
          cancel() {
            state.cancel++;
          },
          disableAutoSelect() {
            state.disable++;
          },
        },
      },
    };
  });
}

test('sessão persiste ao reabrir; Google restaura sessão ausente; Sair bloqueia retorno e callback tardio', async ({
  page,
  context,
  browser,
}) => {
  await googleMock(page);
  const automaticRequests: boolean[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/auth/google'))
      automaticRequests.push(r.postDataJSON()?.automatic === true);
  });
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Google de teste' }).click();
  await expect(
    page.getByRole('link', { name: 'Conta de Pessoa returning-user' }),
  ).toBeVisible();
  const cookies = await context.cookies(),
    sid = cookies.find((c) => c.name === 'espertinho.sid')!,
    xsrf = cookies.find((c) => c.name === 'XSRF-TOKEN')!;
  expect(sid.httpOnly).toBe(true);
  expect(xsrf.httpOnly).toBe(false);
  expect(sid.expires - Date.now() / 1000).toBeGreaterThan(29 * 86400);
  expect(
    await page.evaluate(
      () => (window as any).__googleState.options.auto_select,
    ),
  ).toBe(true);
  // Restore browser state in a new context, including persistent cookies, without another Google login.
  const reopened = await browser.newContext({
    storageState: await context.storageState(),
  });
  await googleMock(reopened);
  const reopenedPage = await reopened.newPage();
  await reopenedPage.goto('/minha-conta');
  await expect(
    reopenedPage.getByRole('heading', { name: 'Pessoa returning-user' }),
  ).toBeVisible();
  expect(
    await reopenedPage.evaluate(() => (window as any).__googleState.prompt),
  ).toBe(0);
  await reopened.close();
  // Keep only the non-secret local return marker; simulate an expired/removed session cookie.
  await context.clearCookies({ name: 'espertinho.sid' });
  await context.clearCookies({ name: 'XSRF-TOKEN' });
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Conta de Pessoa returning-user' }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__googleState.prompt)).toBe(
    1,
  );
  expect(automaticRequests).toEqual([false, true]);
  const other = await context.newPage();
  await googleMock(other);
  await other.goto('/');
  await expect(
    other.getByRole('link', { name: 'Conta de Pessoa returning-user' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Conta de Pessoa returning-user' })
    .click();
  await page
    .getByRole('button', { name: 'Sair da conta', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: false }).first(),
  ).toBeVisible();
  await expect(
    other.getByRole('link', { name: 'Conta de Pessoa returning-user' }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).__googleState.disable),
  ).toBeGreaterThan(0);
  expect(
    (await context.cookies()).find((c) => c.name === 'espertinho.signed_out')
      ?.value,
  ).toBe('1');
  await page.evaluate(() =>
    (window as any).__googleCredential({
      credential: 'returning-user',
      select_by: 'fedcm_auto',
    }),
  );
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: false }).first(),
  ).toBeVisible();
  expect(automaticRequests).toEqual([false, true]);
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: false }).first(),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__googleState.prompt)).toBe(
    0,
  );
  expect(
    (await (await page.request.get('/api/auth/session')).json())
      .autoSignInAllowed,
  ).toBe(false);
  // Choosing the manual button explicitly clears the logout preference.
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Google de teste' }).click();
  await expect(
    page.getByRole('link', { name: 'Conta de Pessoa returning-user' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('espertinho-auth-signed-out'),
    ),
  ).toBe('0');
  expect(
    (await context.cookies()).find((c) => c.name === 'espertinho.signed_out'),
  ).toBeUndefined();
  expect(automaticRequests).toEqual([false, true, false]);
  await other.close();
});

test('falha no SDK do Google não bloqueia a vitrine nem cria login; entrada manual permite tentar de novo', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('espertinho-auth-returning', '1'),
  );
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await expect(page.locator('product-card').first()).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Buscar ofertas' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator('.toast.error')).toHaveCount(0);
  await page.goto('/entrar');
  await expect(
    page.getByText(
      'Não foi possível carregar o login Google. Confira bloqueadores e conexão.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tentar novamente', exact: true }),
  ).toBeVisible();
});
