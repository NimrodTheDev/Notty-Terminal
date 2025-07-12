import { createContext, useContext, ReactNode } from 'react';
// import init, { create_token_mint } from 'wasm';
import * as web3 from '@solana/web3.js';
//import * as token from '@solana/spl-token';
// import * as anchor from "@coral-xyz/anchor";
import { Program } from "@project-serum/anchor";
import BN from 'bn.js';
// import { useConnection } from '@solana/wallet-adapter-react';
// import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
// import { Program, Idl } from '@coral-xyz/anchor';
import drc_token_json from "./drc_token.json"
// import { DrcToken } from './drc_token_type';
import { getProvider } from './proveder';
import { useWallet } from '@solana/wallet-adapter-react';



const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface SolanaContextType {
  CreateTokenMint?: (tokenName: string, tokenSymbol: string, tokenUri: string) => Promise<{mintAccount: web3.Keypair, tx: string} | undefined>
  InitTokenVault?: (pricePerToken: number, initialSupply: number, mintAccount: web3.Keypair) => Promise<{
    tx: any;
    vault: web3.PublicKey;
}>
  BuyTokenMint?: (mintAccount: web3.PublicKey, amount: number) => Promise<{
    tx: any;
    buyerTokenAccount: web3.PublicKey;
}>
  SellTokenMint?: (mintAccount: web3.PublicKey, amount: number) => Promise<{
    tx: any;
    sellerTokenAccount: web3.PublicKey;
}>
CreateAndInitToken?: (tokenName: string, tokenSymbol: string, tokenUri: string, pricePerToken: number, initialSupply: number, edit: boolean) => Promise<{
  tx: any;
  mintAccount: web3.Keypair;
}>
}

const SolanaContext = createContext<SolanaContextType>({
});

