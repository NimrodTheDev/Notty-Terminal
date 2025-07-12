import { useEffect, useState } from "react";

import { LaunchpadFirebaseDB } from "../firebase/db";
import { TokenData } from "../bonding-interface";

const firebaseDB = new LaunchpadFirebaseDB();

export function useToken(mintAddress: string) {
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const tokenData = await firebaseDB.getToken(mintAddress);
        setToken(tokenData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [mintAddress]);

  return { token, loading, error };
}

export function useTokensByCreator(creatorAddress: string) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const tokensData = await firebaseDB.getTokensByCreator(creatorAddress);
        setTokens(tokensData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (creatorAddress) {
      fetchTokens();
    }
  }, [creatorAddress]);

  return { tokens, loading, error };
}

export function useAllTokens() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const tokensData = await firebaseDB.getAllTokens();
        setTokens(tokensData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  return { tokens, loading, error };
}
