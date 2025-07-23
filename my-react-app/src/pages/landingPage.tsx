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
	const { request } = useAxios();
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
