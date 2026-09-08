/**
 * Explainable weekly demand forecasting.
 *
 * Method (deliberately simple enough to put on a slide — see ADR-0006):
 *   1. weighted moving average (weights 1..4) over the most recent weeks,
 *   2. damped linear trend from least-squares over the full history,
 *   3. multiplicative seasonal index per phase of a 4-week cycle,
 *   4. confidence band sized by the model's mean absolute percentage error (MAPE), clamped to 8–35%.
 *
 * Pure functions only: no I/O, no randomness, no ML runtime. Deterministic given the same history.
 */

export type ForecastPoint = {
  weekLabel: string;
  bags: number;
  low: number;
  high: number;
};

export type ForecastResult = {
  horizon: number;
  forecast: ForecastPoint[];
  method: string;
  /** Weighted moving average of the last 4 observed weeks (bags). */
  wmaBags: number;
  /** Least-squares trend over the full history (bags per week). */
  trendPerWeek: number;
  /** Mean absolute percentage error of the trend model over history (percent). */
  mapePct: number;
};

export type ForecastOptions = {
  /** Labels for the forecast weeks; defaults to "Week +n". */
  labels?: string[];
  /** Seasonal cycle length in weeks. Weekly demand data typically cycles every 4 weeks. */
  seasonalPeriod?: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function forecastDemand(history: number[], horizon = 4, options?: ForecastOptions): ForecastResult {
  const seasonalPeriod = options?.seasonalPeriod ?? 4;
  const n = history.length;
  if (n < seasonalPeriod * 2) {
    throw new Error(`Demand history needs at least ${seasonalPeriod * 2} weeks (two full seasonal cycles).`);
  }
  if (!history.every((point) => Number.isFinite(point) && point >= 0)) {
    throw new Error("Demand history must be non-negative finite numbers.");
  }

  // 1. linear trend (least squares over the whole history)
  const meanX = (n - 1) / 2;
  const meanY = history.reduce((sum, y) => sum + y, 0) / n;
  let covariance = 0;
  let variance = 0;
  history.forEach((y, x) => {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  });
  const trend = variance === 0 ? 0 : covariance / variance;
  const trendAt = (x: number) => meanY + trend * (x - meanX);

  // 2. weighted moving average of the most recent 4 weeks
  const weights = [1, 2, 3, 4];
  const tail = history.slice(-4);
  const wma = tail.reduce((sum, y, i) => sum + y * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);

  // 3. seasonal index: average ratio of actuals to the trend line, per phase of the cycle
  const seasonalSum = new Array<number>(seasonalPeriod).fill(0);
  const seasonalCount = new Array<number>(seasonalPeriod).fill(0);
  history.forEach((y, x) => {
    const baseline = trendAt(x);
    const ratio = baseline !== 0 ? y / baseline : 1;
    seasonalSum[x % seasonalPeriod] += ratio;
    seasonalCount[x % seasonalPeriod] += 1;
  });
  const seasonalIndex = seasonalSum.map((sum, i) => (seasonalCount[i] > 0 ? sum / seasonalCount[i] : 1));

  // 4. model error → confidence band (clamped so it stays presentable and honest)
  const mape = history.reduce((sum, y, x) => sum + Math.abs(y - trendAt(x)) / Math.max(y, 1), 0) / n;
  const band = Math.max(0.08, Math.min(0.35, mape));

  const forecast: ForecastPoint[] = Array.from({ length: horizon }, (_, i) => {
    const step = i + 1;
    const dampedTrend = trend * step * 0.6; // damping: distant weeks revert toward the average
    const seasonalFactor = seasonalIndex[(n + i) % seasonalPeriod];
    const point = Math.max(0, (wma + dampedTrend) * seasonalFactor);
    return {
      weekLabel: options?.labels?.[i] ?? `Week +${step}`,
      bags: round1(point),
      low: round1(Math.max(0, point * (1 - band))),
      high: round1(point * (1 + band)),
    };
  });

  return {
    horizon,
    forecast,
    method: "weighted moving average + damped linear trend + 4-week seasonal index",
    wmaBags: round1(wma),
    trendPerWeek: round2(trend),
    mapePct: round1(mape * 100),
  };
}