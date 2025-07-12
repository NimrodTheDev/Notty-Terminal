// Bonding Curve Configuration
export interface BondingCurveConfig {
  totalSupply: number;
  startMarketCap: number; // in USD
  endMarketCap: number; // in USD
  solPrice: number; // USD per SOL
  creationFee: number; // in SOL
  liquidityPercentage: number; // percentage of raised funds for liquidity
}

export interface TokenLaunchParams {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  decimals: number;
}

export interface BondingCurveState {
  currentMarketCap: number;
  currentPrice: number;
  totalRaised: number;
  tokensRemaining: number;
  isComplete: boolean;
}

export interface TokenData {
  id?: string; // Firestore document ID
  mint: string;
  creator: string;
  totalSupply: number;
  totalRaised: number;
  tokensAvailable: number;
  isComplete: boolean;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
  metadata: TokenLaunchParams;
}

export interface TransactionRecord {
  id?: string;
  tokenMint: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  solAmount: number;
  timestamp: any; // Firebase Timestamp
  user: string;
  txSignature: string;
}
