import React from 'react';

interface LoaderProps {
  children?: React.ReactNode;
}

const Loader: React.FC<LoaderProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative w-32 h-20">
        <span className="absolute top-0 text-purple-600 text-lg tracking-wide animate-loader-text">loading</span>
        <span className="absolute bottom-0 block h-6 w-6 bg-purple-700 rounded-full transform translate-x-20 animate-loader" />
      </div>
      {children} {/* Safely renders children (if any) */}
    </div>
  );
};

export default Loader;
