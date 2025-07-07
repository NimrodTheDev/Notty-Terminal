 export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="w-full flex flex-col sm:flex-row items-center gap-3 md:gap-4">
      <span className="text-xs md:text-sm text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex w-full sm:w-auto justify-between gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex-1 sm:flex-none px-3 md:px-4 py-1 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex-1 sm:flex-none px-3 md:px-4 py-1 md:py-2 bg-gray-800 hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
