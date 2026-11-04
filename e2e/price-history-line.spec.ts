import { test, expect } from './coverage';

test('histórico conecta pontos separados por lacunas no card e no gráfico ampliado', async ({ page }) => {
  await page.route('**/api/price-history?*', async route => {
    const ids = new URL(route.request().url()).searchParams.get('ids')!.split(',');
    const points = [null, 10000, null, 12000, null].map((priceCents, i) => ({
      date: `2026-01-0${i + 1}`, priceCents,
      observedDate: priceCents === null ? null : `2026-01-0${i + 1}`,
    }));
    await route.fulfill({ json: {
      startDate: '2026-01-01', endDate: '2026-01-05', intervalDays: 1,
      timeZone: 'America/Sao_Paulo', aggregation: 'daily_minimum',
      series: ids.map(id => ({ id, points, daily: points, lowestPriceCents: 10000, productLowestPriceCents90d: 10000 })),
    } });
  });
  await page.goto('/');
  const chart = page.locator('product-card price-history-chart').first();
  await expect(chart.locator('.dot')).toHaveCount(2);
  const path = await chart.locator('path.line').getAttribute('d');
  expect(path!.match(/M/g)).toHaveLength(1);
  expect(path!.match(/L/g)).toHaveLength(1);
  expect(path).not.toContain('NaN');
  await chart.getByRole('button', { name: /Ampliar histórico/ }).click();
  const dialog = page.getByRole('dialog', { name: /Histórico de preços:/ });
  await expect(dialog.locator('.dot')).toHaveCount(2);
  expect(await dialog.locator('path.line').getAttribute('d')).toBe(path);
});

test('histórico sem nenhum preço continua vazio em vez de mostrar zero', async ({ page }) => {
  await page.route('**/api/price-history?*', async route => {
    const ids = new URL(route.request().url()).searchParams.get('ids')!.split(',');
    await route.fulfill({ json: {
      startDate: '2026-01-01', endDate: '2026-01-05', intervalDays: 1,
      timeZone: 'America/Sao_Paulo', aggregation: 'daily_minimum',
      series: ids.map(id => ({ id, points: [{ date: '2026-01-05', priceCents: null, observedDate: null }], lowestPriceCents: null, productLowestPriceCents90d: null })),
    } });
  });
  await page.goto('/');
  const chart = page.locator('product-card price-history-chart').first();
  await expect(chart).toContainText('Ainda não há preços registrados neste período.');
  await expect(chart.locator('path.line')).toHaveCount(0);
});
