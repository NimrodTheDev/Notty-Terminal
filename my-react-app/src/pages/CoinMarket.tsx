// CoinMarket.tsx
import React, { useEffect, useState, ChangeEvent } from "react";
import { useAxios } from "../hooks/useAxios";
import CoinFilter, { CoinData, FilterOptions } from "../components/coin/CoinFilter"; 
import Loader from "../components/general/loader"; // Imported the Loader component
import { getSolanaPriceUSD } from "../hooks/solanabalance";

const CoinMarket: React.FC = () => {
  const [allCoins, setAllCoins] = useState<CoinData[]>([]); // fetch all coins
  const [filteredCoins, setFilteredCoins] = useState<CoinData[]>([]); // client filtered coins
  const [filter, setFilter] = useState<FilterOptions["filter"]>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { loading, request } = useAxios();
  const [errorList, setErrorList] = useState<string | null>(null);

  // Fetch all coins once without filter params (server returns all)
  useEffect(() => {
    const fetchAllCoins = async () => {
      setErrorList(null);
      try {
        const response = await request<CoinData[]>({
          method: 'get',
          url: `/coins/`
        });
        if (response.status === 200) {
          const coins = response.data; // ← assume this is an array
          // Convert string fields to numbers for all coins
          const solPrice = await getSolanaPriceUSD();
          const parsedCoins = coins.map((coin: any) => ({
            ...coin,
            market_cap: parseFloat(coin.current_marketcap) * solPrice,
            // current_price: parseFloat(coin.current_price),
          }));
          setAllCoins(parsedCoins);
          setFilteredCoins(parsedCoins); // initialize filtered coins with all
        } else {
          setErrorList(`Unexpected status code: ${response.status}`);
          setAllCoins([]);
          setFilteredCoins([]);
        }
      } catch (err: any) {
        setErrorList(err.message || "Failed to fetch coins.");
        setAllCoins([]);
        setFilteredCoins([]);
      }
    };
    fetchAllCoins();
  }, [request]);

  // Client-side filtering logic applied on allCoins when filter or searchTerm changes
  useEffect(() => {
    let filtered = allCoins;

    // Filter by drcscore or name or all
    if (filter === "drcscore") {
      filtered = filtered.filter(coin => coin.score > 0);
    } else if (filter === "name") {
      filtered = filtered.slice().sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    // Then filter by search term (case-insensitive substring match)
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        coin =>
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

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4">
                     <Loader /> {/* Display the Loader component while loading */}
      </div>
    );
  }

  if (errorList) {
    return <div className="bg-gray-900 text-white min-h-screen p-4">{errorList}</div>;
  }

  // Render CoinFilter UI with coin list and filter/search handlers
  return (
    <div className="bg-gray-900 text-white min-h-screen p-2 xs:p-4 overflow-x-hidden">
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
