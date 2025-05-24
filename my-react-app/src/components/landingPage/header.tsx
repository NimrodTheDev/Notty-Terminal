import { useState } from "react";
import { Bell, MessageSquare, Menu, X } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link } from "react-router-dom";


export default function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className='bg-custom-dark-blue text-white px-4 py-3 shadow-md'>
			<div className='max-w-7xl mx-auto flex items-center justify-between'>
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
					<button
						className='md:hidden text-gray-300'
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? (
							<X className='w-6 h-6' />
						) : (
							<Menu className='w-6 h-6' />
						)}
					</button>
				</div>

				{/* Desktop Navigation links */}
				<nav className='hidden md:flex md:items-center gap-6 text-sm text-gray-300'>
					<a href='#' className='block md:inline hover:text-white'>
						Wallet
					</a>
					<a href='#' className='block md:inline hover:text-white'>
						AI Tools
					</a>
					<a href='#' className='block md:inline hover:text-white'>
						On Chain News
					</a>
					<a href='#' className='block md:inline hover:text-white'>
						DRS System
					</a>
					<a href='#' className='block md:inline hover:text-white'>
						Talent Pool
					</a>
				</nav>

				{/* Right icons + button */}
				<div className='hidden md:flex items-center gap-4'>
					<div className='relative'>
						<Bell className='w-5 h-5 text-gray-300 hover:text-white' />
						<span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500' />
					</div>
					<MessageSquare className='w-5 h-5 text-gray-300 hover:text-white' />
					<WalletMultiButton />
				</div>
			</div>

			{/* Mobile view dropdown nav */}
			{mobileMenuOpen && (
				<div className='md:hidden mt-4 flex flex-col items-start w-full max-w-xs bg-custom-dark-blue rounded-lg shadow-lg px-4 py-3 space-y-3'>
					{/* Navigation links dropdown */}
					<nav className='flex flex-col w-full'>
						<a
							href='#'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							Wallet
						</a>
						<a
							href='#'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							AI Tools
						</a>
						<a
							href='#'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							On Chain News
						</a>
						<a
							href='#'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							DRS System
						</a>
						<a
							href='#'
							className='block w-full py-2 px-3 rounded-md hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white transition-colors duration-300'
						>
							Talent Pool
						</a>
					</nav>
					{/* Icons and wallet button */}
					<div className='flex items-center gap-4 pt-2 border-t border-gray-700 w-full'>
						<div className='relative'>
							<Bell className='w-5 h-5 text-gray-300 hover:text-white cursor-pointer' />
							<span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500' />
						</div>
						<MessageSquare className='w-5 h-5 text-gray-300 hover:text-white cursor-pointer' />
						<WalletMultiButton />
					</div>

				</div>
			)}
		</header>
	);
}
