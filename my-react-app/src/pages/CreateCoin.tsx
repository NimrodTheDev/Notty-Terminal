import { useState, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
// import { useSolana } from "../solanaClient/index";
import { uploadFile } from "../solanaClient/usePinta";
import DragAndDropFileInput from "../components/general/dragNdrop";
import { Link } from "react-router-dom";
import { Toast } from "../components/general/Toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { LaunchpadFirebaseDB } from "../firebase/db";
import { SolanaLaunchpad } from "../solanaClient/launchPad";
import { DEFAULT_CONFIG } from "../utils/bondingConfig";
import { TokenLaunchParams } from "../bonding-interface";
import { getSolanaPriceUSD } from "../hooks/solanabalance";
import axios from "axios";
import {
  calculateTokenPrice,
} from "../utils/calculationHelpers";

// Keep original animation styles
const styles = `
@keyframes slide-up {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
`;

interface ValidationErrors {
  tokenName?: string;
  tokenSymbol?: string;
  tokenDescription?: string;
  tokenWebsite?: string;
  tokenTwitter?: string;
  tokenDiscord?: string;
  tokenImage?: string;
}

// Initialize Firebase services
const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC_URL || "https://api.devnet.solana.com"
);
const firebaseDB = new LaunchpadFirebaseDB();

