import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Buffer } from "buffer";
import { StrictMode } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { SolanaProvider } from "./solanaClient";
import {
	ConnectionProvider,
	// useWallet,
	WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
window.Buffer = Buffer;

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
				icons: ["https://your-app-url.com/icon.png"],
			},
		},
	}),
];
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ConnectionProvider endpoint={endpoint}>
			<WalletProvider
				wallets={wallets}
				localStorageKey='key'
				autoConnect={false}
			>
				<SolanaProvider>
					<WalletModalProvider>
						<App />
					</WalletModalProvider>
				</SolanaProvider>
			</WalletProvider>
		</ConnectionProvider>
	</StrictMode>
);
