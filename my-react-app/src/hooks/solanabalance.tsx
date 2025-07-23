import { useState, useEffect } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

export function useSolBalance(connection: Connection) {
    const wallet = useWallet();
    const [balance, setBalance] = useState<number>(0);

    const fetchBalance = async () => {
        if (wallet.connected && wallet.publicKey instanceof PublicKey) {
            try {
                const lamports = await connection.getBalance(wallet.publicKey);
                const sol = lamports / 1e9;
                setBalance(sol);
            } catch (error) {
                console.error("Failed to fetch SOL balance:", error);
                setBalance(0);
            }
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [wallet.connected, wallet.publicKey, connection]);

    return { balance, refetchBalance: fetchBalance };
}

export async function getSolanaPriceUSD() { // 150 for now but we have to use it fro backend for find a better way
    // const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    // const data = await response.json();
    const price = 150;//data.solana.usd;
    return price;
}
