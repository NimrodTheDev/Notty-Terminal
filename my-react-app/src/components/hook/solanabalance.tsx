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
