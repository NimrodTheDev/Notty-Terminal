export default function HoldersAnalytics({ }: { coinData: any }) {
	// Top holders data
	const topHolders = [
		{ name: "Specialdev", percentage: "50%" },
		{ name: "Specialdev", percentage: "0.07%" },
		{ name: "Specialdev", percentage: "0.07%" },
		{ name: "Specialdev", percentage: "0.07%" },
		{ name: "Specialdev", percentage: "0.07%" },
		{ name: "Specialdev", percentage: "0.07%" },
		{ name: "Specialdev", percentage: "0.07%" },
	];


	// Analytics data
	const analytics = [
		{ label: "Total Holders", value: "200,000" },
		{ label: "Holders with DRS >800", value: "20%" },
		{ label: "Holders with DRS >600", value: "20%" },
		{ label: "Holders with DRS >400", value: "20%" },
		{ label: "Holders with DRS <400", value: "20%" },
	];

	return (
		<div className='bg-custom-dark-blue text-white p-6 rounded-lg'>
			{/* Top Holders Section */}
			<h2 className='text-2xl font-bold mb-6'>Top Holders</h2>

			<div className='space-y-4 mb-10'>
				{topHolders.map((holder, index) => (
					<div key={index} className='flex items-center justify-between'>
						<div className='flex items-center'>
							<span className='text-yellow-500 mr-2'>👋</span>
							<a
								href='#'
								className='text-gray-300 hover:text-white underline underline-offset-2'
							>
								{holder.name}
							</a>
						</div>
						<span className='text-right'>{holder.percentage}</span>
					</div>
				))}
			</div>

			{/* Holder Analytics Section */}
			<h2 className='text-2xl font-bold mb-6'>Holder Analytics</h2>

			<div className='space-y-4'>
				{analytics.map((item, index) => (
					<div key={index} className='flex items-center justify-between'>
						<div className='flex items-center'>
							<span className='text-yellow-500 mr-2'>👋</span>
							<span className='text-gray-300'>{item.label}</span>
						</div>
						<span className='text-right'>{item.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}
