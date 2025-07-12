import { type BondingCurveConfig } from "../bonding-interface";

export const calculateTokenPrice = (
  currentMarketCap: number,
  config: BondingCurveConfig
): number => {
  const { startMarketCap, endMarketCap, totalSupply } = config;

  if (currentMarketCap <= startMarketCap) {
    return startMarketCap / totalSupply;
  }

  if (currentMarketCap >= endMarketCap) {
    return endMarketCap / totalSupply;
  }

  // Linear interpolation
  const progress =
    (currentMarketCap - startMarketCap) / (endMarketCap - startMarketCap);
  const priceAtStart = startMarketCap / totalSupply;
  const priceAtEnd = endMarketCap / totalSupply;

  return priceAtStart + (priceAtEnd - priceAtStart) * progress;
};

export const calculateTokensForSol = (
  solAmount: number,
  currentMarketCap: number,
  config: BondingCurveConfig
): number => {
  const usdAmount = solAmount * config.solPrice;
  const currentPrice = calculateTokenPrice(currentMarketCap, config);

  // Linear curve - use average price for approximation
  const newMarketCap = currentMarketCap + usdAmount;
  const newPrice = calculateTokenPrice(newMarketCap, config);
  const averagePrice = (currentPrice + newPrice) / 2;

  return usdAmount / averagePrice;
};

export const calculateSolForTokens = (
  tokenAmount: number,
  currentMarketCap: number,
  config: BondingCurveConfig
): number => {
  const currentPrice = calculateTokenPrice(currentMarketCap, config);
  const usdAmount = tokenAmount * currentPrice;

  return usdAmount / config.solPrice;
};

// Utility functions
export const formatPrice = (price: number): string => price.toExponential(3);
export const formatMarketCap = (mc: number): string => {
  if (mc >= 1000000) return `$${(mc / 1000000).toFixed(2)}M`;
  if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
};

export const calculateProgress = (
  currentMC: number,
  startMC: number,
  endMC: number
): number => {
  return Math.min(
    100,
    Math.max(0, ((currentMC - startMC) / (endMC - startMC)) * 100)
  );
};

export const isComplete = (
  currentMarketCap: number,
  config: BondingCurveConfig
): boolean => {
  return currentMarketCap >= config.endMarketCap;
};
