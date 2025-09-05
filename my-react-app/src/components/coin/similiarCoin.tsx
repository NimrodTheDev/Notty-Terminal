import { NFTCard } from "../landingPage/collection";

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
	score: number;
	ticker: string;
	total_held: number;
	total_supply: string;
	twitter: string | null;
	website: string | null;
}

interface SimilarCoinsProps {
	coinData: CoinData;
}

export default function SimilarCoins({ coinData }: SimilarCoinsProps) {
	const coins: CoinData[] = [
		
	];

	return (
		<div className="bg-gray-800 p-4 rounded-lg">
			<h2 className="text-xl font-bold mb-4">Similar Coins</h2>
			<div className="space-y-4">
				<p className="text-gray-400">Similar coins to {coinData.name}</p>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'>
					{coins.map((coin) => (
						<NFTCard key={coin.address} nft={coin} viewMode="card" />
					))}
				</div>
			</div>
		</div>
	);
}
