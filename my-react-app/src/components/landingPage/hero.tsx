import { Link } from "react-router-dom";

import { WalletMinimal } from "lucide-react";
import NFTCollection from "./collection";



export default function Hero() {
	return (
		<div className=' bg-custom-hero-back min-h-screen flex flex-col items-center justify-center relative overflow-hidden'>
			{/* Background decorative elements */}
			<div className='absolute inset-0 overflow-hidden'>
				{/* Purple icon decorations */}
				<img src="/Untitled_20250307_133911 1 (2).png" alt="landing Background" className=" w-screen" />
			</div>

			{/* Main content */}
			<div className='relative z-10 text-center px-6 py-12 max-w-4xl'>
				{/* Label */}
				<div className='inline-block mb-6 px-4 py-1 rounded-full bg-gray-900 text-gray-400 text-sm font-medium border border-gray-800'>
					Web3 Launchpad
				</div>

				{/* Headline */}
				<h1 className='text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-purple-200 text-transparent bg-clip-text break-words'>
					Build Credibility as you
					<br />
					Launch on Web3
				</h1>

				{/* Subheading */}
				<p className='text-gray-300 text-base xs:text-lg mb-10 max-w-2xl mx-auto'>
					Notty Terminal is the launchpad where every action contributes to a
					visible reputation score, helping the community launch, hire and collaborate
					with confidence.
				</p>

				{/* CTA Buttons */}
				<div className='flex flex-col gap-4 w-full sm:flex-row sm:gap-4 sm:justify-center'>

					<Link to="coin/create">
						<button className='px-6 py-3 sm:w-full bg-custom-light-purple hover:bg-purple-600 rounded-md text-white font-medium flex items-center justify-center w-full transition-colors'>
							Create Coin <span className='ml-1'><WalletMinimal size={20} color="#ffffff" /></span>
						</button>
					</Link>

					<button className='px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-medium transition-colors'>
						Join Talent Pool
					</button>
				</div>
			</div>
			<NFTCollection />
		</div>
	);
}