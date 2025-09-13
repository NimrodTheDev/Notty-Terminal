import React, { ChangeEvent } from "react";
import { Funnel } from "lucide-react";
import { NFTCard } from "../landingPage/collection";

export interface CoinData {
  address: string;
  score: number;
  // creator: string;
  // creator_display_name: string;
  current_price: string;
  description: string | null;
  image_url: string;
  market_cap: number;
  name: string;
  ticker: string;
  total_held: number;
  current_marketcap: number;
}

export interface FilterOptions {
  filter: "all" | "drcscore" | "name";
}

interface CoinFilterProps {
  coins: CoinData[];
  filter: FilterOptions["filter"];
  searchTerm: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (filter: FilterOptions["filter"]) => void;
}

const CoinFilter: React.FC<CoinFilterProps> = ({
  coins,
  filter,
  searchTerm,
  onSearchChange,
  onFilterChange,
}) => {
  return (
    <div className="bg-gray-900 min-h-screen p-4 sm:p-8 z-10 w-fit">
      <div className="mx-auto">
        {/* Header */}
        <div className="mx-auto text-center rounded-md px-6 mb-8">
          <h1 className="text-5xl font-bold mb-3 text-gray-100">MarketPlace</h1>
          <p className="text-lg text-gray-400">
            Discover and invest in innovative projects launched on the blockchain.
          </p>
        </div>

        {/* Navbar */}
        <nav className="mb-8 mx-[-32px] bg-[#1d213799] px-6 py-3 flex items-center flex-col justify-between w-[calc(100%+64px)] gap-2 md:flex-row ">
          <div className="flex items-center flex-1 max-w-fit">
            <input
              type="text"
              placeholder="Let's Go!"
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full rounded-md px-1 py-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              aria-label="Search coins by ID or name"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center space-x-2 min-w-[220px]">
            <div className="flex items-center space-x-1 text-purple-400 font-medium select-none">
              <Funnel className="w-5 h-5" />
              <span>Filter</span>
            </div>
            <div className="flex space-x-1">
              {(["all", "drcscore", "name"] as FilterOptions["filter"][]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => onFilterChange(type)}
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      filter === type
                        ? "bg-purple-700 text-white"
                        : "bg-purple-100 text-purple-700"
                    }`}
                    aria-pressed={filter === type}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        </nav>

        {/* Coins grid */}
        {coins.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No coins found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {coins.map((coin) => (
              <NFTCard key={coin.address} nft={coin} viewMode="card" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinFilter;
