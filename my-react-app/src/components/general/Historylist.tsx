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
        <div className="text-center py-8 text-gray-400 bg-gray-800/50 rounded-lg">
          No activity history found
        </div>
      ) : (
        items.map((item) => (
          <div 
            key={item.id}
            className="flex justify-between items-center bg-gray-800 p-4 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700"
          >
            <div>
              <p className="text-sm text-gray-400">{item.time}</p>
              <p className="mt-1 font-medium">{item.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400 font-medium">{item.points}</span>
              <button className="bg-purple-700 hover:bg-purple-600 text-white text-sm rounded-md px-3 py-1.5 transition-colors">
                View
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
