// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useMemo } from 'react';
import { useSolana } from '../../solanaClient';
import { useParams } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { Link } from 'react-router-dom';
import { Toast, useToast } from '../general/Toast';
import { useSolBalance } from '../hook/solanabalance';
import axios from "axios";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

interface BuyAndSellProps {
    coinData?: {
        ticker?: string;
        current_price?: string;
    };
}

function shortenAddress(address:string) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

async function getSolanaPriceUSD() {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await response.json();
    const price = data.solana.usd;
    return price;
}

function BuyAndSell({coinData}: BuyAndSellProps) {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('0.001');
    const {BuyTokenMint, SellTokenMint} = useSolana()
    const { id } = useParams();
    const wallet = useWallet();
    const { connection } = useConnection();
    const { showToast, toastMessage, toastType, showToastMessage, setShowToast } = useToast();
    const [solPrice, setSolPrice] = useState<number>(1);
    const tokenPrice = useMemo(() => {
        const coinPriceInSol = parseFloat(coinData?.current_price || '0');
        return coinPriceInSol * solPrice;
    }, [coinData?.current_price, solPrice]);
    const {balance, refetchBalance} = useSolBalance(connection);

    const handleTokenAction = async () => {
        if (!id) return;

        // await refetchBalance();
        const mintFn = (activeTab === 'buy') ? BuyTokenMint : SellTokenMint
        if (!mintFn){
            showToastMessage(`No function available to ${activeTab} tokens.`, "error");
            return
        }

        try {
            const res = await mintFn(new PublicKey(id), Number(amount));
            showToastMessage(
                <Link to={`https://explorer.solana.com/tx/${res.tx}?cluster=devnet`} target='_blank' className='underline'>
                    Tokens{activeTab==='buy' ?'bought': 'sold'} successfully! View on Explorer
                </Link>,
                'success'
            );
            await refetchBalance();
        } catch (error) {
            console.error(`Error ${activeTab}ing tokens:`, error);
            showToastMessage(`Failed to ${activeTab} tokens. Please try again.`, 'error');
        }
    };

    const handleAction = async () => {
        try {
            // Connect if not already
            if (!wallet.connected) {
                await wallet.connect(); // User might reject this
                return
            }
            await handleTokenAction();
        } catch (err) {
            console.error("Wallet connection or action failed:", err);
            showToastMessage("Action cancelled or failed. Please try again.", "error");
        }
    };

    useEffect(() => {
        let isMounted = true;
    
        const fetchSolPrice = async () => {
            try {
                const price = await getSolanaPriceUSD();
                if (isMounted && price) {
                    setSolPrice(price);
                }
            } catch (err) {
                console.error("Failed to fetch SOL price:", err);
            }
        };
    
        fetchSolPrice(); // Fetch immediately on mount
        const interval = setInterval(fetchSolPrice, 60000*5); // Then every 60s*5
    
        return () => {
            isMounted = false;
            clearInterval(interval); // Clean up on unmount
        };
    }, []); 

    // can still be improved
    // restricting the entry to this view if not verified
    // For top holders
    const [topHolders, setTopHolders] = useState<{ address: string; percentage: string }[]>([
        { address: '8rqb2fJrj...', percentage: '92%' },
        { address: '8rqb2fJrj...', percentage: '0.97%' },
    	{ address: '8rqb2fJrj...', percentage: '0.97%' },
        { address: '8rqb2fJrj...', percentage: '0.97%' },
        { address: '8rqb2fJrj...', percentage: '0.97%' },
    ]);

    // For analytics summary
    const [holderAnalytics, setHolderAnalytics] = useState<{ label: string; value: string }[]>([
		{ label: 'Total Holders', value: '200,000' },
		// { label: 'T2 Holders', value: '99' },
		// { label: 'Holders with 500K-500K', value: '25%' },
    	// { label: 'Holders with 500K-49M', value: '25%' },
    ]);

    const getFormattedValues = (amount: string, price: number) => {
        const parsedAmount = parseFloat(amount || '0');
        const solVaue = parsedAmount * price
        const usdValue = solVaue * solPrice;
    
        const usdFormatted = usdValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
        });

        const solFormatted = `${solVaue.toFixed(4)} SOL`;
        // look at price per token properly
    
        return { usdFormatted, solFormatted };
    };

    const { usdFormatted, solFormatted } = useMemo(() => {
        return getFormattedValues(amount, parseFloat(coinData?.current_price || "0"));
    }, [amount, coinData?.current_price]);

    useEffect(() => {
        const fetchCoinHolders = async () => {
            if (!id) {
              return;
            }
            try {
				const response = await axios.get(
					// `http://127.0.0.1:8000/api/coins/${id}/holders`
                    `https://solana-market-place-backend.onrender.com/api/coins/${id}/holders`
				);
				const holders:Array<{}> = response.data
				setTopHolders(
					holders.map((item: any) => ({
						percentage: `${item.held_percentage}%`,
						address: shortenAddress(item.user_wallet_address),
                        // change this if it has a displayname later
					}))
				)
				setHolderAnalytics([
					{label: 'Total Holders', value: holders.length.toString()}
				])
            } catch (e) {
              console.error("Error fetching coin data:", e);
            }
          };
        fetchCoinHolders(); // might want to use this differently
      }, [id]);

    return (
        <div className="bg-custom-dark-blue rounded-lg p-4  text-white md:mr-12 lg:mr-24 w-full">
            {/* Buy/Sell Tabs */}
            <div className="flex justify-between lg:w-64 mb-4">
                <button
                    onClick={() => {setActiveTab('buy')}}
                    className={` py-2 px-4 rounded-md w-24  font-medium ${activeTab === 'buy'
                        ? 'bg-custom-light-purple text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => {setActiveTab('sell')}}
                    className={` py-2 px-4 rounded-md w-24 font-medium ${activeTab === 'sell'
                        ? 'bg-custom-light-purple text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    Sell
                </button>
            </div>
            <div className="flex justify-end text-sm text-gray-400 mt-1">
                <span className="italic tracking-tight">
                    ({usdFormatted}) {solFormatted}
                </span>
            </div>
            {/* Amount Input */}
            <div className="mb-0">
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-custom-dark-blue border border-gray-600 rounded-md px-3 py-2 text-white 
                        focus:outline-none focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                        [&::-webkit-inner-spin-button]:appearance-none"
                        step="0.001"
                        min="0"
                    />
                    <span className="absolute right-3 top-2 text-gray-400">{coinData?.ticker}</span>
                </div>
            </div>
            {/* Token Price */}
            <div className="flex justify-start text-sm text-gray-300 mb-2">
                <span>${tokenPrice.toFixed(4)} per token</span>
            </div>

            {/* Balance */}
            <div className="flex justify-end text-sm text-gray-300 mb-6">
                <span>Balance:</span>
                <span>{balance.toFixed(4)} SOL</span>
            </div>            

            {/* Connect Wallet Button */}
            {/* <WalletMultiButton /> */}
            {/* wrong */}
            <button
                onClick={handleAction}
                className={`py-2 px-4 rounded-md w-24 w-full font-medium ${wallet.connected
                    ? 'bg-custom-light-purple text-white hover:bg-[#9A83F6] '
                    : 'bg-[#232842] text-gray-300 hover:bg-[#222635CC] border border-[#232842CC]'
                    }`}
            >
                {wallet.connected ? 'Trade' : 'Connect Wallet to trade'}
            </button>
            {/* change this when possible to the correct thing */}
            {/* add the proper spending in the controls */}

            {/* Top Holders Section */}
            <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Top Holders</h3>
                <div className="space-y-2">
                    {topHolders.map((holder, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-xs font-bold text-black">🏆</span>
                                </div>
                                <span className="text-custom-light-purple text-sm font-mono">
                                    {holder.address}
                                </span>
                            </div>
                            <span className="text-gray-300 text-sm">{holder.percentage}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Holder Analytics Section */}
            <div>
                <h3 className="text-white font-medium mb-3">Holder Analytics</h3>
                <div className="space-y-2">
                    {holderAnalytics.map((analytic, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-xs font-bold text-black">🏆</span>
                                </div>
                                <span className="text-custom-light-purple text-sm">
                                    {analytic.label}
                                </span>
                            </div>
                            <span className="text-gray-300 text-sm">{analytic.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                />
            )}
        </div>
    );
}

export default BuyAndSell;