const Loader = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="relative inline-block h-9 w-9 animate-spin">
        <div className="absolute h-full w-1/3 bottom-1 left-0 transform rotate-60 origin-bottom">
          <div className="h-0 w-full pb-full bg-purple-800 rounded-full animate-wobble1" />
        </div>
        <div className="absolute h-full w-1/3 bottom-1 right-0 transform -rotate-60 origin-bottom">
          <div className="h-0 w-full pb-full bg-purple-800 rounded-full animate-wobble2" />
        </div>
        <div className="absolute h-full w-1/3 bottom-[-5%] left-0 translate-x-[116.666%]">
          <div className="h-0 w-full pb-full bg-purple-800 rounded-full animate-wobble3" />
        </div>
      </div>
    </div>
  );
};

export default Loader;