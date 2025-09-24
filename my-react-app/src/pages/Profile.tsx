// import { Users, Heart, Star, ArrowDownRightFromCircle } from 'lucide-react';
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'

interface UserInfo {
  display_name: string
  wallet_address: string
  devscore: number
  tradescore: number
}

function Profile () {
  const [activeTab, setActiveTab] = useState('mintedCoins')
  const [coins, setCoins] = useState<any[]>([])
  const [heldCoins, setHeldCoins] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  // const [wAddress, setWAddress] = useState<string>('emptyaddress');
  const { address } = useParams()

  function shortenAddress (address: string) {
    if (!address || address.length < 10) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const followingSample = ['User 1', 'User 2', 'User 3', 'User 4']
  const followersSample = [
    'Follower A',
    'Follower B',
    'Follower C',
    'Follower D'
  ]

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await axios.get(
          'https://solana-market-place-backend.onrender.com/api/dashboard/profile',
          {
            params: { address },
            headers: { Authorization: `Token ${token}` }
          }
        )

        const { user, created_coins, holdings } = response.data
        setUserInfo(user)
        setCoins(created_coins)
        setHeldCoins(holdings)

        console.log(response.data)
      } catch (err) {
        console.error('Error fetching user info:', err)
      }
    }
    loadHistory()
  }, [address])

  if (!userInfo) {
    return (
      <div className='text-white text-center p-10'>Loading user profile...</div>
    )
  }

  return (
    <div className='relative min-h-screen sm:min-h-[180vh] xl:min-h-[124vh] overflow-x-hidden'>
      <div className='h-32 sm:h-48 lg:h-64 z-10 crtGradient background-container top-10 left-10'></div>

      <div className='h-auto min-h-[900px] mx-auto bg-custom-dark-blue relative flex flex-col items-center justify-center px-2 xs:px-4'>
        <div className='flex justify-center absolute mt-4 sm:mt-10 flex-col border-gray-600 border max-w-[970px] w-full top-[-200px] sm:top-[-150px] mx-auto bg-custom-dark-blue z-10 p-2 sm:p-4 text-white rounded'>
          <div className='mb-4 sm:mb-8'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-6 border-b border-gray-800 space-y-4 sm:space-y-0'>
              <div className='flex items-center space-x-3 sm:space-x-4'>
                <div className='w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-400 to-yellow-500 flex items-center justify-center flex-shrink-0'>
                  <span className='text-lg sm:text-xl font-bold'>🚀</span>
                </div>
                <div className='flex flex-col min-w-0'>
                  <div className='mb-2 sm:mb-0'>
                    <h1 className='text-lg sm:text-xl font-semibold max-w-md text-ellipsis truncate'>
                      {userInfo.display_name}
                    </h1>
                    <p className='text-gray-400 text-xs sm:text-sm'>
                      {shortenAddress(userInfo.wallet_address)}
                    </p>
                  </div>
                  <div className='flex flex-col sm:flex-row sm:space-x-2 space-y-1 sm:space-y-0'>
                    <h2 className='text-sm sm:text-base text-[#CCC1FA] font-bold'>
                      Dev score: {userInfo.devscore}
                    </h2>
                    <h2 className='text-sm sm:text-base text-[#CCC1FA] font-bold'>
                      Trader score: {userInfo.tradescore}
                    </h2>
                  </div>
                </div>
              </div>
              <button className='bg-custom-light-purple hover:bg-[#9a84ff] px-4 py-2 rounded-md text-sm font-medium transition-colors self-start sm:self-auto'>
                Follow
              </button>
            </div>
            {/* Display toggle buttons */}

            <div className='p-2 sm:p-6'>
              <div className='w-full font-sans'>
                <div className='overflow-x-auto sm:overflow-x-visible pb-1'>
                  <div className='flex flex-row min-w-max sm:min-w-0'>
                    <button
                      className={`px-3 py-3 sm:px-6 flex-shrink-0 sm:flex-1 font-medium text-xs sm:text-sm focus:outline-none relative whitespace-nowrap ${
                        activeTab === 'mintedCoins'
                          ? 'text-[#7E6DC8] font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('mintedCoins')}
                    >
                      <span className='text-[#b5a7f3] text-xs sm:text-sm mr-1'>
                        {coins.length}
                      </span>
                      Created Coins
                      {activeTab === 'mintedCoins' && (
                        <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]'></span>
                      )}
                    </button>
                    <button
                      className={`px-3 py-3 sm:px-6 flex-shrink-0 sm:flex-1 font-medium text-xs sm:text-sm focus:outline-none relative whitespace-nowrap ${
                        activeTab === 'heldCoins'
                          ? 'text-[#7E6DC8] font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('heldCoins')}
                    >
                      <span className='text-[#b5a7f3] text-xs sm:text-sm mr-1'>
                        {heldCoins.length}
                      </span>
                      Held Coins
                      {activeTab === 'heldCoins' && (
                        <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]'></span>
                      )}
                    </button>

                    <button
                      className={`px-3 py-3 sm:px-6 flex-shrink-0 sm:flex-1 font-medium text-xs sm:text-sm focus:outline-none relative whitespace-nowrap ${
                        activeTab === 'followers'
                          ? 'text-[#7E6DC8] font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('followers')}
                    >
                      <span className='text-[#b5a7f3] text-xs sm:text-sm mr-1'>
                        {followersSample.length}
                      </span>
                      Followers
                      {activeTab === 'followers' && (
                        <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]'></span>
                      )}
                    </button>

                    <button
                      className={`px-3 py-3 sm:px-6 flex-shrink-0 sm:flex-1 font-medium text-xs sm:text-sm focus:outline-none relative whitespace-nowrap ${
                        activeTab === 'following'
                          ? 'text-[#7E6DC8] font-semibold'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveTab('following')}
                    >
                      <span className='text-[#b5a7f3] text-xs sm:text-sm mr-1'>
                        {followingSample.length}
                      </span>
                      Following
                      {activeTab === 'following' && (
                        <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]'></span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* display beginning */}

            <div className='px-2 py-2 sm:px-6 sm:py-6'>
              {activeTab === 'mintedCoins' && (
                <div className='space-y-2 sm:space-y-4'>
                  <div className='overflow-x-auto'>
                    <ul className='space-y-1 sm:space-y-0'>
                      {(coins || []).map((coin, index) => (
                        <Link
                          to={`/coin/${coin.address}`}
                          key={index}
                          className='no-underline'
                        >
                          <li className='py-3 sm:py-4 flex hover:bg-[#181b29] transition-colors p-2 sm:p-4 rounded-md justify-between items-center'>
                            <div className='flex items-center min-w-0 flex-1'>
                              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'></div>
                              <div className='min-w-0'>
                                <p className='font-medium text-sm sm:text-base truncate'>
                                  {coin.name}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  Market Cap
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center justify-center space-y-1 flex-col text-right flex-shrink-0 ml-2'>
                              <p className='text-xs text-gray-500'>
                                {coin.ticker}
                              </p>
                              <p className='text-xs text-gray-500'>
                                $ {coin.current_marketcap}
                              </p>
                            </div>
                          </li>
                        </Link>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'heldCoins' && (
                <div className='space-y-2 sm:space-y-4'>
                  <div className='overflow-x-auto'>
                    <ul className='space-y-1 sm:space-y-0'>
                      {(heldCoins || []).map((coin, index) => (
                        <Link
                          to={`/coin/${coin.coin_address}`}
                          key={index}
                          className='no-underline'
                        >
                          <li className='py-3 sm:py-4 flex hover:bg-[#181b29] transition-colors p-2 sm:p-4 rounded-md justify-between items-center'>
                            <div className='flex items-center min-w-0 flex-1'>
                              <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'></div>
                              <div className='min-w-0'>
                                <p className='font-medium text-sm sm:text-base truncate'>
                                  {coin.coin_name}
                                </p>
                                <p className='text-xs text-gray-500'>
                                  Amount Held:
                                </p>
                              </div>
                            </div>
                            <div className='flex items-center justify-center space-y-1 flex-col text-right flex-shrink-0 ml-2'>
                              <p className='text-xs text-gray-500'>
                                {coin.coin_ticker}
                              </p>
                              <p className='text-xs text-gray-500'>
                                {coin.amount_held} Sol
                              </p>
                            </div>
                          </li>
                        </Link>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'followers' && (
                <div className='space-y-2 sm:space-y-4'>
                  <ul className='space-y-1 sm:space-y-0'>
                    {followersSample.map((user, index) => (
                      <li
                        key={index}
                        className='flex hover:bg-[#181b29] transition-colors p-2 sm:p-4 rounded-md items-center'
                      >
                        <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'>
                          <span className='text-white text-sm sm:text-base'>
                            {user.charAt(0)}
                          </span>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium text-sm sm:text-base truncate'>
                            {user}
                          </p>
                          <p className='text-xs sm:text-sm text-gray-500 truncate'>
                            @{user.toLowerCase().replace(' ', '')}
                          </p>
                        </div>
                        <button className='ml-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#7E6DC8] rounded-md text-xs sm:text-sm font-medium text-white hover:bg-[#ab9af8] flex-shrink-0'>
                          Follow Back
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'following' && (
                <div className='space-y-2 sm:space-y-4'>
                  <ul className='space-y-1 sm:space-y-0'>
                    {followingSample.map((user, index) => (
                      <li
                        key={index}
                        className='py-3 sm:py-4 flex hover:bg-[#181b29] transition-colors p-2 sm:p-4 rounded-md items-center'
                      >
                        <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'>
                          <span className='text-white text-sm sm:text-base'>
                            {user.charAt(0)}
                          </span>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium text-sm sm:text-base truncate'>
                            {user}
                          </p>
                          <p className='text-xs sm:text-sm text-gray-500 truncate'>
                            @{user.toLowerCase().replace(' ', '')}
                          </p>
                        </div>
                        <button className='ml-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-white bg-[#4d427b] hover:bg-[#9a84ff] hover:text-white transition-colors flex-shrink-0'>
                          Unfollow
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
