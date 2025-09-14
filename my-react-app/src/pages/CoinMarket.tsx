// CoinMarket.tsx
import React, { useEffect, useState, ChangeEvent } from "react";
import { useAxios } from "../hooks/useAxios";
import CoinFilter, {
	CoinData,
	FilterOptions,
} from "../components/coin/CoinFilter";
import Loader from "../components/general/loader"; // Imported the Loader component
import { getSolanaPriceUSD } from "../hooks/solanabalance";
import toast from "react-hot-toast";

const CoinMarket: React.FC = () => {
	const [allCoins, setAllCoins] = useState<CoinData[]>([]); // fetch all coins
	const [filteredCoins, setFilteredCoins] = useState<CoinData[]>([]); // client filtered coins
	const [filter, setFilter] = useState<FilterOptions["filter"]>("all");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const { loading, request } = useAxios();
	const [mainloading, setMainLoading] = useState(true);

	// Fetch all coins once without filter params (server returns all)
	useEffect(() => {
		const fetchAllCoins = async () => {
			try {
				setMainLoading(true);
				const response = await request({
					method: "get",
					url: `/coin/all`,
				});
				if (response.status === 200) {
					const coins:CoinData[] = response.data.results; // ← assume this is an array
					// Convert string fields to numbers for all coins
					const solPrice = await getSolanaPriceUSD();
					const parsedCoins = (coins || []).map((coin: any) => ({
						...coin,
						market_cap: parseFloat(coin.current_marketcap) * solPrice,
						// current_price: parseFloat(coin.current_price),
					}));
					setAllCoins(parsedCoins);
					setFilteredCoins(parsedCoins); // initialize filtered coins with all
				} else {
					toast.error(`Unexpected status code: ${response.status}`);
					console.error(`Unexpected status code: ${response.status}`);
					setAllCoins([]);
					setFilteredCoins([]);
				}
			} catch (err: any) {
				toast.error("Failed to fetch coins.");
				console.error(err.message || "Failed to fetch coins.");
				setAllCoins([]);
				setFilteredCoins([]);
			} finally{
				setMainLoading(false);
			}
		};
		fetchAllCoins();
	}, [request]);

	// Client-side filtering logic applied on allCoins when filter or searchTerm changes
	useEffect(() => {
		let filtered = allCoins;

		// Filter by drcscore or name or all
		if (filter === "drcscore") {
			filtered = filtered.filter((coin) => coin.score > 0);
		} else if (filter === "name") {
			filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
		}

		// Then filter by search term (case-insensitive substring match)
		if (searchTerm.trim() !== "") {
			const lowerSearch = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(coin) =>
					coin.name.toLowerCase().includes(lowerSearch) ||
					coin.address.toLowerCase().includes(lowerSearch)
			);
		}

		setFilteredCoins(filtered);
	}, [allCoins, filter, searchTerm]);

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) =>
		setSearchTerm(e.target.value);

	const handleFilterChange = (newFilter: FilterOptions["filter"]) => {
		setFilter(newFilter);
		setSearchTerm("");
	};

	if (loading || mainloading) {
		return (
			<div className='bg-custom-dark-blue text-white min-h-screen p-4'>
				<Loader />
			</div>
		);
	}

	// Render CoinFilter UI with coin list and filter/search handlers
	return (
		<div className='bg-custom-dark-blue text-white min-h-screen p-2 xs:p-4 overflow-x-hidden'>
			<CoinFilter
				coins={filteredCoins}
				filter={filter}
				searchTerm={searchTerm}
				onSearchChange={handleSearchChange}
				onFilterChange={handleFilterChange}
			/>
		</div>
	);
};

export default CoinMarket;
