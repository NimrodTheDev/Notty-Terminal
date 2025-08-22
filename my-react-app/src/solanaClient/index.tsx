import { createContext, useContext, ReactNode, useState } from "react";
import * as web3 from "@solana/web3.js";
import BN from "bn.js";
import { getProgram } from "./proveder";
import { useWallet } from "@solana/wallet-adapter-react";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

import { Buffer } from "buffer";
import toast from "react-hot-toast";

// make Buffer available globally
window.Buffer = Buffer;
interface SolanaContextType {
	CreateTokenMint?: (
		tokenName: string,
		tokenSymbol: string,
		tokenUri: string
	) => Promise<{ mintAccount: web3.Keypair; tx: string } | undefined>;
	BuyTokenMint?: (
		mintAccount: web3.PublicKey,
		amount: number
	) => Promise<{
		tx: any;
		buyerTokenAccount: web3.PublicKey;
	}>;
	SellTokenMint?: (
		mintAccount: web3.PublicKey,
		amount: number
	) => Promise<{
		tx: string;
		buyerTokenAccount: web3.PublicKey;
	}>;
	loading?: boolean;
}

const SolanaContext = createContext<SolanaContextType>({});

export const useSolana = () => useContext(SolanaContext);

interface SolanaProviderProps {
	children: ReactNode;
}

export const SolanaProvider = ({ children }: SolanaProviderProps) => {
	const [loading, setLoading] = useState(false);
	const TOKEN_PROGRAM_ID = new web3.PublicKey(
		"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
	);

	const connection = new web3.Connection(
		"https://api.devnet.solana.com",
		"confirmed"
	);

	const wallet = useWallet();
	const program = getProgram();

	const CreateTokenMint = async (
		tokenName: string,
		tokenSymbol: string,
		tokenUri: string
	) => {
		setLoading(true);
		const mintAccount = web3.Keypair.generate();
		let tx = "";
		try {
			tx = await program.methods
				.createToken({
					name: tokenName,
					tokenSymbol: tokenSymbol,
					tokenUri: tokenUri,
					targetSol: new BN(460_000_000_000), // 460 SOL (matches your metrics)
					startMcap: new BN(25_000_000_000), // 25 SOL (matches your metrics)
					totalSupply: new BN(1_000_000_000), // 1B tokens (matches your metrics)
				})
				.signers([mintAccount])
				.accounts({
					creator: wallet.publicKey?.toBase58(),
					creatorMint: mintAccount.publicKey,
					tokenProgram: TOKEN_PROGRAM_ID,
				})
				.rpc();
			setLoading(false);
			toast.success("Token created successfully");
			console.log("Your transaction signature", tx);
		} catch (e) {
			setLoading(false);
			toast.error("Error occurred during create");
		} finally {
			setLoading(false);
		}
		return { tx, mintAccount };
	};

	const BuyTokenMint = async (mintAccount: web3.PublicKey, amount: number) => {
		setLoading(true);
		let [token_state, _] = web3.PublicKey.findProgramAddressSync(
			[Buffer.from("token_state"), mintAccount.toBytes()],
			program.programId
		);
		let token_vault = await getOrCreateAssociatedTokenAccount(
			connection,
			//@ts-ignore
			wallet,
			mintAccount,
			token_state,
			true
		);
		let tx = "";
		try {
			tx = await program.methods
				.purchaseToken({
					amount: new BN(amount),
					minAmountOut: new BN(0),
				})
				.accounts({
					user: wallet.publicKey?.toBase58(),
					creatorMint: mintAccount.toBase58(),
					tokenProgram: TOKEN_PROGRAM_ID,
					tokenVault: token_vault.address,
				})
				.rpc();
			setLoading(false);
			toast.success("Token purchased successfully");
		} catch (error) {
			setLoading(false);
			toast.error("Token purchased failed");
		} finally {
			setLoading(false);
		}
		return { tx, buyerTokenAccount: mintAccount };
	};

	const SellTokenMint = async (mintAccount: web3.PublicKey, amount: number) => {
		setLoading(true);
		let [token_state, _] = web3.PublicKey.findProgramAddressSync(
			[Buffer.from("token_state"), mintAccount.toBytes()],
			program.programId
		);
		let token_vault = await getOrCreateAssociatedTokenAccount(
			connection,
			//@ts-ignore
			wallet,
			mintAccount,
			token_state,
			true
		);
		let tx = "";
		try {
			tx = await program.methods
				.sellToken({
					amount: new BN(amount),
					minProceeds: new BN(0),
				})
				.accounts({
					user: wallet.publicKey?.toBase58(),
					creatorMint: mintAccount.toBase58(),
					tokenProgram: TOKEN_PROGRAM_ID,
					tokenVault: token_vault.address,
				})
				.rpc();
			setLoading(false);
			toast.success("Token sold successfully");
		} catch (error) {
			toast.success("Token sold failed");
			setLoading(false);
		} finally {
			setLoading(false);
		}
		return { tx, buyerTokenAccount: mintAccount };
	};

	// const SellTokenMint = async (mintAccount: web3.PublicKey, amount: number) => {
	// 	const encoder = new TextEncoder();

	// 	const [tokenVault] = web3.PublicKey.findProgramAddressSync(
	// 		[encoder.encode("token_vault"), mintAccount.toBuffer()],
	// 		programId
	// 	);

	// 	const [vaultAccount] = web3.PublicKey.findProgramAddressSync(
	// 		[encoder.encode("vault"), mintAccount.toBuffer()],
	// 		programId
	// 	);

	// 	const [solVault] = web3.PublicKey.findProgramAddressSync(
	// 		[encoder.encode("sol_vault")],
	// 		programId
	// 	);

	// 	const [vaultAuthority] = web3.PublicKey.findProgramAddressSync(
	// 		[encoder.encode("authority"), mintAccount.toBuffer()],
	// 		programId
	// 	);

	// 	// Get the seller's associated token account
	// 	const [sellerTokenAccount] = web3.PublicKey.findProgramAddressSync(
	// 		[
	// 			//@ts-ignore
	// 			window.solana.publicKey.toBuffer(),
	// 			TOKEN_PROGRAM_ID.toBuffer(),
	// 			mintAccount.toBuffer(),
	// 		],
	// 		new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
	// 	);

	// 	//@ts-ignore
	// 	let resp = await window.solana.connect().then(async (resp) => {
	// 		console.log(resp);
	// 		if (program) {
	// 			const transaction = await program.methods
	// 				.sellToken(new BN(amount))
	// 				.accounts({
	// 					//@ts-ignore
	// 					seller: window.solana.publicKey,
	// 					mint: mintAccount,
	// 					tokenVault: tokenVault,
	// 					vaultAccount: vaultAccount,
	// 					sellerTokenAccount: sellerTokenAccount,
	// 					solVault: solVault,
	// 					vaultAuthority: vaultAuthority,
	// 					tokenProgram: TOKEN_PROGRAM_ID,
	// 					systemProgram: web3.SystemProgram.programId,
	// 				})
	// 				.rpc();

	// 			return transaction;
	// 		}
	// 	});

	// 	return { tx: resp, sellerTokenAccount: sellerTokenAccount };
	// };

	return (
		<SolanaContext.Provider
			value={{
				loading,
				CreateTokenMint,
				BuyTokenMint,
				SellTokenMint,
			}}
		>
			{children}
		</SolanaContext.Provider>
	);
};
