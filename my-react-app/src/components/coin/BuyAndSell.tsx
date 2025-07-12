import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { Link } from "react-router-dom";
import { Toast, useToast } from "../general/Toast";
import { Connection } from "@solana/web3.js";
import { SolanaLaunchpad } from "../../solanaClient/launchPad";
import { LaunchpadFirebaseDB } from "../../firebase/db";
import { useWallet } from "@solana/wallet-adapter-react";

import { Buffer } from "buffer";
window.Buffer = Buffer;

interface BuyAndSellProps {
  coinData?: {
    ticker?: string;
    current_price?: string;
    decimals?: number;
  };
}

function BuyAndSell({ coinData }: BuyAndSellProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const { id: mintAddress } = useParams();
  const { showToast, toastMessage, toastType, showToastMessage, setShowToast } =
    useToast();
  const { publicKey, signTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize launchpad
  const connection = new Connection("https://api.devnet.solana.com");
  const firebaseDB = new LaunchpadFirebaseDB();
  const launchpad = new SolanaLaunchpad(connection, firebaseDB);

  const handleBuy = async () => {
    if (!mintAddress || !publicKey || !signTransaction) {
      showToastMessage("Please connect your wallet first", "error");
      return;
    }
    console.log(mintAddress);

    try {
      setIsProcessing(true);
      const result = await launchpad.buyTokens(
        publicKey,
        signTransaction,
        new PublicKey(mintAddress.toString().trim()),
        parseFloat(amount)
      );

      showToastMessage(
        <Link
          to={`https://explorer.solana.com/tx/${result.transaction}?cluster=devnet`}
          target="_blank"
          className="underline"
        >
          Bought {result.tokensReceived.toFixed(2)} {coinData?.ticker} tokens!
          View on Explorer
        </Link>,
        "success"
      );
    } catch (error: any) {
      console.error("Error buying tokens:", error);
      showToastMessage(
        error.message || "Failed to buy tokens. Please try again.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!mintAddress || !publicKey || !signTransaction) {
      showToastMessage("Please connect your wallet first", "error");
      return;
    }

    try {
      setIsProcessing(true);
      const result = await launchpad.sellTokens(
        publicKey,
        signTransaction,
        new PublicKey(mintAddress),
        parseFloat(amount)
      );

      showToastMessage(
        <Link
          to={`https://explorer.solana.com/tx/${result.transaction}?cluster=devnet`}
          target="_blank"
          className="underline"
        >
          Sold {amount} {coinData?.ticker} for {result.solReceived.toFixed(4)}{" "}
          SOL! View on Explorer
        </Link>,
        "success"
      );
    } catch (error: any) {
      console.error("Error selling tokens:", error);
      showToastMessage(
        error.message || "Failed to sell tokens. Please try again.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock data for holders
  const topHolders: {
    address: string;
    percentage: string;
  }[] = [
    // { address: '8rqb2fJrj...', percentage: '92%' },
    // { address: '8rqb2fJrj...', percentage: '0.97%' },
    // { address: '8rqb2fJrj...', percentage: '0.97%' },
    // { address: '8rqb2fJrj...', percentage: '0.97%' },
    // { address: '8rqb2fJrj...', percentage: '0.97%' },
  ];

  const holderAnalytics: {
    label: string;
    value: string;
  }[] = [
    // { label: 'Total Holders', value: '200,000' },
    // { label: 'T2 Holders', value: '99' },
    // { label: 'Holders with 500K-500K', value: '25%' },
    // { label: 'Holders with 500K-49M', value: '25%' },
  ];

  return (
    <div className="bg-custom-dark-blue rounded-lg p-4 text-white md:mr-12 lg:mr-24 w-full">
      {/* Buy/Sell Tabs */}
      <div className="flex justify-between lg:w-64 mb-4">
        <button
          onClick={() => setActiveTab("buy")}
          className={`py-2 px-4 rounded-md w-24 font-medium ${
            activeTab === "buy"
              ? "bg-custom-light-purple text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab("sell")}
          className={`py-2 px-4 rounded-md w-24 font-medium ${
            activeTab === "sell"
              ? "bg-custom-light-purple text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-custom-dark-blue border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            step="0.001"
            min="0"
          />
          <span className="absolute right-3 top-2 text-gray-400">
            {activeTab === "buy" ? "SOL" : coinData?.ticker}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={activeTab === "buy" ? handleBuy : handleSell}
        disabled={isProcessing || !publicKey}
        className={`w-full py-2 px-4 rounded-md font-medium mb-4 transition-colors ${
          isProcessing
            ? "bg-gray-600 cursor-not-allowed"
            : !publicKey
            ? "bg-gray-600 cursor-not-allowed"
            : activeTab === "buy"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {!publicKey
          ? "Connect Wallet"
          : isProcessing
          ? "Processing..."
          : activeTab === "buy"
          ? `Buy ${coinData?.ticker}`
          : `Sell ${coinData?.ticker}`}
      </button>

      {/* Connect Wallet Button */}
      <WalletMultiButton className="mb-4" />

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
