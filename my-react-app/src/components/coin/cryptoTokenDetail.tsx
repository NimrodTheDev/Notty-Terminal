import { Copy } from "lucide-react";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Link } from "react-router-dom";
dayjs.extend(relativeTime);

interface CoinData {
	address: string;
	created_at: string;
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
	score: number;
	total_supply: string;
	twitter: string | null;
	website: string | null;
	marketcap: number;
	current_marketcap: number;
	start_marketcap: number;
	end_marketcap: number;
}

interface CryptoTokenDetailsProps {
	coinData: CoinData;
}

export default function CryptoTokenDetails({ coinData }: CryptoTokenDetailsProps) {
	const [copySuccess, setCopySuccess] = useState(false);

	const handleCopyClick = () => {
		navigator.clipboard
			.writeText(coinData.address)
			.then(() => {
				setCopySuccess(true);
				setTimeout(() => setCopySuccess(false), 2000);
			});
	};

	// Calculate relative time
	const timeLaunched = dayjs(coinData.created_at).fromNow();
	// Placeholder for DRS (not in CoinData)
	const drs = coinData.score;
	// Bonding curve progress (hardcoded to 60% for now)
	const bondingProgress = (coinData.current_marketcap /coinData.end_marketcap).toFixed(2);

	return (
		<div className="bg-custom-dark-blue text-white p-8 w-full rounded-lg flex flex-col  ">
			<div className="flex flex-col gap-2">
				<div className="flex flex-col sm:flex-row justify-between">
					<div className="text-[#ccc1fa]">Creator</div>
					<Link to={`https://explorer.solana.com/address/${coinData.creator}?cluster=devnet`} className="font-medium underline text-xs whitespace-wrap">{coinData.creator_display_name || "Smart Contract Owner"}</Link>
				</div>
				<div className="flex flex-col sm:flex-row justify-between">
					<div className="text-[#ccc1fa]">Profile</div>
					<Link to={`/dashboard/profile/${coinData.creator}`} className="font-medium underline text-xs whitespace-wrap">{coinData.creator_display_name || "Smart Contract Owner"}</Link>
				</div>
				<div className="flex justify-between">
					<div className="text-[#ccc1fa]">Time Launched:</div>
					<div className="text-right">{timeLaunched}</div>
				</div>

				<div className="flex justify-between">
					<div className="text-[#ccc1fa]">Marketcap:</div>
					<div className="text-right">${coinData.marketcap.toLocaleString()}</div>
				</div>

				<div className="flex justify-between">
					<div className="text-[#ccc1fa]">DRS:</div>
					<div className="text-right">{drs}</div>
				</div>


				
				<div className="flex items-center  gap-2 justify-between flex-wrap">
					<div className="text-[#ccc1fa]">Contract Address</div>
					<div className="flex">
						<span className="break-all text-xs whitespace-wrap">{coinData.address}</span>
					<button onClick={handleCopyClick} className="hover:text-purple-400 ml-2 transition-colors">
						<Copy size={16} />
					</button>
					{copySuccess && <span className="text-green-400 text-xs ml-1">Copied!</span>}</div>
				</div>

				<div className="flex items-center justify-between"><div className="text-[#ccc1fa]">Total Supply</div>
				<div className="text-right">{coinData.total_supply}</div></div>
			</div>

			{/* Bonding curve progress */}
			<div className="flex items-center gap-4 mt-4">
				<span className="text-[#ccc1fa]">Bonding curve progress</span>
				<div className="flex-1 flex flex-col">
					<div className="flex items-center gap-2">
						<div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden relative">
							<div
								className="bg-green-500 h-full rounded-full"
								style={{ width: `${bondingProgress}%` }}
							></div>
						</div>
						<span className="text-white font-semibold">{bondingProgress}%</span>
						{/* <Info size={16} className="text-gray-400 ml-1" aria-label="Bonding curve info" tabIndex={0} /> */}
					</div>
					{/* <div className="flex justify-between text-xs text-gray-400 mt-1">
						<span>short note below</span>
						<a href="#" className="text-blue-400 hover:underline">link text</a>
					</div> */}
				</div>
			</div>

			{/* Website */}
			{coinData.website && (
				<div className="mt-6 flex items-center justify-between">
					<div className="text-[#ccc1fa] mb-1">Website</div>
					<a
						href={coinData.website.startsWith('http') ? coinData.website : `https://${coinData.website}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-blue-400 hover:underline text-lg"
					>
						{coinData.website.replace(/^https?:\/\//, '')}
					</a>
				</div>
			)}
		</div>
	);
}
