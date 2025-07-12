import { useWallet } from "@solana/wallet-adapter-react";

import FeaturesSection from "../components/landingPage/features";
import Hero from "../components/landingPage/hero";
import HowItWorks from "../components/landingPage/howItWorks";
import OnboardingCard from "../components/landingPage/onboardingCard";
import { useEffect } from "react";
import axios from "axios";

const LandingPage = () => {
	const wallet = useWallet()
	// uploadFile()
	useEffect(() => {
		const connectWallet = async () => {
			if (wallet.connected) {
				await wallet.connect().then(() => {
					console.log(wallet.publicKey)
					axios.post(`https://solana-market-place-backend.onrender.com/api/connect_wallet/`, {
						wallet_address: wallet.publicKey?.toBase58()
					}, {
						headers: {
							"Content-Type": "application/json",
						}
					})
					// we arent saving the authentication
						.then((res) => {
							localStorage.setItem('auth_token', res.data.token);
							console.log(res.data)
						})
						.catch((err) => {
							console.log(err)
						})
				})
			} else {
				wallet.connect()
			}
		}
		connectWallet()
	}, [wallet.connected])
	return (
		<div>
			<Hero />
			{/* moved into hero section */}
			{/* <NFTCollection /> */}
			<FeaturesSection />
			<HowItWorks />
			<OnboardingCard />
		</div >
	);
};

export default LandingPage;
