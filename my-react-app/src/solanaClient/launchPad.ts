import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  createMintToInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  transfer
} from "@solana/spl-token";
import {
  BondingCurveConfig,
  BondingCurveState,
  TokenData,
  TokenLaunchParams,
  TransactionRecord
} from "../bonding-interface";
import {
  calculateSolForTokens,
  calculateTokenPrice,
  calculateTokensForSol
} from "../utils/calculationHelpers";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import { DEFAULT_CONFIG } from "../utils/bondingConfig";
import { LaunchpadFirebaseDB } from "../firebase/db";

export class SolanaLaunchpad {
  constructor(
    private connection: Connection,
    private firebaseDB: LaunchpadFirebaseDB,
    private config: BondingCurveConfig = DEFAULT_CONFIG
  ) {}

  async createToken(
    creatorPublicKey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    tokenParams: TokenLaunchParams
  ): Promise<{ mint: PublicKey; transaction: string }> {
    try {
      // Generate new mint address
      const mintKeypair = new Keypair();
      const mint = mintKeypair.publicKey;

      // Get rent for mint account
      const lamports = await getMinimumBalanceForRentExemptMint(
        this.connection
      );

      // Create transaction
      const transaction = new Transaction();

      // Add create account instruction
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: creatorPublicKey,
          newAccountPubkey: mint,
          space: 82, // MINT_SIZE
          lamports,
          programId: TOKEN_PROGRAM_ID
        })
      );

      // Add initialize mint instruction
      transaction.add(
        createInitializeMintInstruction(
          mint,
          tokenParams.decimals,
          creatorPublicKey,
          creatorPublicKey
        )
      );

      // Get creator token account address
      const creatorTokenAccount = await getAssociatedTokenAddress(
        mint,
        creatorPublicKey
      );

      // Add create token account instruction
      transaction.add(
        createAssociatedTokenAccountInstruction(
          creatorPublicKey,
          creatorTokenAccount,
          creatorPublicKey,
          mint
        )
      );

      // Add mint tokens instruction
      transaction.add(
        createMintToInstruction(
          mint,
          creatorTokenAccount,
          creatorPublicKey,
          this.config.totalSupply * Math.pow(10, tokenParams.decimals)
        )
      );

      // Sign and send transaction
      transaction.feePayer = creatorPublicKey;
      transaction.recentBlockhash = (
        await this.connection.getRecentBlockhash()
      ).blockhash;
      const signedTx = await signTransaction(transaction);
      signedTx.partialSign(mintKeypair); // Sign with mint keypair
      const txSignature = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Save to Firebase
      const tokenData: Omit<TokenData, "id"> = {
        mint: mint.toString(),
        creator: creatorPublicKey.toString(),
        totalSupply: this.config.totalSupply,
        totalRaised: 0,
        tokensAvailable: this.config.totalSupply,
        isComplete: false,
        createdAt: null,
        updatedAt: null,
        metadata: tokenParams
      };

      await this.firebaseDB.saveToken(tokenData);

      return { mint, transaction: txSignature };
    } catch (error) {
      console.error("Error creating token:", error);
      throw error;
    }
  }

  async buyTokens(
    buyerPublicKey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    mint: PublicKey,
    solAmount: number
  ): Promise<{ transaction: string; tokensReceived: number }> {
    const tokenData = await this.firebaseDB.getToken(mint.toString());
    if (!tokenData) throw new Error("Token not found");
    if (tokenData.isComplete) throw new Error("Bonding curve is complete");

    const currentMarketCap = this.config.startMarketCap + tokenData.totalRaised;
    const tokensToReceive = calculateTokensForSol(
      solAmount,
      currentMarketCap,
      this.config
    );

    if (tokensToReceive > tokenData.tokensAvailable) {
      throw new Error("Not enough tokens available");
    }

    try {
      const transaction = new Transaction();
      const creatorPublicKey = new PublicKey(tokenData.creator);

      // Get token accounts
      const buyerTokenAccount = await getAssociatedTokenAddress(
        mint,
        buyerPublicKey
      );
      const creatorTokenAccount = await getAssociatedTokenAddress(
        mint,
        creatorPublicKey
      );

      // Add SOL transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyerPublicKey,
          toPubkey: creatorPublicKey,
          lamports: solAmount * LAMPORTS_PER_SOL
        })
      );

      // Add token transfer instruction
      transaction.add(
        createTransferInstruction(
          creatorTokenAccount,
          buyerTokenAccount,
          creatorPublicKey,
          tokensToReceive * Math.pow(10, 6)
        )
      );

      // Sign and send transaction
      transaction.feePayer = buyerPublicKey;
      transaction.recentBlockhash = (
        await this.connection.getRecentBlockhash()
      ).blockhash;
      const signedTx = await signTransaction(transaction);
      const txSignature = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Update Firebase
      const updates = {
        totalRaised: tokenData.totalRaised + solAmount * this.config.solPrice,
        tokensAvailable: tokenData.tokensAvailable - tokensToReceive,
        isComplete: tokenData.tokensAvailable - tokensToReceive <= 0
      };
      await this.firebaseDB.updateToken(mint.toString(), updates);

      // Add transaction record
      const transactionRecord: Omit<TransactionRecord, "id"> = {
        tokenMint: mint.toString(),
        type: "buy",
        amount: tokensToReceive,
        price: calculateTokenPrice(currentMarketCap, this.config),
        solAmount: solAmount,
        timestamp: null,
        user: buyerPublicKey.toString(),
        txSignature
      };
      await this.firebaseDB.addTransaction(transactionRecord);

      return { transaction: txSignature, tokensReceived: tokensToReceive };
    } catch (error) {
      console.error("Error buying tokens:", error);
      throw error;
    }
  }

  async sellTokens(
    sellerPublicKey: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    mint: PublicKey,
    tokenAmount: number
  ): Promise<{ transaction: string; solReceived: number }> {
    const tokenData = await this.firebaseDB.getToken(mint.toString());
    if (!tokenData) throw new Error("Token not found");
    if (tokenData.isComplete) throw new Error("Bonding curve is complete");

    const currentMarketCap = this.config.startMarketCap + tokenData.totalRaised;
    const solToReceive = calculateSolForTokens(
      tokenAmount,
      currentMarketCap,
      this.config
    );

    try {
      const transaction = new Transaction();
      const creatorPublicKey = new PublicKey(tokenData.creator);

      // Get token accounts
      const sellerTokenAccount = await getAssociatedTokenAddress(
        mint,
        sellerPublicKey
      );
      const creatorTokenAccount = await getAssociatedTokenAddress(
        mint,
        creatorPublicKey
      );

      // Add token transfer instruction
      transaction.add(
        createTransferInstruction(
          sellerTokenAccount,
          creatorTokenAccount,
          sellerPublicKey,
          tokenAmount * Math.pow(10, 6)
        )
      );

      // Sign and send transaction
      transaction.feePayer = sellerPublicKey;
      transaction.recentBlockhash = (
        await this.connection.getRecentBlockhash()
      ).blockhash;
      const signedTx = await signTransaction(transaction);
      const txSignature = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Update Firebase
      await this.firebaseDB.updateToken(mint.toString(), {
        totalRaised:
          tokenData.totalRaised - solToReceive * this.config.solPrice,
        tokensAvailable: tokenData.tokensAvailable + tokenAmount
      });

      // Add transaction record
      const transactionRecord: Omit<TransactionRecord, "id"> = {
        tokenMint: mint.toString(),
        type: "sell",
        amount: tokenAmount,
        price: calculateTokenPrice(currentMarketCap, this.config),
        solAmount: solToReceive,
        timestamp: null,
        user: sellerPublicKey.toString(),
        txSignature
      };
      await this.firebaseDB.addTransaction(transactionRecord);

      return { transaction: txSignature, solReceived: solToReceive };
    } catch (error) {
      console.error("Error selling tokens:", error);
      throw error;
    }
  }

  async getBondingCurveState(mint: PublicKey): Promise<BondingCurveState> {
    const tokenData = await this.firebaseDB.getToken(mint.toString());
    if (!tokenData) {
      throw new Error("Token not found");
    }

    const currentMarketCap = this.config.startMarketCap + tokenData.totalRaised;
    const currentPrice = calculateTokenPrice(currentMarketCap, this.config);

    return {
      currentMarketCap,
      currentPrice,
      totalRaised: tokenData.totalRaised,
      tokensRemaining: tokenData.tokensAvailable,
      isComplete: tokenData.isComplete
    };
  }

  // Utility methods
  calculatePrice(currentMarketCap: number): number {
    return calculateTokenPrice(currentMarketCap, this.config);
  }

  calculateTokensForSol(solAmount: number, currentMarketCap: number): number {
    return calculateTokensForSol(solAmount, currentMarketCap, this.config);
  }

  calculateSolForTokens(tokenAmount: number, currentMarketCap: number): number {
    return calculateSolForTokens(tokenAmount, currentMarketCap, this.config);
  }
}
