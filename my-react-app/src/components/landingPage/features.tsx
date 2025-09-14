import { JSX, useState } from "react";

interface FeatureItem {
	id: number;
	title: string;
	description: string;
	icon: JSX.Element;
}

export default function FeaturesSection() {
	const [features] = useState<FeatureItem[]>([
		{
			id: 1,
			title: "Project Launchpad",
			description:
				"Launch your Web3 projects with ease. Get funding, resources, and support from our community.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
		{
			id: 2,
			title: "Talent Marketplace",
			description:
				"Find and connect with the best developers, designers, and marketers in the Web3 space.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
		{
			id: 3,
			title: "Project Marketplace",
			description:
				"Discover and invest in innovative Web3 projects at various stages of development.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.70711 15.2929C4.07714 15.9229 4.52331 17 5.41421 17H17M17 17C15.8954 17 15 17.8954 15 19C15 20.1046 15.8954 21 17 21C18.1046 21 19 20.1046 19 19C19 17.8954 18.1046 17 17 17ZM9 19C9 20.1046 8.10457 21 7 21C5.89543 21 5 20.1046 5 19C5 17.8954 5.89543 17 7 17C8.10457 17 9 17.8954 9 19Z'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
		{
			id: 4,
			title: "Community Hub",
			description:
				"Join a thriving community of builders, creators, and innovators in the Web3 ecosystem.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
		{
			id: 5,
			title: "DRC Point System",
			description:
				"Create stunning visuals for your projects with our AI-powered image generation tools.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
		{
			id: 6,
			title: "Project Dashboard",
			description:
				"Manage all your projects in one place with comprehensive analytics and tracking tools.",
			icon: (
				<div className='bg-[#9A83F633] rounded-full p-3 flex items-center justify-center'>
					<svg
						className='w-6 h-6 text-[#9A83F6]'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
				</div>
			),
		},
	]);

	return (
		<div className='bg-custom-dark-blue min-h-screen p-6 md:p-10 relative overflow-hidden'>
			{/* Background decorative elements */}
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute top-20 left-24 text-purple-500 opacity-10 text-6xl'>
					⚡
				</div>
				<div className='absolute top-40 right-32 text-purple-500 opacity-10 text-7xl'>
					♾️
				</div>
				<div className='absolute bottom-24 left-40 text-purple-500 opacity-10 text-6xl'>
					♦️
				</div>
				<div className='absolute top-60 left-96 text-purple-500 opacity-10 text-5xl'>
					⚛️
				</div>
				<div className='absolute bottom-40 right-48 text-purple-500 opacity-10 text-6xl'>
					🔮
				</div>
			</div>

			<div className='relative z-10 max-w-6xl mx-auto'>
				{/* Header */}
				<div className='text-center mb-16'>
					<span className='px-4 py-1 rounded-full bg-gray-800 text-white text-sm font-medium inline-block mb-4'>
						Features
					</span>
					<h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
						All-in-One Web3 Platform
					</h2>
					<p className='text-gray-400 max-w-2xl mx-auto'>
						Everything you need to build, launch, and grow your Web3 projects in
						one seamless ecosystem
					</p>
				</div>

				{/* Features Grid */}
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{features.map((feature) => (
						<FeatureCard key={feature.id} feature={feature} />
					))}
				</div>
			</div>
		</div>
	);
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
	return (
		<div className='bg-[#121421] bg-opacity-50 backdrop-filter backdrop-blur-sm border border-gray-700 rounded-lg p-6 transition-all hover:bg-[#132431] hover:border-[#9A83F6]'>
			<div className='mb-4 rounded-full w-fit'>{feature.icon}</div>
			<h3 className='text-xl font-bold text-white mb-2'>{feature.title}</h3>
			<p className='text-gray-400'>{feature.description}</p>
		</div>
	);
}
