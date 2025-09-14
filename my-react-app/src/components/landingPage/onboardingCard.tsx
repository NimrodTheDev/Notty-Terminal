import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";

export default function OnboardingCard() {
	return (
	  <div className="flex justify-center items-center min-h-screen
					  bg-[radial-gradient(ellipse_at_center,_#1e2135,_#11141F)]">
		<div className="w-full max-w-3xl mx-auto p-12 rounded-lg bg-custom-dark-blue/80 border border-gray-800 flex justify-between">
		  <div className="max-w-md">
			<h2 className="text-3xl font-bold text-white mb-3">
			  Ready to join the future of Web3?
			</h2>
			<p className="text-gray-400 mb-8">
			  Whether you're looking to launch a project, find talent or join a
			  community, we have everything you need.
			</p>
			<WalletMultiButton />
		  </div>
		  <div className="flex items-start">
			<div className="bg-indigo-900 bg-opacity-50 p-6 rounded-full">
			  <Wallet size={48} className="text-indigo-300" />
			</div>
		  </div>
		</div>
	  </div>
	);
  }
  