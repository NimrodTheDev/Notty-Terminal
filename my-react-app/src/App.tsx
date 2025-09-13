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
import { useWallet } from "@solana/wallet-adapter-react";

import "@solana/wallet-adapter-react-ui/styles.css";
import Loginconnect from "./solanaClient/Loginconnect";
import PhantomError from "./components/PhantomError";

// import DashBoardLayout from "./components/DashBoard/DashBoardLayout";
import DashHome from "./components/DashBoard/DashHome";
import ComingSoon from "./components/general/ComingSoon";
import DashBoard from "./pages/DashBoard";
import Profile from "./pages/Profile";
import HistoryPage from "./pages/History";
import { useAxios } from "./hooks/useAxios";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

function App() {
	const wallet = useWallet();
	// uploadFile()
	const { request } = useAxios();
	useEffect(() => {
		const connectWallet = async () => {
			if (wallet.connected) {
				await wallet.connect().then(async () => {
					console.log(wallet.publicKey);
					try {
						const res = await request({
							method: "post",
							url: `/connect_wallet/`,
							data: {
								wallet_address: wallet.publicKey?.toBase58(),
							},
							headers: {
								"Content-Type": "application/json",
							},
						});
						localStorage.setItem("auth_token", res.data.token);
						console.log(res.data);
					} catch (err) {
						console.log(err);
					}
				});
			} else {
				wallet.connect();
			}
		};
		connectWallet();
	}, [wallet.connected, request]);
	return (
		<>
			<Toaster position='top-right' reverseOrder={false} toastOptions={{ duration: 2000 }}/>
			<Router>
				<Routes>
					<Route
						path='/'
						element={
							<>
								<Header />
								<LandingPage />
							</>
						}
					/>
					<Route
						path='/coin/:id'
						element={
							<>
								<Header />
								<CoinPage />
							</>
						}
					/>
					<Route
						path='/login'
						element={
							<>
								<Header />
								<Loginconnect />
							</>
						}
					/>
					<Route
						path='/wallet'
						element={
							<>
								<Header />
								<Wallet />
							</>
						}
					/>
					<Route
						path='/coinmarket'
						element={
							<>
								<Header />
								<CoinMarket />
							</>
						}
					/>
					<Route
						path='/talentpool'
						element={
							<>
								<Header />
								<Talentpool />
							</>
						}
					/>
					<Route
						path='/aboutdrs'
						element={
							<>
								<Header />
								<AboutDrs />
							</>
						}
					/>
					<Route
						path='coin/create'
						element={
							<PhantomError>
								<Header />
								<CreateCoin />
							</PhantomError>
						}
					/>
					{/* We can change it to redirect to the dashboard coin create page */}
					{/* Dashboard routes */}
					<Route path='/dashboard' element={<DashBoard />}>
						<Route index element={<DashHome />} />
						<Route path='home' element={<DashHome />} />
						<Route path='coin/:id' element={<CoinPage />} />
						<Route
							path='coin/create'
							element={
								<PhantomError>
									<CreateCoin />
								</PhantomError>
							}
						/>
						<Route path='wallet' element={<Wallet />} />
						<Route path='coinmarket' element={<CoinMarket />} />
						<Route path='ownerCard' element={<ComingSoon />} />
						<Route path='aboutdrs' element={<AboutDrs />} />
						<Route path='history' element={<HistoryPage />} />
						<Route path='chatRooms' element={<ComingSoon />} />
						<Route path='profile/:address' element={<Profile />} />
						<Route path='settings' element={<ComingSoon />} />
						<Route path='help' element={<ComingSoon />} />
					</Route>

					<Route path='*' element={<div>Not found</div>} />
				</Routes>
				<NottyTerminalFooter />
			</Router>
		</>
	);
}

export default App;
