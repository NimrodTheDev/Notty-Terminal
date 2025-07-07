 import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown } from 'lucide-react';
import HistoryList from '../components/general/Historylist'
import Pagination from '../components/general/pagination';

export type HistoryItem = {
  id: string;
  time: string;
  description: string;
  points: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('July2025');

  const sampleData = [
    { id: '1', time: "02:03 PM", description: "New Coin Created", points: "+10" },
    { id: '2', time: "02:03 PM", description: "DRC Point new 234", points: "+10" },
    { id: '3', time: "02:03 PM", description: "Token Swap Completed", points: "+15" },
    { id: '4', time: "02:03 PM", description: "Account Verified", points: "+5" },
    { id: '5', time: "02:03 PM", description: "NFT Minted", points: "+20" },
  ];

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setHistory(sampleData);
        setTotalPages(1);
        return;
      }

      const response = await axios.get(
        'https://solana-market-place-backend.onrender.com/api/trader-history',
        {
          params: { 
            month: selectedMonth,
            page: currentPage,
            limit: 5
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setHistory(response.data.items.map((item: any) => ({
        id: item.id,
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: item.eventDescription || 'Activity recorded',
        points: `+${item.points || '0'}`
      })));

      setTotalPages(Math.ceil(response.data.total / 5));
    } catch (err) {
      setHistory(sampleData);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentPage, selectedMonth]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-4 md:p-6 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3 md:gap-0">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold">NOTTY TERMINAL</h1>
          <h2 className="text-lg md:text-xl text-gray-300">History</h2>
        </div>
        
        {/* Month Selector */}
        <div className="relative w-full md:w-48">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm md:text-base"
          >
            <option value="July2025">July 2025</option>
            <option value="June2025">June 2025</option>
            <option value="May2025">May 2025</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
        </div>
      </div>

      {/* Main Content */}
      {error ? (
        <div className="bg-red-900/50 text-red-300 p-4 rounded-md mb-4 text-sm md:text-base">
          {error.includes('login') ? (
            <span>Please <a href="/login" className="text-blue-400 hover:underline">login</a> to view history</span>
          ) : (
            error
          )}
        </div>
      ) : (
        <>
          <HistoryList items={history} />
          
          {/* Pagination Controls */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
            <button 
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md px-6 py-2 transition-colors text-sm md:text-base"
              onClick={loadHistory}
            >
              See more
            </button>
          </div>
        </>
      )}
    </div>
  );
}
