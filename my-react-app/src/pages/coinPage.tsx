 // CoinPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import CoinProfile from "../components/coin/coinProfile";
// import HoldersAnalytics from "../components/coin/coinHolder";
import CryptoTokenDetails from "../components/coin/cryptoTokenDetail";
// import CoinComments from "../components/coin/comment";
// import CryptoTradingWidget from "../components/coin/tradingWidget";
import SimilarCoins from "../components/coin/similiarCoin";
import BuyAndSell from "../components/coin/BuyAndSell";
import { useParams } from "react-router-dom";

interface CoinData {
  address: string;
  created_at: string;
  score: number;
  creator: string;
  creator_display_name: string;
  current_price: string;
  description: string | null;
  image_url: string;
  market_cap: number;
  name: string;
  telegram: string | null;
  ticker: string;
  total_held: number;
  total_supply: string;
  twitter: string | null;
  website: string | null;
  decimals: number;
  price_per_token: string;//if a string convert to number
}

const CoinPage: React.FC = () => {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchCoinData = async () => {
      if (!id) {
        setCoinData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<CoinData>(
          `https://solana-market-place-backend.onrender.com/api/coins/${id}`
        );
        setCoinData(response.data);
		// we can add promise all or holder info, or finish it with the backend
      } catch (e) {
        setError("Failed to fetch coin data");
        console.error("Error fetching coin data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCoinData();
  }, [id]);

  if (loading) { // make better loading
    return(
		<div className="flex justify-center items-center h-screen bg-custom-dark-blue">
			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
		</div>
	);
  }

  if (error || !coinData) {
    return <div className="bg-gray-900 text-white min-h-screen p-4">{error || "No data available"}</div>;
  }

  return (
    <div className="bg-custom-dark-blue w-full items-center">
      <div className="bg-custom-dark-blue flex flex-col gap-2 mx-auto text-white max-w-7xl p-4">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-2 w-full">
            <CoinProfile coinData={coinData} />
            <CryptoTokenDetails coinData={coinData} />
            {/* <CoinComments coinData={coinData} /> */}
          </div>
          <div className="flex flex-col gap-2">
            <BuyAndSell coinData={coinData} />
            {/* <CryptoTradingWidget coinData={coinData} /> */}
            {/* <HoldersAnalytics coinData={coinData} /> */}
          </div>
        </div>
        <SimilarCoins coinData={coinData} />
      </div>
    </div>
  );
};

export default CoinPage;
