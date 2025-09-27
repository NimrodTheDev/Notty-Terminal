import { useState, useEffect, } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSolanaPrice } from "../../hooks/solanabalance";

type CoinItem = {
	amount_held: string;
	coin: string;
	coin_name: string;
	coin_ticker: string;
	current_price: number;
	user: string;
	value: number;
	current_marketcap: number;
	coin_address: string;
};

type MintedCoin = {
	address: string;
	name: string;
	ticker: string;
	current_marketcap: number;
};

type UserInfo = {
	devscore: number;
	tradescore: number;
};

function shortenAddress(address: string) {
	if (!address || address.length < 10) return address;
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const DashHome = () => {
	const [coins, setCoins] = useState<CoinItem[]>([]);
	const [portfolioValue, setPortfolioValue] = useState<number>(0);
	const [mintedCoins, setMintedCoins] = useState<MintedCoin[]>([]);
	const [activeTab, setActiveTab] = useState('mintedCoins');
	const [createdCoins, setCreatedCoins] = useState<number>(0);
	const wallet = useWallet();
	const { connection } = useConnection();
	const [balance, setBalance] = useState<number>(0);
	const [userInfo, setUserInfo] = useState<UserInfo>({
		tradescore: 0,
		devscore: 0,
	});
	const [wAddress, setWAddress] = useState<string>("emptyaddress");
	const [loading, setLoading] = useState<boolean>(true);
	const solPrice = useSolanaPrice();

	// for fetching the wallet amount
	useEffect(() => {
		const fetchBalance = async () => {
			console.log(wallet.connected);
			if (wallet.connected) {
				const pubkey = wallet.publicKey;
				if (pubkey instanceof PublicKey) {
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
				const token = localStorage.getItem("auth_token");
				const response = await axios.get(
					`https://solana-market-place-backend.onrender.com/api/dashboard`,
					{
						headers: { Authorization: `Token ${token}` },
					}
				);

				const { user, holdings, created_coins: coins, net_worth, created_coins } = response.data;
				setPortfolioValue(net_worth);
				setCreatedCoins(coins.length);
				setMintedCoins(created_coins);
				setCoins(holdings);
				setUserInfo(user);
			} catch (err: any) {
				console.log(err);
			} finally {
				setLoading(false);
			}
		};
		fetchAllCoins();
	}, []);

	if (loading) {
		return (
			<div className='flex justify-center items-center h-screen bg-custom-dark-blue'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500'></div>
			</div>
		);
	}

	return (
		<div className='min-h-screen relative bg-custom-dark-blue text-white p-6'>
			{/* Header */}
			<div className='flex items-center justify-between mb-8'>
				<div className='flex items-center space-x-3'>
					<div className='w-10 h-10 bg-[#4D427B] rounded-full flex items-center justify-center'>
						<span className='text-white font-bold text-sm'>SD</span>
					</div>
					<div>
						<h1 className='text-xl font-bold'>Dashboard</h1>
						<p className='text-gray-400 text-sm'>{shortenAddress(wAddress)}</p>
						<div className='flex space-x-2'>
							<h2 className='text-l text-[#CCC1FA] font-bold'>
								Dev score: {userInfo?.devscore}
							</h2>
							<h2 className='text-l text-[#CCC1FA] font-bold'>
								Trader score: {userInfo?.tradescore}
							</h2>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			<div className='grid grid-cols-1 gap-6 mb-8'>
				<div className='flex gap-5'>
					{/* SOL Balance */}
					<div className='bg-custom-nav-purple flex-1 rounded-xl p-4'>
						<div className='text-gray-400 text-sm mb-2'>SOL Balance</div>
						<div className='text-3xl font-bold'>{balance.toFixed(4)} SOL</div>
					</div>

					{/* Portfolio Value */}
					<div className='bg-custom-nav-purple rounded-xl flex-1 p-4'>
						<div className='text-gray-400 text-sm mb-2'>Portfolio Value</div>
						<div className='text-3xl font-bold'>
							{portfolioValue.toLocaleString()} SOL
						</div>
					</div>

				
				</div>

					{/* Coins Created */}
					<div className='bg-custom-nav-purple rounded-xl flex-1 p-4 flex items-center justify-between'>
						<div>
							<div className='text-gray-400 text-sm mb-2'>Coins Created</div>
							<div className='text-3xl font-bold'>{createdCoins}</div>
						</div>
						<button className='bg-[#232842] hover:bg-[#222635CC] rounded p-2 transition-colors px-4 py-2 border border-[#FFFFFF1A]'>
							<Link to='/dashboard/coin/create' className='text-sm'>
								<span className='flex text-sm gap-2'>
									<Plus className='w-5 h-5' /> Create New
								</span>
							</Link>
						</button>
					</div>
			</div>

			{/* Tab Navigation */}
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
									{mintedCoins.length}
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
									{coins.length}
								</span>
								Held Coins
								{activeTab === 'heldCoins' && (
									<span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[#7E6DC8]'></span>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			<h2 className='text-xl font-bold mb-6'>Your Coins</h2>

			{/* Held Coins Tab Content */}
			{activeTab === 'heldCoins' && (
				<div className='space-y-4'>
					{coins.map((coin) => (
						<Link 
							to={`/coin/${coin.coin_address}`}
							key={coin.coin_address}
							className='bg-custom-nav-purple rounded-md p-6 flex items-center justify-between hover:bg-gray-750 transition-colors '
						>
							<div className='flex items-center space-x-4'>
								<div className='w-12 h-12 bg-[#4D427B] rounded-full flex items-center justify-center'>
									<span className='text-white font-bold'>
										{coin.coin_ticker}
									</span>
								</div>
								<div>
									<h3 className='font-bold text-lg'>{coin.coin_name}</h3>
									<p className='text-gray-400 text-sm'>
										{Number(coin.amount_held).toLocaleString()}{" "}
										{coin.coin_ticker.toLowerCase()}
									</p>
								</div>
							</div>
							<div className='text-right'>
								<div className='text-gray-400 text-xs mb-1'>
									{coin.coin_ticker}
								</div>
								<div className='text-white font-semibold'>
									${(coin.value * solPrice).toLocaleString()} (
									{coin.value.toLocaleString()} SOL)
								</div>
								<div className='flex space-x-1 justify-end items-center'>
									<div className='text-white font-semibold'>
										${(coin.current_marketcap * solPrice).toLocaleString()} (
										{coin.current_marketcap.toLocaleString()} SOL)
									</div>
									<div className='text-green-400 text-sm'>+1.90</div>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* Minted Coins Tab Content */}
			{activeTab === 'mintedCoins' && (
				<div className='space-y-2 sm:space-y-4'>
					<div className='overflow-x-auto'>
						<ul className='space-y-1 sm:space-y-0'>
							{mintedCoins.map((coinvalue, index) => (
								<Link
									to={`/coin/${coinvalue.address}`}
									key={index}
									className='no-underline block'
								>
									<li className='py-3 sm:py-4 flex hover:bg-[#181b29] transition-colors p-2 sm:p-4 rounded-md justify-between items-center'>
										<div className='flex items-center min-w-0 flex-1'>
											<div className='h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#4d427b] flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'></div>
											<div className='min-w-0'>
												<p className='font-medium text-sm sm:text-base truncate'>
													{coinvalue.name}
												</p>
												<p className='text-xs text-gray-500'>
													Market Cap
												</p>
											</div>
										</div>
										<div className='flex items-center justify-center space-y-1 flex-col text-right flex-shrink-0 ml-2'>
											<p className='text-xs text-gray-500'>
												{coinvalue.ticker}
											</p>
											<p className='text-xs text-gray-500'>
												$ {coinvalue.current_marketcap}
											</p>
										</div>
									</li>
								</Link>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
};

export default DashHome;