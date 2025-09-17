import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import img from "../../assets/images/istockphoto-1409329028-612x612.jpg";
import { getSolanaPriceUSD } from "../../hooks/solanabalance";

// Define TypeScript interfaces
interface NFT {
	address: string;
	// ticker: string;
	name: string;
	// creator: string;
	// creator_display_name: string;
	// created_at: string;
	// total_supply: string;
	image_url: string;
	description: string | null;
	// telegram: string | null;
	score: number;
	// website: string | null;
	// twitter: string | null;s
	current_price: string;
	// total_held: number;
	market_cap: number;
}

interface NFTCardProps {
	nft: NFT;
	viewMode: 'card' | 'list';
}

export default function NFTCollection() {
	const [nfts, setNft] = useState<NFT[]>([]);
	const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

	useEffect(() => {
		(async () => {
			const arg = await axios.get('https://solana-market-place-backend.onrender.com/api/coin/top/?limit=8')
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
				{/* View Toggle Header */}
				<div className='flex items-center justify-end mb-6'>
					{/* <h1 className='text-white text-2xl font-bold'>Top Collections</h1> */}
					<div className='flex items-center space-x-2'>
						<span className='text-gray-400 text-sm mr-2'>View:</span>
						<div className='flex bg-gray-800/50 rounded-lg  border border-gray-700'>
	<button
		onClick={() => setViewMode('card')}
		className={`flex items-center justify-center px-4 py-2 rounded-l-md text-sm font-medium transition-colors duration-200 ${
			viewMode === 'card'
				? 'bg-white/90 text-purple-300 shadow-sm'
				: 'text-[#9a83f6] hover:text-white'
		}`}
	>
		{/* Grid Icon - 2x2 squares */}
		<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</svg>
	</button>
	<button
		onClick={() => setViewMode('list')}
		className={`flex items-center justify-center px-4 py-2 rounded-r-md text-sm font-medium transition-colors duration-200 ${
			viewMode === 'list'
				? 'bg-white/90 text-purple-300 shadow-sm'
				: 'text-[#9a83f6] hover:text-white'
		}`}
	>
		{/* List Icon - horizontal lines with dots */}
		<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
			<circle cx="4" cy="6" r="1.5" />
			<rect x="8" y="5" width="12" height="2" rx="1" />
			<circle cx="4" cy="12" r="1.5" />
			<rect x="8" y="11" width="12" height="2" rx="1" />
			<circle cx="4" cy="18" r="1.5" />
			<rect x="8" y="17" width="12" height="2" rx="1" />
		</svg>
	</button>
</div>
					</div>
				</div>

				{/* Content based on view mode */}
				{viewMode === 'card' ? (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
						{nfts.map((nft) => (
							<NFTCard key={nft.address} nft={nft} viewMode={viewMode} />
						))}
					</div>
				) : (
					<div className='divide-y divide-gray-800'>
						{nfts.map((nft) => (
							<NFTCard key={nft.address} nft={nft} viewMode={viewMode} />
						))}
					</div>
				)}

				<div className='flex justify-center mt-6'>
					<Link to="/CoinMarket"> {/* link to show all coins page */}
						<button className='text-white hover:text-purple-400 transition-colors'>
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

export function NFTCard({ nft, viewMode }: NFTCardProps) {
	if (viewMode === 'list') {
		return (
			<div className='flex h-40 items-center border rounded-lg my-4 transition-colors duration-150 border-gray-800'>
				<div className='h-full w-1/3 rounded-l-lg overflow-hidden mr-4 flex-shrink-0'>
					<img
						src={nft.image_url || img}
						alt={nft.name}
						className='w-full h-full object-cover'
					/>
				</div>
				<div className='flex-1 space-y-4 min-w-0'>
					<div className='flex flex-col  sm:items-start sm:justify-between'>
						<div className='flex-1 min-w-0'>
							<h3 className='text-white text-lg font-bold truncate'>
								{nft.name}
							</h3>
							<p className='text-gray-400 text-sm truncate'>
								{nft.description || 'No description available'}
							</p>
						</div>
						<div className='mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm'>
							<div className='flex flex-col '>
								<span className='text-[#9a83f6] text-xs'>MARKET CAP</span>
								<span className='text-[#9a83f6] text-xs'>DRS</span>
								
							</div>
							<div className='flex flex-col '>
								<span className='text-gray-400'>${nft.market_cap.toFixed(2)}</span>
								<span className='text-gray-400'>{nft.score}</span>

							</div>
							
						</div>
						<div className="flex">
							<Link
								to={`/coin/${nft.address}`}
								className='bg-[#9A83F6CC] hover:bg-[#9A83F6] text-white py-2 px-4 rounded flex items-center justify-center gap-1 transition-colors text-sm whitespace-nowrap'
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
				</div>
			</div>
		);
	}

	// Card view (original design)
	return (
		<div className='bg-transparent rounded-lg overflow-hidden border border-gray-800 hover:border-[#9A83F6]/50 transition-colors duration-200'>
			<div className='relative pb-[100%]'>
				<img
					src={nft.image_url || img}
					alt='NFT Cat'
					className='absolute inset-0 w-full h-full object-cover'
				/>
			</div>

			<div className='p-4'>
				<h3 className='text-white text-xl font-bold mb-2'>{nft.name}</h3>
				<p className='text-gray-400 text-sm mb-4 line-clamp-1'>{nft.description}</p>

				<div className='justify-between text-sm gap-y-4 items-center mb-4'>
					<div className="flex flex-col mb-4 sm:flex-row justify-between">
						<p className='text-[#9a83f6]'>MARKET CAP:</p>
						<p className='text-gray-400'>${nft.market_cap.toFixed(2)}</p>
					</div>
					<div className='flex flex-col mb-4 sm:flex-row justify-between'>
						<p className='text-[#9a83f6]'>DRS:</p>
						<p className='text-gray-400'>{nft.score}</p>
					</div>
				</div>
				<Link
					to={`/coin/${nft.address}`}
					className='w-full bg-[#9A83F6CC] hover:bg-[#9A83F6] text-white py-2 px-4 rounded flex items-center justify-center gap-1 transition-colors'
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