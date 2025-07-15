 import React, { useEffect, useState, ChangeEvent } from "react";
import axios from "axios";
import CoinFilter, { CoinData, FilterOptions } from "../components/coin/CoinFilter";

const CoinMarket: React.FC = () => {
  const [allCoins, setAllCoins] = useState<CoinData[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<CoinData[]>([]);
  const [filter, setFilter] = useState<FilterOptions["filter"]>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [errorList, setErrorList] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllCoins = async () => {
      setLoadingList(true);
      setErrorList(null);
      try {
        const response = await axios.get<CoinData[]>(
          `https://solana-market-place-backend.onrender.com/api/coins/`
        );
        if (response.status === 200) {
          setAllCoins(response.data);
          setFilteredCoins(response.data);
        } else {
          setErrorList(`Unexpected status code: ${response.status}`);
          setAllCoins([]);
          setFilteredCoins([]);
        }
      } catch (err: any) {
        setErrorList(err.message || "Failed to fetch coins.");
        setAllCoins([]);
        setFilteredCoins([]);
      } finally {
        setLoadingList(false);
      }
    };
    fetchAllCoins();
  }, []);

  useEffect(() => {
    let filtered = allCoins;

    if (filter === "drcscore") {
      filtered = filtered.filter(coin => coin.score > 0);
    } else if (filter === "name") {
      filtered = filtered.slice().sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

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

  if (loadingList) {
    return (
      <div className="flex justify-center items-center h-screen bg-custom-dark-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (errorList) {
    return <div className="bg-gray-900 text-white min-h-screen p-4">{errorList}</div>;
  }

  return (
    <div className="w-full">
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
