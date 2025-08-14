import { useState, useEffect } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from "axios";

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

export async function getSolanaPriceUSD() {
    const token = localStorage.getItem('auth_token');
    let price = 150;
    try{
        if (!token){
            throw new TypeError("Missing auth token")
        }
        const response = await axios.get(
            `https://solana-market-place-backend.onrender.com/api/sol-price`,
            {headers: { Authorization: `Token ${token}` }}
        )
        price = parseFloat(response.data.sol_price);
    } catch (error) {
        console.error("Failed to fetch SOL price:", error);
    }
    return price;
}

export function useSolanaPrice(defaultPrice = 150) {
    const [price, setPrice] = useState(defaultPrice);

    // useEffect(() => {
    //     getSolanaPriceUSD().then(setPrice);
    // }, []);

    useEffect(() => {
        let isMounted = true;
        getSolanaPriceUSD().then((fetched) => {
            if (isMounted) setPrice(fetched);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    return price;
}
