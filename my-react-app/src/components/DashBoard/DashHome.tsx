import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashHome = () => {
    const [coins] = useState([
        {
            id: 1,
            name: 'Doge Solana',
            symbol: 'SD',
            amount: '12,500 Tokens',
            category: 'Meme Coin',
            price: '$125M',
            change: '+1.5%',
            changeType: 'positive',
            color: 'bg-purple-600'
        },
        {
            id: 2,
            name: 'Pump Fun',
            symbol: 'PF',
            amount: '500 Tokens',
            category: 'Meme Coin',
            price: '$125M',
            change: '+1.7%',
            changeType: 'positive',
            color: 'bg-blue-600'
        },
        {
            id: 3,
            name: 'Doge Solana',
            symbol: 'SD',
            amount: '12,500 Tokens',
            category: 'Meme Coin',
            price: '$125M',
            change: '+1.5%',
            changeType: 'positive',
            color: 'bg-purple-600'
        },
        {
            id: 4,
            name: 'Doge Solana',
            symbol: 'SD',
            amount: '12,500 Tokens',
            category: 'Meme Coin',
            price: '$125M',
            change: '+1.5%',
            changeType: 'positive',
            color: 'bg-purple-600'
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">SD</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Dashboard</h1>
                        <p className="text-gray-400 text-sm">Bot online: 18</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-300">500</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* SQL Queries */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">SQL Queries</div>
                    <div className="text-3xl font-bold">12.86 SQL</div>
                </div>

                {/* Portfolio Value */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                    <div className="text-3xl font-bold">$ 3,300</div>
                </div>

                {/* Coins Created */}
                <div className="bg-gray-800 rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-sm mb-2">Coins Created</div>
                        <div className="text-3xl font-bold">1</div>
                    </div>
                    <button className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors">
                        <Plus className="w-5 h-5" />
                        <Link to="coin/create" className="ml-2 text-sm">
                            <span className="ml-2 text-sm">Create New</span>
                        </Link>
                    </button>
                </div>
            </div>

            {/* Your Coins Section */}
            <div>
                <h2 className="text-xl font-bold mb-6">Your Coins</h2>
                <div className="space-y-4">
                    {coins.map((coin) => (
                        <div
                            key={coin.id}
                            className="bg-gray-800 rounded-xl p-6 flex items-center justify-between hover:bg-gray-750 transition-colors"
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 ${coin.color} rounded-full flex items-center justify-center`}>
                                    <span className="text-white font-bold">{coin.symbol}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{coin.name}</h3>
                                    <p className="text-gray-400 text-sm">{coin.amount}</p>
                                    <p className="text-gray-500 text-xs">{coin.category}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-gray-400 text-xs mb-1">DOGE</div>
                                <div className="text-white font-semibold">{coin.price}</div>
                                <div className="text-gray-400 text-sm">{coin.change}</div>
                                <div className="text-green-400 text-xs">+1.50%</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashHome;