const Loader = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-transperant">
      <div className="relative w-24 h-24">
        {/* Orbit container */}
        <div className="absolute inset-0 animate-spin-slow">
          {/* Dot 1 */}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 animate-pulse-dot animation-delay-0">
            <div className="w-5 h-5 bg-purple-600 rounded-full"></div>
          </div>
          {/* Dot 2 */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 animate-pulse-dot animation-delay-200">
            <div className="w-5 h-5 bg-purple-400 rounded-full"></div>
          </div>
          {/* Dot 3 */}
          <div className="absolute bottom-1/2 right-0 transform translate-y-1/2 animate-pulse-dot animation-delay-400">
            <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
