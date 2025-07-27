import { useState, useEffect, useMemo } from 'react';
import { useSolana } from '../../solanaClient';
import { useParams, Link } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { Toast, useToast } from '../general/Toast';
import { useSolBalance } from '../../hooks/solanabalance';
import axios from 'axios';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

interface BuyAndSellProps {
  coinData?: {
    ticker?: string;
    current_price?: string;
  };
}

function shortenAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const BuyAndSell = ({ coinData }: BuyAndSellProps) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('0.001');
  const [solPrice, setSolPrice] = useState<number>(1);
  const [topHolders, setTopHolders] = useState<{ address: string; percentage: string }[]>([]);
  const [holderAnalytics, setHolderAnalytics] = useState<{ label: string; value: string }[]>([]);

  const { BuyTokenMint, SellTokenMint } = useSolana();
  const { id } = useParams();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { balance, refetchBalance } = useSolBalance(connection);
  const { showToast, toastMessage, toastType, showToastMessage, setShowToast } = useToast();

  const tokenPrice = useMemo(() => {
    const coinPriceInSol = parseFloat(coinData?.current_price || '0');
    return coinPriceInSol * solPrice;
  }, [coinData?.current_price, solPrice]);

  const getFormattedValues = (amount: string, price: number) => {
    const parsedAmount = parseFloat(amount || '0');
    const solValue = parsedAmount * price;
    const usdValue = solValue * solPrice;

    return {
      usdFormatted: usdValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
      }),
      solFormatted: `${solValue.toFixed(4)} SOL`,
    };
  };

  const { usdFormatted, solFormatted } = useMemo(() => {
    return getFormattedValues(amount, parseFloat(coinData?.current_price || '0'));
  }, [amount, coinData?.current_price, solPrice]);

  const handleTokenAction = async () => {
    if (!id) return;

    const mintFn = activeTab === 'buy' ? BuyTokenMint : SellTokenMint;
    if (!mintFn) {
      showToastMessage(`No function available to ${activeTab} tokens.`, 'error');
      return;
    }

    try {
      const res = await mintFn(new PublicKey(id), Number(amount));
      showToastMessage(
        <Link to={`https://explorer.solana.com/tx/${res.tx}?cluster=devnet`} target="_blank" className="underline">
          Tokens {activeTab === 'buy' ? 'bought' : 'sold'} successfully! View on Explorer
        </Link>,
        'success'
      );
      await refetchBalance();
    } catch (error) {
      console.error(`Error ${activeTab}ing tokens:`, error);
      showToastMessage(`Failed to ${activeTab} tokens. Please try again.`, 'error');
    }
  };

  // Fetch SOL price
  useEffect(() => {
    let isMounted = true;

    const fetchSolPrice = async () => {
      try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const data = await response.json();
        if (isMounted && data?.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch (err) {
        console.error("Failed to fetch SOL price:", err);
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 300000); // every 5 mins

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch coin holders data
  useEffect(() => {
    const fetchCoinHolders = async () => {
      if (!id) return;

      try {
        const response = await axios.get(`https://solana-market-place-backend.onrender.com/api/coins/${id}/holders`);
        const holders = response.data;
        setTopHolders(
          holders.map((item: any) => ({
            percentage: `${item.held_percentage}%`,
            address: shortenAddress(item.user_wallet_address),
          }))
        );
        setHolderAnalytics([{ label: 'Total Holders', value: holders.length.toString() }]);
      } catch (e) {
        console.error("Error fetching coin holders:", e);
      }
    };

    fetchCoinHolders();
  }, [id]);

  return (
    <div className="bg-custom-dark-blue rounded-lg p-4 text-white w-full">
      {/* Tabs */}
      <div className="flex justify-between lg:w-64 mb-4">
        {['buy', 'sell'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'buy' | 'sell')}
            className={`py-2 px-4 rounded-md w-24 font-medium ${activeTab === tab
                ? 'bg-custom-light-purple text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Value display */}
      <div className="flex justify-end text-sm text-gray-400 mt-1">
        <span className="italic tracking-tight">{solFormatted} ({usdFormatted})</span>
      </div>

      {/* Amount input */}
      <div className="mb-2 relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-custom-dark-blue border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          step="0.001"
          min="0"
        />
        <span className="absolute right-3 top-2 text-gray-400">{activeTab === 'buy' ? 'SOL' : coinData?.ticker}</span>
      </div>

      {/* Balance and price */}
      <div className="flex justify-between text-sm gap-4 mb-2">
        <div className="text-gray-400">Balance <span className="text-white">{balance.toFixed(4)} SOL</span></div>
        <div className="text-gray-400 text-right">
          <span className="text-purple-400">${tokenPrice.toFixed(6)}</span> per token
        </div>
      </div>

      {/* Top Holders */}
      <div className="mb-6">
        <h3 className="text-white font-medium mb-3">Top Holders</h3>
        <div className="space-y-2">
          {topHolders.length === 0 ? (
            <p>No holders found</p>
          ) : (
            topHolders.map((holder, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-custom-light-purple font-mono">{holder.address}</span>
                <span className="text-gray-300">{holder.percentage}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Holder Analytics */}
      <div>
        <h3 className="text-white font-medium mb-3">Holder Analytics</h3>
        <div className="space-y-2">
          {holderAnalytics.map((analytic, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-custom-light-purple">{analytic.label}</span>
              <span className="text-gray-300">{analytic.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default BuyAndSell;
