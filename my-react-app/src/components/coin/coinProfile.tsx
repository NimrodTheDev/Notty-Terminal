import { Twitter, Globe } from "lucide-react";
import { useState } from "react";
import img from "../../assets/images/istockphoto-1409329028-612x612.jpg";

// Define the type for the coin data
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
	discord?: string;
	total_supply: string;
	twitter: string | null;
	website: string | null;
}

interface CoinProfileProps {
	coinData: CoinData;
}

export default function CoinProfile({ coinData }: CoinProfileProps) {
	const [fireCount] = useState(coinData.score);
	const handleFireClick = () => {
		// setFireCount((prevCount) => prevCount + 1);
	};

	return (
		<div className="bg-custom-dark-blue w-full overflow-x-hidden text-white p-4">
			<div className="max-w-2xl mx-auto flex flex-col items-center">
				{/* Header */}
				<div className="mb-6 text-center">
					<h1 className="text-4xl font-bold">
						{coinData.name} ({coinData.ticker})
					</h1>
				</div>

				{/* Cat Image */}
				<div className="mb-8">
					<div className="rounded-xl overflow-hidden border-2 border-gray-700 max-w-md aspect-[16/9]">
						<img
							src={coinData.image_url || img}
							alt={`${coinData.name} image`}
							className="w-full h-full object-cover"
						/>
					</div>
				</div>

				<div className="mb-4">
					<div
						className="text-center text-gray-300 space-x-2"
						onClick={handleFireClick}
					>
						<span className="text-2xl font-semibold">DRS</span>
						<span className="text-2xl">{fireCount}</span>
					</div>
				</div>

				{/* Social Links */}
				<div className="flex justify-center gap-4 mb-8">
					{coinData?.twitter && (
						<a
							href={"https://x.com/" + coinData?.twitter}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 rounded-full transition-colors"
						>
							<Twitter size={20} />
						</a>
					)}
					{coinData?.website && (
						<a
							href={coinData?.website}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 rounded-full transition-colors"
						>
							<Globe size={20} />
						</a>
					)}
					{coinData?.discord && (
						<a
							href={coinData?.discord}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 rounded-full transition-colors"
						>
							<img
								src="/discord-app-icon.png"
								alt="Discord"
								className="w-8 h-6"
							/>
						</a>
					)}
				</div>

				{/* About Section */}
				<div className="w-full text-center">
					<h2 className="text-2xl font-bold mb-4">About {coinData.name}</h2>
					<p className="text-gray-300 leading-relaxed max-w-lg mx-auto">
						{coinData?.description || "No description available"}
					</p>
				</div>
			</div>
		</div>
	);
}
