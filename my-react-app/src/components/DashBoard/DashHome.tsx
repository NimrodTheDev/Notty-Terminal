import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from "axios";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from '@solana/web3.js';

type CoinItem = { // can make the coin object optional
    amount_held : string;
    coin : string;
    coin_name : string;
    coin_ticker : string;
    current_price : number;
    user :  string;
    value : number;
    market_cap: number;
};

type UserInfo = { // can make the coin object optional
    devscore: number;
    tradescore: number;
};

// we have issues when working with laports note <don't> remove this.
// connect issue

function shortenAddress(address:string) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
  

const DashHome = () => {
    const [coins, setCoins] = useState<CoinItem[]>(
        [
            // {
            //     id: 1, // there is no id
            //     name: 'Doge Solana',
            //     symbol: 'SD', // ticker
            //     amount: '12,500 Tokens', // use the ticker to generate this with the amount held
            //     category: 'Meme Coin', // no category
            //     price: '$125M', // price
            //     change: '+1.5%', // ??
            //     changeType: 'positive', // ??
            //     color: 'bg-purple-600' // generate it
            // },
            // {
            //     id: 2,
            //     name: 'Pump Fun',
            //     symbol: 'PF',
            //     amount: '500 Tokens',
            //     category: 'Meme Coin',
            //     price: '$125M',
            //     change: '+1.7%',
            //     changeType: 'positive',
            //     color: 'bg-blue-600'
            // },
            // {
            //     id: 3,
            //     name: 'Doge Solana',
            //     symbol: 'SD',
            //     amount: '12,500 Tokens',
            //     category: 'Meme Coin',
            //     price: '$125M',
            //     change: '+1.5%',
            //     changeType: 'positive',
            //     color: 'bg-purple-600'
            // },
            // {
            //     id: 4,
            //     name: 'Doge Solana',
            //     symbol: 'SD',
            //     amount: '12,500 Tokens',
            //     category: 'Meme Coin',
            //     price: '$125M',
            //     change: '+1.5%',
            //     changeType: 'positive',
            //     color: 'bg-purple-600'
            // }
        ]
    );
    const [portfolioValue, setPortfolioValue] = useState<number>(0);
    const [createdCoins, setCreatedCoins] = useState<number>(0);
    const wallet = useWallet();
    const { connection } = useConnection();
    const [balance, setBalance] = useState<number>(0);
    const [userInfo, setUserInfo] = useState<UserInfo>({tradescore:0,devscore:0});
    const [wAddress, setWAddress] = useState<string>('emptyaddress');

    // for fetching the wallet amount
    useEffect(() => {
        const fetchBalance = async () => {
            console.log(wallet.connected)
            if (wallet.connected) {
                const pubkey = wallet.publicKey;
                if (pubkey instanceof PublicKey){
                    const lamports = await connection.getBalance(pubkey);
                    setWAddress(pubkey.toBase58());
                const sol = lamports / 1e9;
                setBalance(sol);
                }
            }
        };
        fetchBalance();
      }, [wallet.connected, wallet.publicKey]);

    useEffect(() => {
        const fetchAllCoins = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await axios.get(
                    `https://solana-market-place-backend.onrender.com/api/dashboard`,
                    // 'http://127.0.0.1:8000/api/dashboard',
                    {
                        headers: { Authorization: `Token ${token}` }
                    }

                )
                const { user, holdings, created_coins: coins } = response.data;
                console.log(wallet.publicKey?.toBase58())
                console.log("Holdings:", holdings);
                // move to work calculations to the backend incase of pagification
                const netWorth = holdings.reduce((sum: number, item: { value: number; }) => sum + (item.value || 0), 0);
                setPortfolioValue(netWorth);
                setCreatedCoins(coins.length);
                setCoins(holdings);
                setUserInfo(user);
            } catch (err: any) {
                console.log(err)
            }
        };
        fetchAllCoins();
    }, []);

    return (
        <div className="min-h-screen relative  bg-custom-dark-blue text-white p-6">
            {/* Header */}
            {/* remove the custom color #4D427B make t global */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#4D427B] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">SD</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Dashboard</h1>
                        <p className="text-gray-400 text-sm">{shortenAddress(wAddress)}</p>
                        {/* get the wallet address */}
                        <div className='flex space-x-2'>
                            <h2 className="text-l font-bold">Dev score: {userInfo?.devscore}</h2>
                            <h2 className="text-l font-bold">Trader score: {userInfo?.tradescore}</h2>
                        </div>
                        
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-300">500</span>
                    {/* What is this 500 */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1  gap-6 mb-8">
                <div className="flex gap-5 ">
                    {/* SQL Queries, change this when you see the it */}
                    <div className="bg-custom-nav-purple flex-1 rounded-xl p-4">
                        <div className="text-gray-400 text-sm mb-2">SOL Balance</div>
                        <div className="text-3xl font-bold">{balance.toFixed(4)} SOL</div>
                    </div>

                    {/* Portfolio Value */}
                    <div className="bg-custom-nav-purple rounded-xl flex-1 p-4">
                        <div className="text-gray-400 text-sm mb-2">Portfolio Value</div>
                        <div className="text-3xl font-bold">$ {portfolioValue.toLocaleString()}</div>
                    </div>
                </div>

                {/* Coins Created */}
                <div className="bg-custom-nav-purple rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-sm mb-2">Coins Created</div>
                        <div className="text-3xl font-bold">{createdCoins}</div>
                    </div>
                    <button className="bg-[#232842] hover:bg-[#222635CC] rounded p-2 transition-colors px-4 py-2 border border-[#FFFFFF1A]">
                        <Link to="/dashboard/coin/create" className="text-sm">
                            <span className="flex text-sm gap-2"><Plus className="w-5 h-5" /> Create New</span>
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
                            // key={coin.id}
                            className="bg-custom-nav-purple rounded-md p-6 flex items-center justify-between hover:bg-gray-750 transition-colors"
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 bg-[#4D427B] rounded-full flex items-center justify-center`}>
                                    <span className="text-white font-bold">{coin.coin_ticker}</span>
                                </div>
                                {/* the image can be used here instead */}
                                <div>
                                    <h3 className="font-bold text-lg">{coin.coin_name}</h3>
                                    <p className="text-gray-400 text-sm">
                                        {Number(coin.amount_held).toLocaleString()} {coin.coin_ticker.toLowerCase()}
                                    </p>
                                    {/* <p className="text-gray-500 text-xs">{coin.category}</p> */}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-gray-400 text-xs mb-1">{coin.coin_ticker}</div>
                                <div className="text-white font-semibold">
                                    ${(coin.current_price * coin.value).toLocaleString()} ({(coin.current_price * coin.value / 153.98).toFixed(2)} SOL)
                                </div>
                                <div className='flex space-x-1 justify-end items-center'>
                                    <div className="text-white font-semibold">${(coin.market_cap*coin.current_price).toLocaleString()}</div>
                                    <div className="text-green-400 text-sm">+1.90</div>
                                </div>
                                {/* <div className="text-green-400 text-sm">{coin.change}</div> */}
                                {/* it should show red, green, gray */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashHome;