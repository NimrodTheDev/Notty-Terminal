import { useState } from 'react';
// import { ChevronDown, ChevronUp } from 'lucide-react';

type HistoryItem = {
  id: string;
  time: string;
  name: string;
  description?: string;
  points: string;
};

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function HistoryList({ items }: { items: HistoryItem[] }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-800/50 rounded-lg text-sm md:text-base">
          No activity found
        </div>
      ) : (
        items.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          const hasDescription = item.description && item.description.trim().length > 0;
          
          return (
            <div 
              key={item.id}
              className="bg-custom-nav-purple rounded-lg hover:bg-gray-700/50 transition-colors border border-[#232842]"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-center p-3 md:p-4 gap-2 md:gap-4">
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-gray-400">{item.time}</p>
                  <p className="mt-0 md:mt-1 text-sm md:text-base font-medium line-clamp-2">{toTitleCase(item.name)}</p>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3">
                  <span className="text-green-400 font-medium text-sm md:text-base">{item.points}</span>
                  <div className="flex gap-2">
                    {hasDescription && (
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="bg-[#232842] hover:bg-[#222635CC] text-white text-xs md:text-sm rounded-md px-2
                         md:px-3 py-1.5 transition-colors flex items-center gap-1 border border-[#FFFFFF1A] hover:border-[#232842CC]"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {/* {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} */}
                        {/* if you want to add it you can */}
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {hasDescription && isExpanded && (
                <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
