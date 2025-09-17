import { useState } from "react";
import {
	Home,
	Coins,
	Plus,
	MessageCircle,
	Info,
	History,
	Settings,
	HelpCircle,
	Menu,
	X,
} from "lucide-react";
import { Link } from "react-router-dom";

const Sidebar = () => {
	const [activeItem, setActiveItem] = useState("Home");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const menuItems = [
		{
			name: "Dashboard",
			icon: Home,
			category: "main",
			isActive: true,
			link: "home",
		},
		{
			name: "Explore Coins",
			icon: Coins,
			category: "main",
			link: "coinmarket",
		},
		{ name: "Create Coin", icon: Plus, category: "main", link: "coin/create" },
		{
			name: "Chat Rooms",
			icon: MessageCircle,
			category: "main",
			link: "chatRooms",
		},
		{ name: "About DRS", icon: Info, category: "main", link: "aboutdrs" },
		{ name: "History", icon: History, category: "main", link: "history" },
		// Added missing link
	];

	const bottomItems = [
		{ name: "Settings", icon: Settings, link: "settings" },
		{ name: "Help & Support", icon: HelpCircle, link: "help" },
	];

	const handleItemClick = (itemName: string) => {
		setActiveItem(itemName);
		// Close mobile menu when item is clicked
		setIsMobileMenuOpen(false);
	};

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<div className=' bg-custom-dark-blue border-r border-[#FFFFFF1A]'>
			{/* Mobile Menu Button - Only visible on mobile */}
			<button
				onClick={toggleMobileMenu}
				className={`fixed top-[100px] left-4 z-50 lg:hidden bg-custom-dark-blue text-white p-3 rounded-lg shadow-lg hover:bg-gray-800 transition-colors duration-200 ${
					isMobileMenuOpen ? "hidden" : "block"
				}`}
				aria-label='Toggle menu'
			>
				<Menu size={20} />
			</button>

			{/* Overlay for mobile */}
			{isMobileMenuOpen && (
				<div
					className='fixed inset-0 bg-custom-dark-blue bg-opacity-50 z-30 lg:hidden'
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`
                bg-custom-dark-blue text-white h-screen flex flex-col transition-transform duration-300 ease-in-out z-40 pt-16 sm:pt-0
                ${
									isMobileMenuOpen
										? "fixed inset-y-0 left-0 w-4/5 max-w-xs"
										: "hidden lg:flex lg:w-64"
								}
            `}
			>
				{/* Header */}
				<div className='p-6 '>
					<div className='flex items-center justify-between'>
						<Link to='/'>
							<img
								src='/logo.png'
								alt='Logo'
								// className='w-100 h-100  '
							/>
						</Link>
						{/* Close button for mobile */}
						<button
							onClick={() => setIsMobileMenuOpen(false)}
							className='lg:hidden text-gray-400 hover:text-white transition-colors duration-200'
							aria-label='Close menu'
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Main Navigation */}
				<nav className='flex-1 px-4 py-6 overflow-y-hidden'>
					<ul className='space-y-2'>
						{menuItems.map((item) => {
							const Icon = item.icon;
							const isActive = activeItem === item.name;

							return (
								<li key={item.name}>
									<Link
										to={item.link}
										onClick={() => handleItemClick(item.name)}
										className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
											isActive
												? "bg-custom-light-purple text-white shadow-lg"
												: "text-gray-300 hover:bg-gray-800 hover:text-white"
										}`}
										aria-current={isActive ? "page" : undefined}
									>
										<Icon size={20} />
										<span className='font-medium'>{item.name}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				{/* Bottom Navigation */}
				<div className='px-4 overflow-y-hidden'>
					<ul className='space-y-2'>
						{bottomItems.map((item) => {
							const Icon = item.icon;
							const isActive = activeItem === item.name;

							return (
								<li key={item.name}>
									<Link
										to={item.link}
										onClick={() => handleItemClick(item.name)}
										className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
											isActive
												? "bg-custom-light-purple text-white shadow-lg"
												: "text-gray-300 hover:bg-gray-800 hover:text-white"
										}`}
										aria-current={isActive ? "page" : undefined}
									>
										<Icon size={20} />
										<span className='font-medium'>{item.name}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
};

export default Sidebar;
