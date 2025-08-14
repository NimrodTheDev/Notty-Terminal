import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import img from "../../assets/images/istockphoto-1409329028-612x612.jpg";
import { getSolanaPriceUSD } from "../../hooks/solanabalance";

// Define TypeScript interfaces
interface NFT {
	address: string;
	ticker: string;
	name: string;
	creator: string;
	creator_display_name: string;
	created_at: string;
	total_supply: string;
	image_url: string;
	description: string | null;
	telegram: string | null;
	score: number;
	website: string | null;
	twitter: string | null;
	current_price: string;
	total_held: number;
	market_cap: number;
}

interface NFTCardProps {
	nft: NFT;
}

export default function NFTCollection() {
	const [nfts, setNft] = useState<NFT[]>([]);
	useEffect(() => {
		(async () => {
			const arg = await axios.get('https://solana-market-place-backend.onrender.com/api/coins/top-coins/?limit=8')
			if (arg.status === 200) {
				const coins = arg.data; // ← assume this is an array
				// Convert string fields to numbers for all coins
				const solPrice = await getSolanaPriceUSD();
				const parsedCoins = coins.map((coin: any) => ({
					...coin,
					market_cap: parseFloat(coin.current_marketcap) * solPrice,
					// current_price: parseFloat(coin.current_price),
				}));
				setNft(parsedCoins)
			}
		})()
	}, [])
	return (
		<div className='bg-transparent min-h-screen p-4 sm:p-8 z-10 w-screen'>
			<div className='max-w-7xl mx-auto'>
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
					{nfts.map((nft) => (
						<NFTCard key={nft.address} nft={nft} />
					))}
				</div>
				<div className='flex justify-center mt-6'>
					<Link to="/CoinMarket"> {/* link to show all coins page */}
						<button className='text-white'>
							<svg
								className='w-8 h-8'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M19 9l-7 7-7-7'
								/>
							</svg>
						</button>
					</Link>
				</div>
			</div>
		</div>
	);
}

export function NFTCard({ nft }: NFTCardProps) {
	// console.log(nft)

	// const [url, setUrl] = useState(img);
	// let data: any = axios.get(nft.image_url).then((res)=>{
	// 	console.log(res)
	// 	// return res.data
	// 	res.status === 200 && setUrl(res?.data?.image || img)
	// })
	// console.log(data)
	return (
		<div className=' bg-transparent rounded-lg overflow-hidden border border-gray-800'>
			<div className='relative pb-[100%]'>
				<img
					src={nft.image_url || img}
					alt='NFT Cat'
					className='absolute inset-0 w-full h-full object-cover'
				/>
			</div>

			<div className='p-4'>
				<h3 className='text-white text-xl font-bold mb-2'>{nft.name}</h3>
				<p className='text-gray-400 text-sm mb-4'>{nft.description}</p>

				<div className=' justify-between text-sm gap-y-4 items-center mb-4'>
					<div className="flex flex-col mb-4 sm:flex-row justify-between">
						<p className='text-[#9a83f6] '>MARKET CAP:</p>
						<p className=' text-gray-400'>${nft.market_cap.toFixed(2)}</p>
					</div>
					<div className=' flex flex-col mb-4 sm:flex-row justify-between'>
						<p className='text-[#9a83f6] '>DRS:</p>
						<p className='text-gray-400'>{nft.score}</p>
					</div>
				</div>
				<Link
					to={`/coin/${nft.address}`}
					className='w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded flex items-center justify-center gap-1 transition-colors'
				>
					View Details
					<svg
						className='w-4 h-4'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth='2'
							d='M14 5l7 7m0 0l-7 7m7-7H3'
						/>
					</svg>
				</Link>
			</div>
		</div>
	);
}
