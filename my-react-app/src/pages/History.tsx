  import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown } from 'lucide-react';
import HistoryList from '../components/general/Historylist'
import Pagination from '../components/general/pagination';

export type HistoryItem = {
  id: string;
  time: string;
  name: string;
  description?: string;
  points: string;
};

function convertDate(input: string) {
  const monthMatch = input.match(/[A-Za-z]+/);
  const yearMatch = input.match(/\d+/);

  const monthName = monthMatch ? monthMatch[0] : 'January';
  const year = yearMatch ? parseInt(yearMatch[0]) : 2025;

  const monthNumber = new Date(`${monthName} 1`).getMonth() + 1;
  return [monthNumber, year]
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('July2025');

  const sampleData = [
    { id: '1', time: "02:03 PM", name: "New Coin Created", points: "+10" },
    { id: '2', time: "02:03 PM", name: "DRC Point new 234", points: "+10" },
    { id: '3', time: "02:03 PM", name: "Token Swap Completed", points: "+15" },
    { id: '4', time: "02:03 PM", name: "Account Verified", points: "+5" },
    { id: '5', time: "02:03 PM", name: "NFT Minted", points: "+20" },
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
      const dateYear = convertDate(selectedMonth)
      const response = await axios.get(
        'https://solana-market-place-backend.onrender.com/api/trader-history',
        // 'http://127.0.0.1:8000/api/trader-history',
        {
          params: { 
            month: dateYear[0],
            year: dateYear[1],
            page: currentPage,
            page_size: 5
          },
          headers: { Authorization: `Token ${token}` } // Bearer
        }
      );
      // GET /trader-history/?year=2025&month=7&page=1, for the queries page size, page, month, year, 
      // and user for diferent users if necessary
      setHistory(response.data.results.map((item: any) => ({
        id: item.id,
        time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        name: item.key || 'Activity recorded',
        points: `+${item.score || '0'}`,
        description: item.description || 'Activity recorded',
      })));
      setTotalPages(Math.ceil(response.data.count / 5));
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
      <div className="flex justify-center items-center h-screen bg-custom-dark-blue">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-custom-dark-blue text-white p-4 md:p-6 min-h-screen">
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
            {/* we need to automatically generate this also selected month should be this month
            or add an all option for it then month becomes like a filter
            or have a returned object for gettings all the months call few times cache when neccassary */}
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
            {/* <button 
              className="w-full md:w-auto bg-[#232842] hover:bg-[#222635CC] text-white font-medium rounded px-10 py-2 
              transition-colors text-sm md:text-base border border-[#FFFFFF1A] hover:border-[#232842CC]"
              onClick={loadHistory}
            >
              See more
            </button> */}
          </div>
        </>
      )}
    </div>
  );
}