export const useSolana = () => useContext(SolanaContext);

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider = ({ children }: SolanaProviderProps) => {


  const wallet = useWallet()
  // const { connection } = useConnection();
  const programId = new web3.PublicKey("A7sBBSngzEZTsCPCffHDbeXDJ54uJWkwdEsskmn2YBGo");
  const TOKEN_PROGRAM_ID = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  //@ts-ignore
  const isInstalled = window.solana && window.solana.isPhantom;

  const program = isInstalled ? new Program(drc_token_json as any,
    programId, getProvider(wallet)) : null
  // {connection}



  const CreateTokenMint = async (tokenName: string, tokenSymbol: string, tokenUri: string) => {
    const mintAccount = web3.Keypair.generate();
    const [metadataAddress] = web3.PublicKey.findProgramAddressSync(
      [
        new Uint8Array([109, 101, 116, 97, 100, 97, 116, 97]),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintAccount.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    //@ts-ignore
    let resp = await window.solana.connect().then(async(resp)=>{
      console.log(resp);
      if (program) {
        const transaction = await program.methods.createToken(tokenName = tokenName, tokenSymbol = tokenSymbol, tokenUri = tokenUri).accounts({
          //@ts-ignore
          payer: window.solana.publicKey,
          mintAccount: mintAccount.publicKey,
          metadataAccount: metadataAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY
        })
          //@ts-ignore
          .signers([mintAccount])
          .rpc();

        return transaction
      }
    });
    return {tx:resp, mintAccount};
  }

  const InitTokenVault = async (pricePerToken: number, initialSupply: number, mintAccount: web3.Keypair) => {
    const encoder = new TextEncoder();
  
    const [vaultAccount] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("vault"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    const [tokenVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("token_vault"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    const [solVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("sol_vault")
      ],
      programId
    );
  
    const [authority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("authority"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    const [mintAuthority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("mint_authority"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    //@ts-ignore
    let resp = await window.solana.connect().then(async (resp) => {
      console.log(resp);
      if (program) {
        const transaction = await program.methods.initVault(
          new BN(pricePerToken),
          new BN(initialSupply * 1000000000)
        ).accounts({
          //@ts-ignore
          payer: window.solana.publicKey,
          mint: mintAccount.publicKey,
          vaultAccount: vaultAccount,
          tokenVault: tokenVault,
          solVault: solVault,
          vaultAuthority: authority,
          mintAuthority: mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY
        })
          .rpc();
  
        return transaction;
      }
    });
  
    return { tx: resp, vault: vaultAccount };
  };
  
  const BuyTokenMint = async (mintAccount: web3.PublicKey, amount: number) => {
    const encoder = new TextEncoder();

    const [tokenVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("token_vault"),
        mintAccount.toBuffer()
      ],
      programId
    );

    const [vaultAccount] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("vault"),
        mintAccount.toBuffer()
      ],
      programId
    );

    const [solVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("sol_vault")
      ],
      programId
    );

    const [vaultAuthority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("authority"),
        mintAccount.toBuffer()
      ],
      programId
    );

    // Get the buyer's associated token account
    const [buyerTokenAccount] = web3.PublicKey.findProgramAddressSync(
      [
        //@ts-ignore
        window.solana.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintAccount.toBuffer(),
      ],
      new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );

    //@ts-ignore
    let resp = await window.solana.connect().then(async (resp) => {
      console.log(resp);
      if (program) {
        const transaction = await program.methods.buyToken(
          new BN(amount * 1000000000)
        ).accounts({
          //@ts-ignore
          buyer: window.solana.publicKey,
          mint: mintAccount,
          tokenVault: tokenVault,
          vaultAccount: vaultAccount,
          buyerTokenAccount: buyerTokenAccount,
          solVault: solVault,
          vaultAuthority: vaultAuthority,
          associatedTokenProgram: new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId
        })
          .rpc();

        return transaction;
      }
    });

    return { tx: resp, buyerTokenAccount: buyerTokenAccount };
  };

  const SellTokenMint = async (mintAccount: web3.PublicKey, amount: number) => {
    const encoder = new TextEncoder();

    const [tokenVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("token_vault"),
        mintAccount.toBuffer()
      ],
      programId
    );

    const [vaultAccount] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("vault"),
        mintAccount.toBuffer()
      ],
      programId
    );

    const [solVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("sol_vault")
      ],
      programId
    );

    const [vaultAuthority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("authority"),
        mintAccount.toBuffer()
      ],
      programId
    );

    // Get the seller's associated token account
    const [sellerTokenAccount] = web3.PublicKey.findProgramAddressSync(
      [
        //@ts-ignore
        window.solana.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintAccount.toBuffer(),
      ],
      new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    );

    //@ts-ignore
    let resp = await window.solana.connect().then(async (resp) => {
      console.log(resp);
      if (program) {
        const transaction = await program.methods.sellToken(
          new BN(amount)
        ).accounts({
          //@ts-ignore
          seller: window.solana.publicKey,
          mint: mintAccount,
          tokenVault: tokenVault,
          vaultAccount: vaultAccount,
          sellerTokenAccount: sellerTokenAccount,
          solVault: solVault,
          vaultAuthority: vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId
        })
          .rpc();

        return transaction;
      }
    });

    return { tx: resp, sellerTokenAccount: sellerTokenAccount };
  };

  const CreateAndInitToken = async(tokenName: string, tokenSymbol: string, tokenUri: string, pricePerToken: number, initialSupply: number, edit: boolean)=>{
    const encoder = new TextEncoder();
    const mintAccount = web3.Keypair.generate();
    const [metadataAddress] = web3.PublicKey.findProgramAddressSync(
      [
        new Uint8Array([109, 101, 116, 97, 100, 97, 116, 97]),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintAccount.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [vaultAccount] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("vault"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
    const [tokenVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("token_vault"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    const [solVault] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("sol_vault")
      ],
      programId
    );
  
    const [authority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("authority"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
  
    const [mintAuthority] = web3.PublicKey.findProgramAddressSync(
      [
        encoder.encode("mint_authority"),
        mintAccount.publicKey.toBuffer()
      ],
      programId
    );
    //@ts-ignore
    let resp = await window.solana.connect().then(async(resp)=>{
      console.log(resp);
      if (program) {
        const transaction = await program.methods.createTokenWithVault(
          tokenName = tokenName,
          tokenSymbol = tokenSymbol,
          tokenUri = tokenUri,
          new BN(( edit ? pricePerToken : 0.000000025)),
          new BN(( edit ? initialSupply : 1000000) * 1000000000)
        ).accounts({
          //@ts-ignore
          payer: window.solana.publicKey,
          mintAccount: mintAccount.publicKey,
          vaultAccount: vaultAccount,
          tokenVault: tokenVault,
          solVault: solVault,
          vaultAuthority: authority,
          mintAuthority: mintAuthority,
          metadataAccount: metadataAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY
        })
          //@ts-ignore
          .signers([mintAccount])
          .rpc();

        return transaction
      }
    });
    return {tx:resp, mintAccount};
  }

  return (
    <SolanaContext.Provider
      value={{
        CreateTokenMint,
        InitTokenVault,
        BuyTokenMint,
        SellTokenMint,
        CreateAndInitToken
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
};
