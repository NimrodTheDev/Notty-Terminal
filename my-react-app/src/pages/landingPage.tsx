import { useWallet } from "@solana/wallet-adapter-react";

import FeaturesSection from "../components/landingPage/features";
import Hero from "../components/landingPage/hero";
import HowItWorks from "../components/landingPage/howItWorks";
import OnboardingCard from "../components/landingPage/onboardingCard";
import { useEffect } from "react";
import { useAxios } from "../hooks/useAxios";

const LandingPage = () => {
	const wallet = useWallet()
	// uploadFile()
	const { loading, request } = useAxios();
	useEffect(() => {
		const connectWallet = async () => {
			if (wallet.connected) {
				await wallet.connect().then(async () => {
					console.log(wallet.publicKey)
					try {
						const res = await request({
							method: 'post',
							url: `/connect_wallet/`,
							data: {
								wallet_address: wallet.publicKey?.toBase58()
							},
							headers: {
								"Content-Type": "application/json",
							}
						});
						localStorage.setItem('auth_token', res.data.token);
						console.log(res.data)
					} catch (err) {
						console.log(err)
					}
				})
			} else {
				wallet.connect()
			}
		}
		connectWallet()
	}, [wallet.connected, request])
	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen bg-custom-dark-blue">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
			</div>
		);
	}
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
