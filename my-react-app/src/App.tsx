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
								<Route
									path='/'
									element={
										<div>
											<LandingPage />
										</div>
									}
								/>
								<Route path='/coin/:id' element={<CoinPage />} />
								<Route path='*' element={<div>Not found</div>} />
								<Route path='/coin/create' element={
									<PhantomError>
										< CreateCoin />
									</PhantomError>
								} />
								<Route path="/login" element={<Loginconnect />} />
								<Route path='/Wallet' element={<Wallet />} />
								<Route path='/CoinMarket' element={<CoinMarket />} />
								<Route path='/Talentpool' element={<Talentpool/>} />
								<Route path='/AboutDrs' element={<AboutDrs />} />

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
