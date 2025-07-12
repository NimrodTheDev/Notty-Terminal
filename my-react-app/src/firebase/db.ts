import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion
} from "firebase/firestore";
import type { TokenData, TransactionRecord } from "../bonding-interface";
import {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_MEASUREMENT_ID,
  VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET
} from "../utils/environment";

const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
  measurementId: VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export class LaunchpadFirebaseDB {
  private db = db;

  // Collections
  private tokensCollection = collection(this.db, "tokens");
  private transactionsCollection = collection(this.db, "transactions");

  // Token operations
  async saveToken(tokenData: Omit<TokenData, "id">): Promise<string> {
    const docRef = doc(this.tokensCollection, tokenData.mint);
    await setDoc(docRef, {
      ...tokenData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return tokenData.mint;
  }

  async getToken(mint: string): Promise<TokenData | null> {
    const docRef = doc(this.tokensCollection, mint);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as TokenData;
    }
    return null;
  }

  async updateToken(mint: string, updates: Partial<TokenData>): Promise<void> {
    const docRef = doc(this.tokensCollection, mint);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async getAllTokens(): Promise<TokenData[]> {
    const q = query(this.tokensCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as TokenData[];
  }

  async getActiveTokens(): Promise<TokenData[]> {
    const q = query(
      this.tokensCollection,
      where("isComplete", "==", false),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as TokenData[];
  }

  async getTokensByCreator(creator: string): Promise<TokenData[]> {
    const q = query(
      this.tokensCollection,
      where("creator", "==", creator),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as TokenData[];
  }

  // Transaction operations
  async addTransaction(
    transaction: Omit<TransactionRecord, "id">
  ): Promise<string> {
    const docRef = await addDoc(this.transactionsCollection, {
      ...transaction,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  async getTokenTransactions(
    tokenMint: string,
    limitCount: number = 50
  ): Promise<TransactionRecord[]> {
    const q = query(
      this.transactionsCollection,
      where("tokenMint", "==", tokenMint),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as TransactionRecord[];
  }

  async getUserTransactions(
    user: string,
    limitCount: number = 50
  ): Promise<TransactionRecord[]> {
    const q = query(
      this.transactionsCollection,
      where("user", "==", user),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as TransactionRecord[];
  }

  // Real-time subscriptions
  subscribeToTokens(callback: (tokens: TokenData[]) => void): () => void {
    const q = query(this.tokensCollection, orderBy("createdAt", "desc"));

    return onSnapshot(q, (querySnapshot) => {
      const tokens = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as TokenData[];
      callback(tokens);
    });
  }

  subscribeToToken(
    mint: string,
    callback: (token: TokenData | null) => void
  ): () => void {
    const docRef = doc(this.tokensCollection, mint);

    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const token = { id: docSnap.id, ...docSnap.data() } as TokenData;
        callback(token);
      } else {
        callback(null);
      }
    });
  }

  subscribeToTokenTransactions(
    tokenMint: string,
    callback: (transactions: TransactionRecord[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      this.transactionsCollection,
      where("tokenMint", "==", tokenMint),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const transactions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionRecord[];
      callback(transactions);
    });
  }
}
