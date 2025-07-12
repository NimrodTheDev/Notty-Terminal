import type { BondingCurveConfig } from "../bonding-interface";

export const DEFAULT_CONFIG: BondingCurveConfig = {
  totalSupply: 1_000_000_000,
  startMarketCap: 3750,
  endMarketCap: 69000,
  solPrice: 150,
  creationFee: 0.05,
  liquidityPercentage: 50
};
