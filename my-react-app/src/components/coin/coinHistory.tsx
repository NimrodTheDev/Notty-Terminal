import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";

type HistoryItem = {
	id: string;
	key: string;
	score: string;
	description?: string;
	created_at: string;
};
type CoinHistoryProps = {
	coinHistory: HistoryItem[];
  };
  
  function CoinHistory({ coinHistory }: CoinHistoryProps) {
	const [selectedMonth, setSelectedMonth] = useState("July 2025");

	const reputationData = coinHistory.map((item) => {
		const createdDate = new Date(item.created_at);
		return {
		  id: item.id,
		  date: format(createdDate, "dd | h:mm a"),
		  month: format(createdDate, "MMMM yyyy"),
		  text: item.description || item.key,
		  drsScore: Number(item.score),
		};
	  });

	const months = [
		"All Time",
		"July 2025",
		"June 2025",
		"May 2025",
		"April 2025",
	];

	const filteredData =
		selectedMonth === "All Time"
			? reputationData
			: reputationData.filter((item) => item.month === selectedMonth);

	return (
		<div className='w-full max-w-md mx-auto bg-custom-dark-blue text-white rounded-lg overflow-hidden'>
			{/* Header */}
			<div className=' border-b border-gray-700'>
				<h2 className='text-lg text-[#CCC1FA] font-medium mb-7'>
					Token Reputation History
				</h2>

				{/* Month Filter Dropdown */}
				<div className='relative'>
					<select
						value={selectedMonth}
						onChange={(e) => setSelectedMonth(e.target.value)}
						className='w-full bg-[#4D427B] text-white px-4 py-4 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500'
					>
						{months.map((month) => (
							<option key={month} value={month} className='bg-gray-800'>
								{month}
							</option>
						))}
					</select>
					<ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none' />
				</div>
			</div>

			{/* History List */}
			<div className=' overflow-y-auto'>
				{filteredData.length === 0 ? (
					<div className='p-4 text-center text-gray-400'>
						No entries found for {selectedMonth}
					</div>
				) : (
					filteredData.map((item) => (
						<div
							key={item.id}
							className='p-4 border mb-4 rounded-md border-gray-700 bg-[#1F1A31] hover:bg-gray-800 transition-colors'
						>
							<div className='flex items-center justify-between'>
								<div className='flex-1'>
									<div className='text-sm text-gray-400 mb-1'>{item.date}</div>
									<div className='text-white text-sm'>{item.text}</div>
								</div>

								<div className='flex items-center gap-3'>
									<div className='text-[#CCC1FA] font-medium'>
										DRS: +{item.drsScore}
									</div>
									<button className='text-gray-400 px-6 py-2 border rounded-md border-[#FFFFFF1A] bg-[#232842] hover:text-white text-sm'>
										View
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
export default CoinHistory;
