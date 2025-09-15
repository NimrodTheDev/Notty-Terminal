import { useState, useEffect, useMemo } from "react";
// import { useSolana } from "../../solanaClient";
import { Link, useParams } from "react-router-dom";
// import { PublicKey } from "@solana/web3.js";
// import { Link } from "react-router-dom";
import { useSolBalance, getSolanaPriceUSD } from "../../hooks/solanabalance";
// import { Toast, useToast } from "../general/Toast";
// import axios from "axios";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSolana } from "../../solanaClient";
import { web3 } from "@coral-xyz/anchor";

interface BuyAndSellProps {
	coinData?: {
		ticker?: string;
		current_price?: string;
		holders?:[];
	};
	fetchCoin: () => void;
}

function shortenAddress(address: string) {
	if (!address || address.length < 10) return address;
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function sumHeldPercentageByScore(
	holders: any,
	scoreThreshold: number,
	scoreThreshold2: number
  ): number {
	// return holders
	//   .filter((h: { user_traderscore: number; }) => (h.user_traderscore < scoreThreshold && h.user_traderscore >= scoreThreshold2))
	//   .reduce((sum: any, h: { held_percentage: any; }) => sum + h.held_percentage, 0);
	const total = holders.length;
	if (total === 0) return 0;

	const countInRange = holders.filter(
		(h: { user_traderscore: number }) =>
		h.user_traderscore < scoreThreshold &&
		h.user_traderscore >= scoreThreshold2
	).length;

	return (countInRange / total) * 100; // return percentage of people
}

function formatPercent(value: number, decimals = 4) {
	const threshold = 1 / Math.pow(10, decimals); // e.g. 0.0001 if decimals=4

	if (value > 0 && value < threshold) {
		return `≤${threshold}`;
	}

	return value.toFixed(decimals).replace(/\.?0+$/, "");
}

function BuyAndSell({ coinData, fetchCoin }: BuyAndSellProps) {
	const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
	const [amount, setAmount] = useState("0.1");
	const { id } = useParams();
	const { BuyTokenMint, SellTokenMint, loading } = useSolana();
	const { connection } = useConnection();
	const [solPrice, setSolPrice] = useState<number>(1);
	const tokenPrice = useMemo(() => {
		const coinPriceInSol = parseFloat(coinData?.current_price || "0");
		return coinPriceInSol * solPrice;
	}, [coinData?.current_price, solPrice]);
	const { balance } = useSolBalance(connection);

	useEffect(() => {
		let isMounted = true;

		const fetchSolPrice = async () => {
			try {
				const price = await getSolanaPriceUSD();
				if (isMounted && price) {
					setSolPrice(price);
				}
			} catch (err) {
				console.error("Failed to fetch SOL price:", err);
			}
		};

		fetchSolPrice(); // Fetch immediately on mount
		const interval = setInterval(fetchSolPrice, 60000 * 5); // Then every 60s*5

		return () => {
			isMounted = false;
			clearInterval(interval); // Clean up on unmount
		};
	}, []);

	const [topHolders, setTopHolders] = useState<
		{ address: string; percentage: string; drs: string, fullAddress: string }[]
	>([
		{ address: "8rqb2fJrj...", percentage: "92%", drs: "40", fullAddress: "8rqb2fJrj..." },
		{ address: "8rqb2fJrj...", percentage: "0.97%", drs: "40", fullAddress: "8rqb2fJrj..." },
		{ address: "8rqb2fJrj...", percentage: "0.97%", drs: "40", fullAddress: "8rqb2fJrj..." },
		{ address: "8rqb2fJrj...", percentage: "0.97%", drs: "40", fullAddress: "8rqb2fJrj..." },
		{ address: "8rqb2fJrj...", percentage: "0.97%", drs: "40", fullAddress: "8rqb2fJrj..." },
	]);

	// For analytics summary
	const [holderAnalytics, setHolderAnalytics] = useState<
		{ label: string; value: string }[]
	>([
		{ label: "Total Holders", value: "200,000" },
		{ label: 'Holders with DRS > 1000', value: '25%' },
		{ label: 'Holders with DRS > 1000', value: '25%' },
		{ label: 'Holders with DRS > 1000', value: '25%' },
	]);

	const getFormattedValues = (amount: string, price: number) => {
		const parsedAmount = parseFloat(amount || "0");
		const solVaue = parsedAmount * price;
		const usdValue = solVaue * solPrice;

		const usdFormatted = usdValue.toLocaleString("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 4,
		});

		const solFormatted = `${solVaue.toFixed(4)} SOL`;
		// look at price per token properly

		return { usdFormatted, solFormatted };
	};

	const { usdFormatted, solFormatted } = useMemo(() => {
		return getFormattedValues(
			amount,
			parseFloat(coinData?.current_price || "0")
		);
	}, [amount, coinData?.current_price]);

	useEffect(() => {
		if (!coinData?.holders) return;
	  
		const holders = coinData.holders;
	  
		setTopHolders(
		  holders
			.sort((a: any, b: any) => b.held_percentage - a.held_percentage)
			.slice(0, 10)
			.map((item: any) => ({
			  percentage: `${formatPercent(item.held_percentage)}%`,
			  address: shortenAddress(item.wallet_address), // change to to either formated or a name if possible
			  drs: item.traderscore,
			  fullAddress: item.wallet_address,
			}))
		);
	  
		setHolderAnalytics([
		  { label: "Total Holders", value: holders.length.toString() },
		  { label: 'DRS [ 2000 > ]', value: sumHeldPercentageByScore(holders, 100000000, 1999).toLocaleString() + "%" },
		  { label: 'DRS [ 1999 - 1000 ]', value: sumHeldPercentageByScore(holders, 1999, 1000).toLocaleString() + "%" },
		  { label: 'DRS [ 999 - 500 ]', value: sumHeldPercentageByScore(holders, 999, 500).toLocaleString() + "%" },
		  { label: 'DRS [ 499 - 200 ]', value: sumHeldPercentageByScore(holders, 499, 200).toLocaleString() + "%" },
		  { label: 'DRS [ 199 - 0 ]', value: sumHeldPercentageByScore(holders, 199, 0).toLocaleString() + "%" },
		]);
	  }, [coinData?.holders]);

	return (
		<div className='bg-custom-dark-blue rounded-lg p-4 text-white md:mr-12 lg:mr-24 w-full'>
			{/* Buy/Sell Tabs */}
			<div className='flex justify-between lg:w-64 mb-4'>
				<button
					onClick={() => setActiveTab("buy")}
					className={`py-2 px-4 rounded-md w-24 font-medium ${
						activeTab === "buy"
							? "bg-custom-light-purple text-white"
							: "bg-gray-700 text-gray-300 hover:bg-gray-600"
					}`}
				>
					Buy
				</button>
				<button
					onClick={() => setActiveTab("sell")}
					className={`py-2 px-4 rounded-md w-24 font-medium ${
						activeTab === "sell"
							? "bg-custom-light-purple text-white"
							: "bg-gray-700 text-gray-300 hover:bg-gray-600"
					}`}
				>
					Sell
				</button>
			</div>

			<div className='flex justify-end text-sm text-gray-400 mt-1'>
				<span className='italic tracking-tight'>
					{solFormatted} ({usdFormatted})
				</span>
			</div>

			{/* Amount Input */}
			<div className='mb-0'>
				<div className='relative'>
					<input
						type='number'
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className='w-full bg-custom-dark-blue border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
						step='0.001'
						min='0'
					/>
					<span className='absolute right-3 top-2 text-gray-400'>
						{
							// activeTab === "buy" ? "SOL" :
							coinData?.ticker
						}
					</span>
				</div>
			</div>

			{/* Token Price and Balance Info */}
			<div className='flex flex-wrap sm:flex-nowrap justify-between ml-1 mt-2 items-center text-sm gap-2 sm:gap-4 mb-2'>
				<div className='text-gray-400 break-words max-w-full sm:max-w-none'>
					Balance{" "}
					<span className='text-white font-light break-all'>
						{balance.toFixed(4)} SOL
					</span>
				</div>
				<div className='text-gray-400 break-words max-w-full sm:max-w-none text-right sm:text-left'>
					<span className='text-purple-400 break-all'>
						$
						{tokenPrice.toLocaleString(undefined, {
							maximumFractionDigits: 9,
						})}
					</span>{" "}
					per token
				</div>
			</div>

			{/* Action Button */}
			<button
				disabled={loading}
				onClick={async () => {
					let mintAccount = new web3.PublicKey(id || "");
					if (BuyTokenMint && activeTab === "buy") {
						console.log("called");
						let { tx } = await BuyTokenMint(
							mintAccount,
							Number(amount) * 1_000_000_000
						);
						console.log(tx);
					}
					if (activeTab === "sell" && SellTokenMint) {
						let { tx } = await SellTokenMint(
							mintAccount,
							Number(amount) * 1_000_000_000
						);
						console.log(tx);
					}
					fetchCoin();
				}}
				// disabled={isProcessing || !publicKey}
				className={`w-full py-2 px-4 rounded-md font-medium mb-4 transition-colors ${
					activeTab === "buy"
						? "bg-green-600 hover:bg-green-700"
						: "bg-red-600 hover:bg-red-700"
				}`}
			>
				{loading
					? "loading..."
					: activeTab === "buy"
					? `Buy ${coinData?.ticker}`
					: `Sell ${coinData?.ticker}`}
			</button>

			{/* Top Holders Section */}
			<div className='mb-6'>
				<h3 className=' text-[#CCC1FA] font-medium my-8'>Top Holders</h3>
				<div className='space-y-2 mb-12'>
					{topHolders.length === 0 ? (
						<p>No holders found</p>
					) : (
						topHolders.map((holder, index) => (
							<div key={index} className='flex items-center justify-between'>
								<div className='flex items-center'>
									<div className='w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2'>
										<span className='text-xs font-bold text-black'>🏆</span>
									</div>
									<span className='text-custom-light-purple text-sm font-mono'>
										<Link to={`/dashboard/profile/${holder.fullAddress}`} className="font-medium underline text-xs whitespace-wrap">{holder.address || "Proud Holder"} [DRS {holder.drs}]</Link>
									</span>
								</div>
								<span className='text-gray-300 text-sm'>
									{holder.percentage}
								</span>
							</div>
						))
					)}
				</div>
			</div>
{/* {console.log(coinData?.holders)} */}

			{/* Holder Analytics Section */}
			<div>
				<h3 className='text-[#CCC1FA] font-medium my-8'>Holder Analytics</h3>
				{/* add % */}
				<div className='space-y-2 mb-12'>
					{holderAnalytics.map((analytic, index) => (
						<div key={index} className='flex items-center justify-between'>
							<div className='flex items-center'>
								<div className='w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2'>
									<span className='text-xs font-bold text-black'>🏆</span>
								</div>
								<span className='text-custom-light-purple text-sm'>
									{analytic.label}
								</span>
							</div>
							<span className='text-gray-300 text-sm'>{analytic.value}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default BuyAndSell;
