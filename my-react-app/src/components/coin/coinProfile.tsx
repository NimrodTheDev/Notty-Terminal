import { Twitter, Globe } from "lucide-react";
import { useState } from "react";
// import img from "../../assets/images/istockphoto-1409329028-612x612.jpg"
// import { useParams } from "react-router-dom";
// import axios from "axios";
import img from "../../assets/images/istockphoto-1409329028-612x612.jpg"

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
	// const [url, setUrl] = useState(img);
	// const [data, setData] = useState<any>({});
	const handleFireClick = () => {
		// setFireCount((prevCount) => prevCount + 1);
	};
	// useEffect(()=>{
	// 	axios.get(coinData.image_url).then((res)=>{
	// 		console.log(res)
	// 		// return res.data
	// 		res.status === 200 && setUrl(res?.data?.image || img)
	// 		res.status === 200 && setData(res?.data)
	// 	})
	// }, [])
	return (
		// 
		<div className='bg-custom-dark-blue w-full overflow-x-hidden text-white grid grid-cols-custom-3-1 p-4'>
			<div className=' mx-auto '>
				{/* Header */}
				<div className='flex justify-between items-center mb-6'>
					<div className="">
						<h1 className='text-4xl font-bold text-center flex-grow'>
							{coinData.name} ({coinData.ticker})
						</h1>
					</div>

				</div>

				{/* Cat Image */}
				<div className='mb-8'>
				{/* aspect-[16/9] the solution to the aspect ration stuff, reomve it if its a problem */}
					<div className='rounded-xl overflow-hidden border-2 border-gray-700 mx-auto max-w-md aspect-[16/9]'>
						<img
							src={coinData.image_url || img}
							alt={`${coinData.name} image`}
							className='w-full h-full object-cover'
						/>
					</div>
				</div>

				{/* Social Links */}
				<div className='flex justify-center gap-4 mb-8'>
					{coinData?.twitter && (
						<a href={"https://x.com/" + coinData?.twitter || ''} target="_blank" rel="noopener noreferrer" className='p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors'>
							<Twitter size={20} />
						</a>
					)}
					{coinData?.website && (
						<a href={coinData?.website} target="_blank" rel="noopener noreferrer" className='p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors'>
							<Globe size={20} />
						</a>
					)}
					{coinData?.discord && (
						<a href={coinData?.discord} target="_blank" rel="noopener noreferrer" className='p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors'>
							<svg
								width='20'
								height='20'
								viewBox='0 0 24 24'
								fill='none'
								xmlns='http://www.w3.org/2000/svg'
							>
								<path
									d='M19.73 4.27a10 10 0 0 0-14.15 0c-3.9 3.91-3.9 10.24 0 14.14 3.91 3.91 10.24 3.91 14.15 0 3.9-3.9 3.9-10.23 0-14.14zM7.89 7.89a6 6 0 0 1 8.3-.18l.12.1.13.12a6 6 0 0 1-8.51 8.51l-.04-.04a6 6 0 0 1 0-8.51z'
									fill='currentColor'
								/>
								<path
									d='M16.27 16.27a6 6 0 0 0 0-8.54 6 6 0 0 0-8.54 0 6 6 0 0 0 0 8.54 6 6 0 0 0 8.54 0zM12 10.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z'
									fill='currentColor'
								/>
							</svg>
						</a>
					)}
				</div>
				{/* About Section */}
				<div className='mb-6'>
					<h2 className='text-2xl font-bold mb-4'>About {coinData.name}</h2>
					<p className='text-gray-300 leading-relaxed'>
						{coinData?.description || "No description available"}
					</p>
				</div>
			</div>
			<div className="justify-self-center">
				<button
					onClick={handleFireClick}
					className='flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors shadow-md shadow-indigo-700 rounded-lg'
				>
					<span className='text-2xl'>🔥</span>
					<span>{fireCount}</span>
				</button>
			</div>
		</div>
	);
}
