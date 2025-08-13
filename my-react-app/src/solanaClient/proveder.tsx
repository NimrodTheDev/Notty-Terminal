import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import drc_token_json from "./drc_token.json";
import { NottyTerminal } from "./drc_token_type";

const programId = new PublicKey(drc_token_json.address);

export const getProvider = () => {
	const connection = new Connection(
		"https://api.devnet.solana.com",
		"confirmed"
	);

	//@ts-ignore
	if (!window.solana) throw new Error("Solana wallet not found");
	//@ts-ignore
	const wallet = window.solana;
	if (!wallet) throw new Error("Solana wallet not found");

	//   const wallet = window.solana as Wallet
	return new AnchorProvider(connection, wallet, {
		preflightCommitment: "processed",
	});
};

export const getProgram = () => {
	const provider = getProvider();
	return new Program<NottyTerminal>(drc_token_json as any, provider);
};

export { programId };
