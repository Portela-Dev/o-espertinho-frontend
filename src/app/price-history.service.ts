import { Injectable, inject } from '@angular/core';
import { Api } from './api.service';
export interface DailyPrice {
  date: string;
  priceCents: number | null;
}
export interface HistoryPoint extends DailyPrice {
  observedDate: string | null;
}
export interface HistorySeries {
  id: string;
  productLowestPriceCents90d: number | null;
  isCheapestOffer?: boolean;
  lowestPriceCents: number | null;
  points: HistoryPoint[];
  daily?: DailyPrice[];
}
export interface HistoryResponse {
  startDate: string;
  endDate: string;
  intervalDays: number;
  timeZone: string;
  aggregation: string;
  series: HistorySeries[];
}
export interface ChartHistory extends Omit<HistoryResponse, 'series'> {
  series: HistorySeries;
}
type Request = {
  id: string;
  kind: 'product' | 'offer';
  resolve: (v: ChartHistory) => void;
  reject: (e: unknown) => void;
};
@Injectable({ providedIn: 'root' })
export class PriceHistoryService {
  private readonly api = inject(Api);
  private waiting: Request[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly cache = new Map<
    string,
    { expires: number; promise: Promise<ChartHistory> }
  >();
  compact(kind: 'product' | 'offer', id: string) {
    const key = kind + id,
      cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = new Promise<ChartHistory>((resolve, reject) => {
      this.waiting.push({ kind, id, resolve, reject });
      if (!this.timer)
        this.timer = setTimeout(() => {
          this.timer = undefined;
          void this.flush();
        }, 0);
    });
    this.cache.set(key, { expires: Date.now() + 60000, promise });
    if (this.cache.size > 300)
      this.cache.delete(this.cache.keys().next().value!);
    return promise;
  }
  private async flush() {
    const waiting = this.waiting.splice(0);
    await Promise.all(
      (['product', 'offer'] as const).map(async (kind) => {
        const requests = waiting.filter((r) => r.kind === kind);
        for (let at = 0; at < requests.length; at += 48) {
          const batch = requests.slice(at, at + 48);
          try {
            const response = await this.api.get<HistoryResponse>(
              '/price-history',
              {
                kind,
                ids: [...new Set(batch.map((r) => r.id))].join(','),
                days: 90,
              },
            );
            for (const request of batch)
              request.resolve({
                ...response,
                series: response.series.find((s) => s.id === request.id) ?? {
                  id: request.id,
                  lowestPriceCents: null,
                  productLowestPriceCents90d: null,
                  points: [],
                },
              });
          } catch (e) {
            for (const request of batch) {
              this.cache.delete(kind + request.id);
              request.reject(e);
            }
          }
        }
      }),
    );
  }
  async detail(
    kind: 'product' | 'offer',
    id: string,
    query: Record<string, unknown>,
  ): Promise<ChartHistory> {
    const r = await this.api.get<HistoryResponse>('/price-history', {
      kind,
      ids: id,
      details: 'true',
      ...query,
    });
    return {
      ...r,
      series: r.series.find((s) => s.id === id) ?? {
        id,
        lowestPriceCents: null,
        productLowestPriceCents90d: null,
        points: [],
        daily: [],
      },
    };
  }
}
