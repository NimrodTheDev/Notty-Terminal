// import { Users, Heart, Star, ArrowDownRightFromCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

function Profile() {
    const [activeTab, setActiveTab] = useState('createdCoins');

    const createdCoinsSample = [
        { id: 1, name: 'Coin A', drs: 100, creator: 'Tser A', marketCap: 1000 },
        { id: 2, name: 'Coin B', drs: 200, creator: 'User B', marketCap: 2000 },
        { id: 3, name: 'Coin C', drs: 300, creator: 'User C', marketCap: 3000 },
        { id: 4, name: 'Coin D', drs: 400, creator: 'User D', marketCap: 4000 },
    ];

    const followingSample = ['User 1', 'User 2', 'User 3', 'User 4'];
    const followersSample = ['Follower A', 'Follower B', 'Follower C', 'Follower D'];

    const createdBy = 'Tser A';

    const createdByCoins = [
        { id: 1, name: 'Coin A', drs: 100, creator: 'Tser A', marketCap: 1000 },
        { id: 2, name: 'Coin B', drs: 200, creator: 'User B', marketCap: 2000 },
        { id: 3, name: 'Coin C', drs: 300, creator: 'User C', marketCap: 3000 },
        { id: 4, name: 'Coin D', drs: 400, creator: 'User D', marketCap: 4000 },
    ]




    return (
        <div className='relative sm:min-h-[180vh] xl:min-h-[124vh]'>

            <div className="h-32 sm:h-48 lg:h-64 z-10 crtGradient background-container top-10 left-10">


            </div>

            <div className=" h-[1200px] mx-auto bg-custom-dark-blue relative flex items-center justify-center">
                <div className="flex justify-center absolute mt-10 flex-col border-gray-600 border max-w-[970px] 
                w-full top-[-150px] mx-auto bg-custom-dark-blue z-10 p-4 text-white rounded">
                    <div className="mb-8">
                        <div className="flex items-center justify-between sm:p-6 border-b border-gray-800">
                            <div className="flex items-center space-x-4">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400
                                 to-yellow-500 flex items-center justify-center">
                                    <span className="text-xl font-bold">🚀</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold">Username</h1>
                                    <p className="text-gray-400 text-sm">@username</p>
                                </div>
                            </div>
                            <button className="bg-custom-light-purple hover:bg-[#9a84ff] px-4 py-2
                             rounded-md text-sm font-medium transition-colors">
                                Follow
                            </button>
                        </div>
                        <div className=" flex flex-col sm:flex-row items-center justify-between p-6">
                            <div className="max-w-4xl w-full sm:flex-1 mx-auto sm:p-6 font-sans ">
                                {/* Tabs Navigation */}
                                <div className="flex flex-col sm:flex-row">
                                    <button
                                        className={`px-6 py-3 font-medium text-sm focus:outline-none relative ${activeTab === 'createdCoins'
                                            ? 'text-[#7E6DC8] font-semibold'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        onClick={() => setActiveTab('createdCoins')}
                                    >
                                        <span className="text-[#b5a7f3] w-8 h-8">{createdCoinsSample.length}</span> Created Coins
                                        {activeTab === 'createdCoins' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]"></span>
                                        )}
                                    </button>

                                    <button
                                        className={`px-6 py-3 font-medium text-sm focus:outline-none relative ${activeTab === 'followers'
                                            ? 'text-[#7E6DC8] font-semibold'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        onClick={() => setActiveTab('followers')}
                                    >
                                        <span className="text-[#b5a7f3] w-8 h-8 pr-1">{followersSample.length}</span>Followers
                                        {activeTab === 'followers' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]"></span>
                                        )}
                                    </button>

                                    <button
                                        className={`px-6 py-3 font-medium text-sm focus:outline-none relative ${activeTab === 'following'
                                            ? 'text-[#7E6DC8] font-semibold'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        onClick={() => setActiveTab('following')}
                                    >
                                        <span className="text-[#b5a7f3] w-8 h-8 pr-1">{followingSample.length}</span>Following
                                        {activeTab === 'following' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]"></span>
                                        )}
                                    </button>


                                </div>

                                {/* Tabs Content */}
                                <div className="py-6 border-gray-800 sm:border-r">
                                    {/* Created Coins Tab */}
                                    {activeTab === 'createdCoins' && (
                                        <div className="space-y-4">
                                            <div className="overflow-x-auto">
                                                <ul className="">
                                                    {createdCoinsSample.map((coin, index) => (
                                                        <Link to={`/coin/${coin.id}`} key={index} className="no-underline">
                                                            <li key={index} className="py-4 flex hover:bg-[#181b29] transition-colors p-4 rounded-md justify-between items-center">
                                                                <div className=" flex items-center">
                                                                    <div className="h-10 w-10 rounded-full bg-[#4d427b]  flex items-center justify-center mr-4">
                                                                        <span className=" text-white">{coin.creator.charAt(0)}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium">{coin.name}</p>
                                                                        <p className="text-xs text-gray-500">Market Cap</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-center space-y-1 flex-col">
                                                                    <p className="text-xs text-gray-500">DOGE</p>
                                                                    <p className="text-xs text-gray-500">$ {coin.marketCap}</p>
                                                                </div>
                                                            </li>
                                                        </Link>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* Followers Tab */}
                                    {activeTab === 'followers' && (
                                        <div className="space-y-4">
                                            <ul className="">
                                                {followersSample.map((user, index) => (
                                                    <li key={index} className=" flex hover:bg-[#181b29] transition-colors p-4 rounded-md items-center">
                                                        <div className="h-10 w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-4">
                                                            <span className="text-white">{user.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{user}</p>
                                                            <p className="text-sm text-gray-500">@{user.toLowerCase().replace(' ', '')}</p>
                                                        </div>
                                                        <button className="ml-auto px-4 py-2 bg-[#7E6DC8] rounded-md text-sm font-medium text-white hover:bg-[#ab9af8]">
                                                            Follow Back
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Following Tab */}
                                    {activeTab === 'following' && (
                                        <div className="space-y-4">
                                            <ul className="">
                                                {followingSample.map((user, index) => (
                                                    <li key={index} className="py-4 flex hover:bg-[#181b29] transition-colors p-4 rounded-md items-center">
                                                        <div className="h-10 w-10 rounded-full bg-[#4d427b]  flex items-center justify-center mr-4">
                                                            <span className="text-white">{user.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{user}</p>
                                                            <p className="text-sm text-gray-500">@{user.toLowerCase().replace(' ', '')}</p>
                                                        </div>
                                                        <button className="ml-auto px-4 py-2  rounded-md text-sm font-medium text-white bg-[#4d427b] hover:bg-[#9a84ff]  hover:text-white transition-colors  ">
                                                            Unfollow
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}


                                </div>
                            </div>

                            <div className="w-full sm:flex-1">
                                <div className=" mb-4 flex items-center  justify-between">
                                    <h1 className=" text-sm text-white">Created by {createdBy}</h1>
                                </div>
                                <div className=" py-4">
                                    {createdByCoins.map((coin, index) => (
                                        <Link to={`/coin/${coin.id}`} key={index} className="no-underline">
                                            <div className="flex items-center justify-between p-4 bg-inherit rounded-md hover:bg-[#232634] transition-colors">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-4">
                                                        <span className="text-white">{coin.creator.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{coin.name}</p>
                                                        <p className="text-xs text-gray-500">Market Cap</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center space-y-1 flex-col">
                                                    <p className="text-xs text-gray-500">DRS: {coin.drs}</p>
                                                    <p className="text-xs text-gray-500">$ {coin.marketCap}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}


export default Profile

