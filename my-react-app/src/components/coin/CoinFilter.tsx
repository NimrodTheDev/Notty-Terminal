import React, { ChangeEvent } from "react";
import { Funnel } from "lucide-react";
import {NFTCard} from "../landingPage/collection";

export interface CoinData {
  address: string;
  created_at: string;
  score: number;
  creator: string;
  creator_display_name: string;
  current_price: string;
  description: string | null;
  image_url: string;
  market_cap: number;
  name: string;
  telegram: string | null;
  ticker: string;
  total_held: number;
  total_supply: string;
  twitter: string | null;
  website: string | null;
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
    <div className="bg-gray-900 min-h-screen p-4 sm:p-8 z-10 w-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center rounded-md px-6 mb-8">
          <h1 className="text-5xl font-bold mb-3 text-gray-100">MarketPlace</h1>
          <p className="text-lg text-gray-400">
            Discover and invest in innovative projects launched on the blockchain.
          </p>
        </div>

        {/* Navbar */}
        <nav className="mb-8 bg-purple-800 px-6 py-3 rounded-md flex items-center flex-col justify-between w-full gap-2 md:flex-row">
          <div className="flex items-center flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Let's Go!"
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full rounded-md px-3 py-1 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              aria-label="Search coins by ID or name"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center space-x-4 ml-6 min-w-[320px]">
            <div className="flex items-center space-x-1 text-purple-400 font-semibold select-none">
              <Funnel className="w-5 h-5" />
              <span>Filter</span>
            </div>
            {(["all", "drcscore", "name"] as FilterOptions["filter"][]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => onFilterChange(type)}
                  className={`block w-full py-2 px-3 rounded-md transition-colors duration-300 hover:bg-gradient-to-r hover:from-[#a4b9fa] hover:to-[#4a0a80] hover:text-white ${
                    filter === type
                      ? "bg-purple-700 text-white"
                      : "bg-purple-100 text-purple-700"
                  }`}
                  aria-pressed={filter === type}
                >
                  {type === "all"
                    ? "Show All"
                    : `By ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </button>
              )
            )}
          </div>
        </nav>

        {/* Coins grid */}
        {coins.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No coins found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {coins.map((coin) => (
              <NFTCard key={coin.address} nft={coin}  />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinFilter;

