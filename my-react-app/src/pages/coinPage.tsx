// CoinPage.tsx
import React, { useEffect, useState } from "react";
import CoinProfile from "../components/coin/coinProfile";
import CryptoTokenDetails from "../components/coin/cryptoTokenDetail";
import SimilarCoins from "../components/coin/similiarCoin";
import BuyAndSell from "../components/coin/BuyAndSell";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getSolanaPriceUSD } from "../hooks/solanabalance";

import { Buffer } from "buffer";
import { CoinData } from "../components/coin/CoinFilter";
import CoinHistory from "../components/coin/coinHistory";
window.Buffer = Buffer;

type HistoryItem = {
  id: string;
  key: string;
  score: string;
  description?: string;
  created_at: string;
};

const CoinPage: React.FC = () => {
  	const [history, setHistory] = useState<any | HistoryItem>(); // to adjust this later
	const [coinData, setCoinData] = useState<any | CoinData>(); // to adjust this later
	const [loading, setLoading] = useState(true);
	const { id: mintAddress } = useParams();

	const fetchCoin = async () => {
		if (mintAddress) {
			try {
				// `https://solana-market-place-backend.onrender.com/api/coins/${mintAddress}/full_info/`
				const response = await axios.get(`http://127.0.0.1:8000/api/coins/${mintAddress}/full_info/`);

				const { coin, holders, history } = response.data;

				const solPrice = await getSolanaPriceUSD();

				const mergedData = {
					...coin,
					marketcap: parseFloat(coin.current_marketcap) * solPrice,
					current_marketcap: parseFloat(coin.current_marketcap),
					current_price: parseFloat(coin.current_price),
					start_marketcap: parseFloat(coin.start_marketcap),
					end_marketcap: parseFloat(coin.end_marketcap),
					total_supply: parseFloat(coin.total_supply),
					mint: mintAddress,
					holders, // ✅ add holders to the coin object
				};
				console.log(mergedData)
				// const mergedData: Coin = {
				// ...coin,
				// holders,
				// history,
				// marketcap: parseFloat(coin.current_marketcap) * solPrice,
				// current_marketcap: parseFloat(coin.current_marketcap),
				// };

				setCoinData(mergedData);
				setHistory(history);
				// const [coinRes, coinHistoryRes, holdersRes] = await Promise.all([
				// 	axios.get(`https://solana-market-place-backend.onrender.com/api/coins/${mintAddress}/`),
				// 	axios.get(`https://solana-market-place-backend.onrender.com/api/coin-history/?coin_address=${mintAddress}`),
				// 	axios.get(`https://solana-market-place-backend.onrender.com/api/coins/${mintAddress}/holders`)
				// ]);

				// sethistory(coinHistoryRes.data.results);

				// const solPrice = await getSolanaPriceUSD();
				// const coin = coinRes.data;
				// const holders = holdersRes.data;

				// const mergedData = {
				// ...coin,
				// marketcap: parseFloat(coin.current_marketcap) * solPrice,
				// current_marketcap: parseFloat(coin.current_marketcap),
				// current_price: parseFloat(coin.current_price),
				// start_marketcap: parseFloat(coin.start_marketcap),
				// end_marketcap: parseFloat(coin.end_marketcap),
				// total_supply: parseFloat(coin.total_supply),
				// mint: mintAddress,
				// holders, // ✅ add holders to the coin object
				// };
				// setCoinData(mergedData);
			} catch (err) {
				console.error("Failed to fetch coin data:", err);
			}finally{
				setLoading(false);
			}
		}
	};
	useEffect(() => {
		fetchCoin();
	}, [mintAddress]);

	if (loading) {
		return (
			<div className='flex justify-center items-center h-screen bg-custom-dark-blue'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500'></div>
			</div>
		);
	}

	if (!coinData) {
		return (
			<div className='bg-gray-900 text-white min-h-screen p-4'>
				No data available
			</div>
		);
	}
  
	return (
		<div className='bg-custom-dark-blue w-full items-center overflow-x-hidden'>
			<div className='bg-custom-dark-blue flex flex-col gap-2 mx-auto text-white max-w-7xl p-2 xs:p-4'>
				<div className='flex flex-col gap-4 sm:flex-row'>
					<div className='flex flex-col gap-2 w-full'>
						<CoinProfile coinData={coinData} />
						<CryptoTokenDetails coinData={coinData} />
					</div>
					<div className='flex flex-col gap-2 w-full sm:w-auto'>
						<BuyAndSell fetchCoin={fetchCoin} coinData={coinData} />
						<CoinHistory coinHistory={history} />
					</div>
				</div>
				<SimilarCoins coinData={coinData} />
			</div>
		</div>
	);
};

export default CoinPage;
