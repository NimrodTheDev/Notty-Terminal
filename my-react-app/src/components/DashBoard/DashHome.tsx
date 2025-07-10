import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect  } from "react";
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

// the back end data looks:
// amount_held : "1100000.00000000"
// coin : "2EXB4zm4Hj2E1s24VKmdXxupUBzUyDxxhnm22iEQxjTA"
// coin_name : "bitcoin"
// coin_ticker : "BTC"
// current_price : 1
// user :  "67xeoxxYgEvgXZRve4k9ABXootYuNL7BnXMbnGMbJvTj"
// value : 1100000

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
    const [portfolioValue, setPortfolioValue] = useState(3_300);
    const [createdCoins, setCreatedCoins] = useState(1);
    const wallet = useWallet();
    const { connection } = useConnection();
    const [balance, setBalance] = useState<number>(0); // should be zero not null
    const [userInfo, setUserInfo] = useState<UserInfo>({tradescore:0,devscore:0});

    useEffect(() => {
        const fetchBalance = async () => {
            console.log(wallet.connected)
            if (wallet.connected) {
                const pubkey = wallet.publicKey;
                if (pubkey instanceof PublicKey){
                    const lamports = await connection.getBalance(pubkey);
                const sol = lamports / 1e9;
                setBalance(sol);
                }
            }
        };
        fetchBalance();
      }, [wallet.connected]);

    useEffect(() => {
        const fetchAllCoins = async () => {
            try {
                
                // create two promises for gettting all created coins and all 
                const token = localStorage.getItem('auth_token');
                // const response = await Promise.all(
                //     [
                //         axios.get(
                //             // `https://solana-market-place-backend.onrender.com/api/coins/my-coins`
                //             'http://127.0.0.1:8000/api/holdings/my-coins/?market_cap=1',
                //             {
                //                 headers: { Authorization: `Token ${token}` }
                //             }

                //         ),
                //         axios.get(
                //             // `https://solana-market-place-backend.onrender.com/api/coins/my-coins`
                //             'http://127.0.0.1:8000/api/coins/my-coins',
                //             {
                //                 headers: { Authorization: `Token ${token}` }
                //             }
                //         )

                //     ]
                // )
                // const [holdings, coins] = response.map(res => res.data);
                const response = await axios.get(
                    // `https://solana-market-place-backend.onrender.com/api/coins/my-coins`
                    'http://127.0.0.1:8000/api/dashboard',
                    {
                        headers: { Authorization: `Token ${token}` }
                    }

                )
                const { user, holdings, created_coins: coins } = response.data;
                
                console.log("Holdings:", holdings);
                // move et work calculations to the backend incase of pagification
                const netWorth = holdings.reduce((sum: number, item: { value: number; }) => sum + (item.value || 0), 0) * 0.00675;
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
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-custom-light-purple rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">SD</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Dashboard</h1>
                        <p className="text-gray-400 text-sm">8xrt...dF2k</p>
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
                    {/* Whatis this 500 */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1  gap-6 mb-8">
                <div className="flex gap-5 ">
                    {/* SQL Queries */}
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
                    <button className="bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors">
                        <Link to="/dashboard/coin/create" className="text-sm space-x-4">
                            <span className="flex text-sm"><Plus className="w-5 h-5" /> Create New</span>
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
                                    ${((coin.current_price*0.00675) * coin.value).toLocaleString()} ({((coin.current_price*0.00675 * coin.value) / 153.98).toFixed(2)} SOL)
                                </div>
                                <div className='flex space-x-1 justify-end items-center'>
                                    <div className="text-white font-semibold">${(coin.market_cap*coin.current_price*0.00675).toLocaleString()}</div>
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