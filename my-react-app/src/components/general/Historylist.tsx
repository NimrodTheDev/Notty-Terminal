 type HistoryItem = {
  id: string;
  time: string;
  description: string;
  points: string;
};

export default function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-800/50 rounded-lg text-sm md:text-base">
          No activity history found
        </div>
      ) : (
        items.map((item) => (
          <div 
            key={item.id}
            className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-800 p-3 md:p-4 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700 gap-2 md:gap-4"
          >
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-400">{item.time}</p>
              <p className="mt-0 md:mt-1 text-sm md:text-base font-medium line-clamp-2">{item.description}</p>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3">
              <span className="text-green-400 font-medium text-sm md:text-base">{item.points}</span>
              <button className="bg-purple-700 hover:bg-purple-600 text-white text-xs md:text-sm rounded-md px-2 md:px-3 py-1.5 transition-colors">
                View
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
