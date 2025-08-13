import { useState } from "react";
import { Menu, X } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link, useLocation } from "react-router-dom";

export default function Header({ hideList = false }: { hideList?: boolean }) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const location = useLocation();

	// Don't render the header at all if we're in dashboard routes
	if (location.pathname.startsWith('/dashboard')) {
		return null;
	}

	return (
		<header className='bg-custom-dark-blue border-b-2 border-gray-600 text-white px-2 xs:px-4 py-3 shadow-md'>
			<div className='max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between'>
				{/* Logo and Toggle */}
				<div className='flex items-center justify-between w-full md:w-auto'>
					<Link to={'/'}>
						<div className='flex items-center space-x-2'>
							<img
								src='/logo.png'
								alt='Logo'
							// className='w-8 h-8 '
							/>
							{/* <span className='text-xl font-bold'>Notty Terminal</span> */}
						</div>
						{/* <span className='text-2xl font-bold bg-gradient-to-r from-[#a4b9fa] to-[#4a0a80] bg-clip-text text-transparent'>
							Notty Terminal
						</span> */}
					</Link>
					{/* Mobile toggle */}
					{!hideList && <button
						className='md:hidden text-gray-300'
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? (
							<X className='w-6 h-6' />
						) : (
							<Menu className='w-6 h-6' />
						)}
					</button>}
				</div>

				{/* Desktop Navigation links */}
				{!hideList && <nav className='hidden md:flex md:items-center gap-6 text-sm text-gray-300'>
					<Link to='/' className='block md:inline hover:text-white'>
						Home
					</Link>
					<Link to='/dashboard' className='block md:inline hover:text-white'>
						Dashboard
					</Link>
					<Link to='/CoinMarket' className='block md:inline hover:text-white'>
						Coin Market
					</Link>
					<Link to='/AboutDrs' className='block md:inline hover:text-white'>
						About DRS
					</Link>
					<Link to='/Talentpool' className='block md:inline hover:text-white'>
						Talent Pool
					</Link>
					<Link to='/coin/create' className='block md:inline hover:text-white'>
						Create Coin
					</Link>
				</nav>}

				{/* Right icons + button */}
				{!hideList && <div className='hidden md:flex items-center gap-4'>
					{/* <div className='relative'>
						<Bell className='w-5 h-5 text-gray-300 hover:text-white' />
						<span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500' />
					</div> */}
					{/* <MessageSquare className='w-5 h-5 text-gray-300 hover:text-white' /> */}
					<WalletMultiButton />
				</div>}
			</div>

			{/* Mobile view dropdown nav */}
			{!hideList && mobileMenuOpen && (
				<div className='fixed inset-0 z-50 bg-custom-dark-blue bg-opacity-95 flex flex-col items-start w-full max-w-xs min-h-screen rounded-none shadow-lg px-4 py-3 space-y-3'>
					{/* Navigation links dropdown */}
					<nav className='flex flex-col w-full'>
						<Link
							to='/dashboard'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							DashBoard
						</Link>

						<Link
							to='/CoinMarket'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							Coin Market
						</Link>
						<Link
							to='/AboutDrs'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							About DRS
						</Link>
						<Link
							to='/Talentpool'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							Talent Pool
						</Link>
						<Link
							to='/coin/create'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							Create Coin
						</Link>
					</nav>
					{/* Icons and wallet button */}
					<div className='flex items-center gap-4 pt-2 border-t border-gray-700 w-full'>
						{/* <div className='relative'>
							<Bell className='w-5 h-5 text-gray-300 hover:text-white cursor-pointer' />
							<span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500' />
						</div> */}
						{/* <MessageSquare className='w-5 h-5 text-gray-300 hover:text-white cursor-pointer' /> */}
						<WalletMultiButton />
					</div>
				</div>
			)}
		</header>
	);
}