import { z } from "zod";

export type PricingRateDTO = {
  id: string;
  service: string;
  unitLabel: string;
  ratePerUnit: number;
  flatFee: number;
  minimumPrice: number;
  notes: string | null;
};

export function serializePricingRate<
  T extends { ratePerUnit: unknown; flatFee: unknown; minimumPrice: unknown },
>(rate: T) {
  return {
    ...rate,
    ratePerUnit: Number(rate.ratePerUnit),
    flatFee: Number(rate.flatFee),
    minimumPrice: Number(rate.minimumPrice),
  };
}

/**
 * The Estimator's formula: quantity (linear feet, squares, windows,
 * downspouts, sq ft — whatever `unitLabel` says) times the configured
 * rate, plus a flat fee, floored at a configured minimum job price. All
 * three numbers come from Settings > Pricing Rates, set by the business
 * owner — nothing here is an assumed/guessed dollar figure.
 */
export function estimateJobValue(
  quantity: number,
  rate: Pick<PricingRateDTO, "ratePerUnit" | "flatFee" | "minimumPrice">
): { raw: number; estimate: number; hitMinimum: boolean } {
  const raw = quantity * rate.ratePerUnit + rate.flatFee;
  const estimate = Math.max(raw, rate.minimumPrice);
  return { raw, estimate, hitMinimum: estimate > raw };
}

export const pricingRateInputSchema = z.object({
  id: z.string().min(1),
  ratePerUnit: z.number().min(0),
  flatFee: z.number().min(0),
  minimumPrice: z.number().min(0),
  unitLabel: z.string().trim().min(1).optional(),
});

export const pricingRatesPatchSchema = z.object({
  rates: z.array(pricingRateInputSchema),
});
