import React, { ChangeEvent } from 'react'
import { Funnel } from 'lucide-react'
import { NFTCard } from '../landingPage/collection'

export interface CoinData {
  address: string
  score: number
  // creator: string;
  // creator_display_name: string;
  current_price: string
  description: string | null
  image_url: string
  market_cap: number
  name: string
  ticker: string
  total_held: number
  current_marketcap: number
}

export interface FilterOptions {
  filter: 'all' | 'drcscore' | 'name'
}

interface CoinFilterProps {
  coins: CoinData[]
  filter: FilterOptions['filter']
  searchTerm: string
  viewMode: 'card' | 'list'
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void
  onFilterChange: (filter: FilterOptions['filter']) => void
  onViewModeChange: (viewMode: 'card' | 'list') => void
}

const CoinFilter: React.FC<CoinFilterProps> = ({
  coins,
  filter,
  searchTerm,
  viewMode,
  onSearchChange,
  onFilterChange,
  onViewModeChange
}) => {
  return (
    <div className='bg-transperant min-h-screen p-4 sm:p-8 z-10 w-full'>
      <div className='mx-auto'>
        {/* Header */}
        <div className='mx-auto text-center rounded-md px-6 mb-8'>
          <h1 className='text-5xl font-bold mb-3 text-gray-100'>MarketPlace</h1>
          <p className='text-lg text-gray-400'>
            Discover and invest in innovative projects launched on the
            blockchain.
          </p>
        </div>

        {/* Navbar */}
        <nav className='mb-8 mx-[-32px] bg-[#1F1A31] px-6 py-3 flex flex-col md:flex-row items-center justify-between w-[calc(100%+64px)] gap-2 md:gap-8'>
          <div className='flex items-center flex-1 max-w-[600px]'>
            <input
              type='text'
              placeholder="Let's Go!"
              value={searchTerm}
              onChange={onSearchChange}
              className='w-full bg-transparent rounded-sm px-2 py-1 text-white placeholder-gray-500 border border-[#232842] focus:outline-none focus:ring-2 focus:ring-[#9A83F6CC] transition'
              aria-label='Search coins by ID or name'
              spellCheck={false}
            />
          </div>

          <div className='flex flex-col sm:flex-row items-center space-x-4'>
            {/* Filter Controls */}
            <div className='flex items-center space-x-2 min-w-[220px]'>
              <div className='flex items-center space-x-1 text-[#9A83F6CC] font-medium select-none'>
                <Funnel className='w-5 h-5' />
                <span>Filter</span>
              </div>
              <div className='flex space-x-1'>
                {(
                  ['all', 'DRC Score', 'name'] as FilterOptions['filter'][]
                ).map(type => (
                  <button
                    key={type}
                    onClick={() => onFilterChange(type)}
                    className={`px-6 py-2 text-sm rounded transition-colors ${
                      filter === type
                        ? 'bg-[#9A83F6CC] text-white'
                        : 'bg-[#232842] text-white'
                    }`}
                    aria-pressed={filter === type}
                  >
                    {type === 'all'
                      ? 'All'
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className='flex items-center space-x-2'>
              <span className='text-gray-400 text-sm mr-2'>View:</span>
              <div className='flex bg-gray-800/50 rounded-lg border border-gray-700'>
                <button
                  onClick={() => onViewModeChange('card')}
                  className={`flex items-center justify-center px-4 py-2 rounded-l-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'card'
                      ? 'bg-white/90 text-purple-300 shadow-sm'
                      : 'text-[#9a83f6] hover:text-white'
                  }`}
                >
                  {/* Grid Icon - 2x2 squares */}
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <rect x='3' y='3' width='7' height='7' rx='1' />
                    <rect x='14' y='3' width='7' height='7' rx='1' />
                    <rect x='3' y='14' width='7' height='7' rx='1' />
                    <rect x='14' y='14' width='7' height='7' rx='1' />
                  </svg>
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`flex items-center justify-center px-4 py-2 rounded-r-md text-sm font-medium transition-colors duration-200 ${
                    viewMode === 'list'
                      ? 'bg-white/90 text-purple-300 shadow-sm'
                      : 'text-[#9a83f6] hover:text-white'
                  }`}
                >
                  {/* List Icon - horizontal lines with dots */}
                  <svg
                    className='w-5 h-5'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <circle cx='4' cy='6' r='1.5' />
                    <rect x='8' y='5' width='12' height='2' rx='1' />
                    <circle cx='4' cy='12' r='1.5' />
                    <rect x='8' y='11' width='12' height='2' rx='1' />
                    <circle cx='4' cy='18' r='1.5' />
                    <rect x='8' y='17' width='12' height='2' rx='1' />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Coins display based on view mode */}
        {coins.length === 0 ? (
          <p className='text-center text-gray-400 mt-10'>No coins found.</p>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6'>
                {coins.map(coin => (
                  <NFTCard key={coin.address} nft={coin} viewMode='card' />
                ))}
              </div>
            ) : (
              <div className='divide-y divide-gray-800'>
                {coins.map(coin => (
                  <NFTCard key={coin.address} nft={coin} viewMode='list' />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CoinFilter
