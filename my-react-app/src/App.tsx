import NottyTerminalFooter from "./components/landingPage/footer";
import Header from "./components/landingPage/header";
import CoinPage from "./pages/coinPage";
import LandingPage from "./pages/landingPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateCoin from "./pages/CreateCoin";
import AboutDrs from "./pages/AboutDrs";
import CoinMarket from "./pages/CoinMarket";
import Talentpool from "./pages/Talentpool";
import Wallet from "./pages/Wallet";
//import OnChainNews from "./pages/OnChainNews";
import {
	ConnectionProvider,
	// useWallet,
	WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";
import Loginconnect from "./solanaClient/Loginconnect";
import { SolanaProvider } from "./solanaClient";
import PhantomError from "./components/PhantomError";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
// import DashBoardLayout from "./components/DashBoard/DashBoardLayout";
import DashHome from "./components/DashBoard/DashHome";
import ComingSoon from "./components/general/ComingSoon";
import DashBoard from "./pages/DashBoard";
import Profile from "./pages/Profile";


function App() {
	const endpoint = clusterApiUrl("devnet");
	const wallets = [
		new PhantomWalletAdapter(),
		new SolflareWalletAdapter(),
		new BackpackWalletAdapter(),
		new WalletConnectWalletAdapter({
			network: WalletAdapterNetwork.Devnet,
			options: {
				relayUrl: "wss://relay.walletconnect.com",
				projectId: "YOUR_PROJECT_ID", // Get this from WalletConnect
				metadata: {
					name: "Your App Name",
					description: "Your App Description",
					url: "https://your-app-url.com",
					icons: ["https://your-app-url.com/icon.png"]
				}
			}
		})
	];

	return (
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider wallets={wallets} localStorageKey="key" autoConnect={false}>
				<SolanaProvider>
					<WalletModalProvider>
						<Router>
							<Header />
							<Routes>
								<Route path="/" element={<LandingPage />} />
								<Route path="/coin/:id" element={<CoinPage />} />
								<Route path="/login" element={<Loginconnect />} />
								<Route path="/wallet" element={<Wallet />} />
								<Route path="/coinmarket" element={<CoinMarket />} />
								<Route path="/talentpool" element={<Talentpool />} />
								<Route path="/aboutdrs" element={<AboutDrs />} />
<<<<<<< HEAD

=======
								<Route path="coin/create" element={
										<PhantomError>
											<CreateCoin />
										</PhantomError>
									} />
>>>>>>> 6ba289d (Smart contract)
								{/* Dashboard routes */}
								<Route path="/dashboard" element={<DashBoard />}>
									<Route index element={<DashHome />} />
									<Route path="home" element={<DashHome />} />
									<Route path="coin/:id" element={<CoinPage />} />
									<Route path="coin/create" element={
										<PhantomError>
											<CreateCoin />
										</PhantomError>
									} />
									<Route path="wallet" element={<Wallet />} />
									<Route path="coinmarket" element={<CoinMarket />} />
									<Route path="ownerCard" element={<ComingSoon />} />
									<Route path="aboutdrs" element={<AboutDrs />} />
									<Route path="history" element={<ComingSoon />} />
									<Route path="chatRooms" element={<ComingSoon />} />
									<Route path="profile" element={<Profile />} />
									<Route path="settings" element={<ComingSoon />} />

								</Route>

								<Route path="*" element={<div>Not found</div>} />
							</Routes>
							<NottyTerminalFooter />
						</Router>
					</WalletModalProvider>
				</SolanaProvider>
			</WalletProvider>
		</ConnectionProvider>
	);
}

export default App;