function CreateCoin() {
  const [tokenName, settTokenName] = useState("");
  const [tokenSymbol, settTokenSymbol] = useState("");
  const [loading, setLoading] = useState({
    bool: false,
    msg: ""
  });
  const [tokenDescription, setTokenDescription] = useState("");
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [tokenWebsite, setTokenWebsite] = useState("");
  const [tokenTwitter, setTokenTwitter] = useState("");
  const [tokenDiscord, setTokenDiscord] = useState("");
  //   const { CreateAndInitToken } = useSolana();
  const [error] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [result, setResult] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<ReactNode>("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [createdTokenData, setCreatedTokenData] = useState<any>(null);
  const [showBondingCurveInfo, setShowBondingCurveInfo] = useState(false);

  // Phantom wallet integration
  const { publicKey, connected, signTransaction, connect } = useWallet();

  const validate = (): boolean => {
    const errors: ValidationErrors = {};

    // Check wallet connection first
    if (!connected || !publicKey) {
      showToastMessage("Please connect your Phantom wallet first", "error");
      return false;
    }

    // Original validation logic
    if (!tokenName.trim()) {
      errors.tokenName = "Token name is required";
    } else if (tokenName.length > 50) {
      errors.tokenName = "Token name must be less than 50 characters";
    }

    if (!tokenSymbol.trim()) {
      errors.tokenSymbol = "Token symbol is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(tokenSymbol)) {
      errors.tokenSymbol =
        "Token symbol must be 2-10 uppercase letters or numbers";
    }

    if (!tokenDescription.trim()) {
      errors.tokenDescription = "Description is required";
    } else if (tokenDescription.length > 1000) {
      errors.tokenDescription = "Description must be less than 1000 characters";
    }

    if (!tokenWebsite.trim()) {
      errors.tokenWebsite = "Website is required";
    } else if (!/^https?:\/\/.+/.test(tokenWebsite)) {
      errors.tokenWebsite =
        "Please enter a valid URL starting with http:// or https://";
    }

    if (!tokenTwitter.trim()) {
      errors.tokenTwitter = "Twitter handle is required";
    } else if (!/^@?[A-Za-z0-9_]{1,15}$/.test(tokenTwitter)) {
      errors.tokenTwitter = "Please enter a valid Twitter handle";
    }

    if (!tokenDiscord.trim()) {
      errors.tokenDiscord = "Discord channel is required";
    } 
    // else if (!/^https?:\/\/discord\/.+/.test(tokenDiscord)) {
    //   errors.tokenDiscord = "Please enter a valid Discord invite link";
    // }

    if (!tokenImage) {
      errors.tokenImage = "Project image is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const showToastMessage = (message: ReactNode, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const formatMarketCap = (mc: number): string => {
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(2)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
    return `$${mc?.toFixed(0) || 0}`;
  };

  const handelBackendSubmit = async (tokenData: any) => {
    const token = localStorage.getItem('auth_token');
    // "5MnF3sQuysmCzBFHTK6HwZzHzhQ444F7EYZy7vrsaFbhxStjA8sRLRkFr4eS3WTT7mmhthGMBeR2hY2i19vGRo8i"

    const solprice = await getSolanaPriceUSD()
    const startPrice = calculateTokenPrice(DEFAULT_CONFIG.startMarketCap, DEFAULT_CONFIG) / solprice
    const endCap = DEFAULT_CONFIG.endMarketCap / solprice
    const startCap = DEFAULT_CONFIG.startMarketCap  / solprice

    const newCoin = {
      address: tokenData.mint,
      name: tokenData.metadata.name,
      ticker: tokenData.metadata.symbol,
      description: tokenData.metadata.description,
      website: tokenWebsite,
      discord: tokenDiscord,
      twitter: tokenTwitter,
      decimals: tokenData.metadata.decimals,
      current_price: startPrice.toFixed(10),
      image_url: tokenData.imageUrl,
      total_supply: tokenData.totalSupply,
      end_marketcap: endCap.toFixed(9),
      start_marketcap: startCap.toFixed(9),
      current_marketcap: startCap.toFixed(9),
    };
    console.log(newCoin);
    await axios.post(
      'http://127.0.0.1:8000/api/coins/',
      newCoin,
      {
        headers: { Authorization: `Token ${token}` }
      }
    );
    // 'https://solana-market-place-backend.onrender.com/api/coins/'
  }

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    // Check wallet connection
    if (!connected || !publicKey) {
      showToastMessage("Please connect your Phantom wallet first", "error");
      try {
        await connect();
      } catch (e) {
        showToastMessage("Failed to connect wallet", "error");
        return;
      }
    }

    try {
      if (!tokenImage || !publicKey || !signTransaction) {
        setLoading({ bool: false, msg: "" });
        return;
      }

      setLoading({ bool: true, msg: "Uploading metadata" });

      let metadataUrl = '';
      let image_url = '';

      const metadataResult = await uploadFile(tokenImage, {
        name: tokenName,
        symbol: tokenSymbol,
        description: tokenDescription,
        website: tokenWebsite,
        twitter: tokenTwitter,
        discord: tokenDiscord
      });

      if (metadataResult){
        ({ metadataUrl, imageUrl: image_url } = metadataResult);
      }

      if (metadataUrl.length === 0) {
        setLoading({ bool: false, msg: "" });
        showToastMessage("Failed to upload metadata", "error");
        return;
      }

      setLoading({ bool: true, msg: "Creating token" });

      // Create token parameters for the bonding curve
      const tokenParams: TokenLaunchParams = {
        name: tokenName,
        symbol: tokenSymbol,
        description: tokenDescription,
        imageUrl: metadataUrl,
        decimals: 6
      };

      const phantomLaunchpad = new SolanaLaunchpad(
        connection,
        firebaseDB,
        DEFAULT_CONFIG
      );

      setLoading({ bool: true, msg: "Creating bonding curve token" });

      const tokenCreationResult = await phantomLaunchpad.createToken(
        publicKey,
        signTransaction,
        tokenParams
      );

      if (tokenCreationResult) {
        const tokenData = await firebaseDB.getToken(
          tokenCreationResult.mint.toString()
        );

        tokenData.tHash = tokenCreationResult.transaction
        tokenData.imageUrl = image_url
        await handelBackendSubmit(tokenData);

        setResult(tokenCreationResult.transaction);
        setCreatedTokenData(tokenData);
        setShowBondingCurveInfo(true);

        showToastMessage(
          <div>
            <p>Token created successfully with bonding curve!</p>
            <Link
              to={`https://explorer.solana.com/tx/${tokenCreationResult.transaction}?cluster=devnet`}
              target="_blank"
              className="underline text-blue-300"
            >
              View on Solana Explorer
            </Link>
          </div>,
          "success"
        );
      } else {
        showToastMessage("Failed to create token", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToastMessage(e.message || "Error creating token", "error");
    } finally {
      setLoading({ bool: false, msg: "" });
    }
  };

  const BondingCurveInfo = ({ tokenData }: { tokenData: any }) => {
    if (!tokenData) return null;

    const currentMarketCap =
      DEFAULT_CONFIG.startMarketCap + tokenData.totalRaised;
    const progress = Math.min(
      100,
      Math.max(
        0,
        ((currentMarketCap - DEFAULT_CONFIG.startMarketCap) /
          (DEFAULT_CONFIG.endMarketCap - DEFAULT_CONFIG.startMarketCap)) *
          100
      )
    );

    return (
      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-600">
        <h3 className="text-xl font-bold text-white mb-4">
          🚀 Token Launched with Bonding Curve!
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-700 p-4 rounded">
            <p className="text-gray-400 text-sm">Token Address</p>
            <p className="text-white font-mono text-sm break-all">
              {tokenData.mint}
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded">
            <p className="text-gray-400 text-sm">Initial Market Cap</p>
            <p className="text-white font-bold">
              {formatMarketCap(currentMarketCap)}
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded">
            <p className="text-gray-400 text-sm">Total Supply</p>
            <p className="text-white font-bold">
              {tokenData.totalSupply.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded">
            <p className="text-gray-400 text-sm">Tokens Available</p>
            <p className="text-white font-bold">
              {tokenData.tokensAvailable.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Bonding Curve Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatMarketCap(DEFAULT_CONFIG.startMarketCap)}</span>
            <span>{formatMarketCap(DEFAULT_CONFIG.endMarketCap)}</span>
          </div>
        </div>

        <div className="bg-blue-900/30 border border-blue-500/30 rounded p-4">
          <h4 className="text-blue-300 font-medium mb-2">📈 How it works:</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>
              • Tokens are available for purchase through the bonding curve
            </li>
            <li>• Price increases as more tokens are bought</li>
            <li>
              • When market cap reaches{" "}
              {formatMarketCap(DEFAULT_CONFIG.endMarketCap)}, liquidity migrates
              to Raydium DEX
            </li>
            <li>• Early buyers get the best prices!</li>
          </ul>
        </div>

        <div className="mt-4 flex space-x-3">
          <Link
            to={`/coin/${tokenData.mint}`}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-center transition-colors"
          >
            View Token Page
          </Link>
          <Link
            to={`/coin/${tokenData.mint}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center transition-colors"
          >
            Start Trading
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="relative sm:min-h-[180vh] xl:min-h-[124vh]">
      <style>{styles}</style>
      <div className="h-64 z-10 crtGradient background-container top-10 left-10">
        <div className="h-40 justify-center">
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-5xl font-bold text-custom-dark-blue mb-4 mt-8 text-center">
              Launch a new Project
            </h1>
            <p className="text-gray-800 max-w-lg mx-auto text-center">
              Build your reputation in the Web3 ecosystem as you bring your
              vision to life on Notty Terminal.
            </p>
          </div>
        </div>
      </div>

      <div className="max-[400px] h-[1200px] mx-auto bg-custom-dark-blue relative flex items-center justify-center">
        <div
          className="flex justify-center items-center absolute mt-10 flex-col border-gray-600 border max-w-[600px] 
                w-full top-[-150px] mx-auto bg-custom-dark-blue z-10 p-4 text-white rounded"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              Project details
            </h1>
            <p className="text-gray-400">
              Provide important details about your project
            </p>

            {/* Wallet Connection Status - Added to original layout */}
            <div className="mt-4 p-3 rounded-lg border border-gray-600 bg-gray-800">
              {connected && publicKey ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm font-medium">
                      ✅ Wallet Connected
                    </p>
                    <p className="text-gray-400 text-xs font-mono">
                      {publicKey.toString().slice(0, 8)}...
                      {publicKey.toString().slice(-8)}
                    </p>
                  </div>
                  <div className="text-green-400">🟢</div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">
                      ⚠️ Wallet Not Connected
                    </p>
                    <p className="text-gray-400 text-xs">
                      Connect your Phantom wallet to continue
                    </p>
                  </div>
                  <button
                    onClick={connect}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>
          </div>

          <form className="flex flex-col justify-center w-full max-w-[500px] mx-auto mb-10 mt=10">
            {/* Bonding Curve Info Panel - Added to original form */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">
                💎 Bonding Curve Features
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  • Starting Market Cap:{" "}
                  {formatMarketCap(DEFAULT_CONFIG.startMarketCap)}
                </li>
                <li>
                  • Target Market Cap:{" "}
                  {formatMarketCap(DEFAULT_CONFIG.endMarketCap)}
                </li>
                <li>
                  • Total Supply: {DEFAULT_CONFIG.totalSupply.toLocaleString()}{" "}
                  tokens
                </li>
                <li>• Automatic Raydium migration when target reached</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium mb-2"
                >
                  Project name
                </label>
                <input
                  type="text"
                  id="projectName"
                  className={`w-full bg-gray-800 border ${
                    validationErrors.tokenName
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background`}
                  placeholder="Enter your project name"
                  onChange={(e) => settTokenName(e.target.value)}
                />
                {validationErrors.tokenName && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenName}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="projectDesc"
                >
                  Project description
                </label>
                <textarea
                  id="projectDesc"
                  className={`w-full h-[200px] bg-gray-800 border ${
                    validationErrors.tokenDescription
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background resize-none`}
                  placeholder="Describe your projects"
                  onChange={(e) => setTokenDescription(e.target.value)}
                />
                {validationErrors.tokenDescription && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenDescription}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="projectSymb"
                >
                  Project symbol
                </label>
                <input
                  type="text"
                  id="projectSymb"
                  className={`w-full bg-gray-800 border ${
                    validationErrors.tokenSymbol
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background`}
                  placeholder="Set token symbol"
                  onChange={(e) =>
                    settTokenSymbol(e.target.value.toUpperCase())
                  }
                />
                {validationErrors.tokenSymbol && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenSymbol}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="projectImage"
                >
                  Project Image
                </label>
                <DragAndDropFileInput
                  singleFile={true}
                  onFileSelect={function (files: File[]): void {
                    setTokenImage(files[0]);
                  }}
                  id={"file"}
                />
                {validationErrors.tokenImage && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenImage}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="webAddress"
                  className="block text-sm font-medium mb-2"
                >
                  Website Address
                </label>
                <input
                  type="url"
                  id="webAddress"
                  className={`w-full bg-gray-800 border ${
                    validationErrors.tokenWebsite
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background`}
                  placeholder="https://your-website.com"
                  onChange={(e) => setTokenWebsite(e.target.value)}
                />
                {validationErrors.tokenWebsite && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenWebsite}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="twithand"
                  className="block text-sm font-medium mb-2"
                >
                  Twitter Handle
                </label>
                <input
                  type="text"
                  id="twithand"
                  className={`w-full bg-gray-800 border ${
                    validationErrors.tokenTwitter
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background`}
                  placeholder="@yourhandle"
                  onChange={(e) => setTokenTwitter(e.target.value)}
                />
                {validationErrors.tokenTwitter && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenTwitter}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="discord"
                  className="block text-sm font-medium mb-2"
                >
                  Discord Channel
                </label>
                <input
                  type="url"
                  id="discord"
                  className={`w-full bg-gray-800 border ${
                    validationErrors.tokenDiscord
                      ? "border-red-500"
                      : "border-gray-700"
                  } rounded px-4 py-2 text-white no-background`}
                  placeholder="https://discord.gg/your-channel"
                  onChange={(e) => setTokenDiscord(e.target.value)}
                />
                {validationErrors.tokenDiscord && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.tokenDiscord}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                type="button"
                className={`flex items-center justify-center ${
                  connected && publicKey
                    ? "bg-custom-light-purple hover:bg-indigo-600 text-white"
                    : "bg-gray-600 text-gray-300 cursor-not-allowed"
                } px-6 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleSubmit}
                disabled={loading.bool || !connected || !publicKey}
              >
                {loading.bool
                  ? loading.msg + "..."
                  : !connected || !publicKey
                  ? "Connect Wallet to Launch"
                  : "Launch Token with Bonding Curve"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            {/* Bonding curve info after creation */}
            {showBondingCurveInfo && createdTokenData && (
              <BondingCurveInfo tokenData={createdTokenData} />
            )}
          </form>
        </div>

        <div className="flex flex-col items-center justify-center overflow-hidden w-full">
          {result && (
            <Link
              to={`https://explorer.solana.com/tx/${result}?cluster=devnet`}
              className="text-green-500 underline"
              target="_blank"
            >
              link to TX hash
            </Link>
          )}
          {error && <p className="text-red-500">{error}</p>}
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

export default CreateCoin;