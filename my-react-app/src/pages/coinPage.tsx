// CoinPage.tsx
import React, { useEffect, useState } from "react";
import CoinProfile from "../components/coin/coinProfile";
import CryptoTokenDetails from "../components/coin/cryptoTokenDetail";
import SimilarCoins from "../components/coin/similiarCoin";
import BuyAndSell from "../components/coin/BuyAndSell";
import { useParams } from "react-router-dom";
import { useToken } from "../hooks/useToken";
import { TokenData } from "../bonding-interface";
import axios from "axios";
import { getSolanaPriceUSD } from "../hooks/solanabalance"

import { Buffer } from "buffer";
import { CoinData } from "../components/coin/CoinFilter";
window.Buffer = Buffer;

// Dummy CoinData for testing
const getDummyCoinData = (mintAddress: string) => ({
  address: mintAddress,
  created_at: new Date().toISOString(),
  score: 8.5,
  creator: "DummyCreatorAddress",
  creator_display_name: "Dummy Creator",
  current_price: 0.05,
  description: "This is a dummy token for testing purposes",
  image_url: "https://via.placeholder.com/150",
  market_cap: 1000000,
  name: "Dummy Token",
  telegram: "https://t.me/dummy",
  ticker: "DUMMY",
  total_held: 500000,
  total_supply: "1000000",
  twitter: "@dummytoken",
  website: "https://dummytoken.com",
  decimals: 6,
  price_per_token: "0.05"
});

const CoinPage: React.FC = () => {
  const [coinData, setCoinData] = useState<any | (TokenData & CoinData)>(); // to adjust this later
  const [loading, setLoading] = useState(true);
  const { id: mintAddress } = useParams();
  const { token: tokenData, loading: tokenLoading } = useToken(
    mintAddress || ""
  );

  // useEffect(()  => {
  //   if (!tokenLoading && mintAddress) {
  //     // Merge dummy data with tokenData from Firebase
  //     const dummyCoinData = getDummyCoinData(mintAddress || "");
  //     const mergedData = {
  //       ...tokenData,
  //       ...dummyCoinData,
  //       mint: (tokenData && tokenData.mint) || mintAddress
  //     };
  //     const response = await axios.get(
  //       // `http://127.0.0.1:8000/api/coins/${mintAddress}
  //       `https://solana-market-place-backend.onrender.com/api/coins/${mintAddress}`
  //     );
  //     console.log(response.data)
  //     setCoinData(mergedData);
  //     setLoading(false);
  //   }
  // }, [tokenLoading, mintAddress, tokenData]);

  useEffect(() => {
    const fetchCoin = async () => {
      if (!tokenLoading && mintAddress) {
        try {
          // Merge dummy data with tokenData from Firebase
          // const dummyCoinData = getDummyCoinData(mintAddress);
          
          const response = await axios.get(
            `https://solana-market-place-backend.onrender.com/api/coins/${mintAddress}/`
          );
          const solPrice = await getSolanaPriceUSD();

          const coin = response.data;
          const mergedData = {
            ...tokenData,
            ...coin,
            marketcap: parseFloat(coin.current_marketcap) * solPrice,
            current_marketcap: parseFloat(coin.current_marketcap),
            current_price: parseFloat(coin.current_price),
            start_marketcap: parseFloat(coin.start_marketcap),
            end_marketcap: parseFloat(coin.end_marketcap),
            total_supply: parseFloat(coin.total_supply),
            mint: (tokenData && tokenData.mint) || mintAddress
          };
          setCoinData(mergedData);
          setLoading(false);
        } catch (err) {
          console.error("Failed to fetch coin data:", err);
          setLoading(false);
        }
      }
    };
  
    fetchCoin();
  }, [tokenLoading, mintAddress, tokenData]);
  

  if (loading || tokenLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-custom-dark-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!coinData) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-custom-dark-blue w-full items-center">
      <div className="bg-custom-dark-blue flex flex-col gap-2 mx-auto text-white max-w-7xl p-4">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-2 w-full">
            <CoinProfile coinData={coinData} />
            <CryptoTokenDetails coinData={coinData} />
          </div>
          <div className="flex flex-col gap-2">
            <BuyAndSell coinData={coinData} />
          </div>
        </div>
        <SimilarCoins coinData={coinData} />
      </div>
    </div>
  );
};

export default CoinPage;