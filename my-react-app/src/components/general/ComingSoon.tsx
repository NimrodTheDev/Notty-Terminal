import { Loader, Clock } from 'lucide-react'; // Importing icons from lucide-react

export default function ComingSoon() {
    return (
        <div className='bg-gradient-to-br from-black via-purple-900 to-black min-h-screen flex items-center justify-center relative overflow-hidden'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden bg-custom-dark-blue'>
                {/* small decorative emojis */}
                {/* <div className='absolute top-6 right-24 text-purple-500 opacity-25 text-4xl select-none'>🌟</div>
                <div className='absolute top-10 left-20 text-purple-500 opacity-20 text-3xl select-none'>🚀</div>
                <div className='absolute top-28 right-12 text-purple-500 opacity-30 text-5xl select-none'>🔮</div>
                <div className='absolute top-40 left-64 text-purple-500 opacity-25 text-4xl select-none'>🧬</div>
                <div className='absolute top-52 right-48 text-purple-500 opacity-20 text-3xl select-none'>🛸</div>
                <div className='absolute bottom-16 right-20 text-purple-500 opacity-20 text-3xl select-none'>🌙</div>
                <div className='absolute bottom-24 left-60 text-purple-500 opacity-25 text-4xl select-none'>🪐</div>
                <div className='absolute bottom-28 left-32 text-purple-500 opacity-15 text-2xl select-none'>✨</div>
                <div className='absolute bottom-40 right-72 text-purple-500 opacity-25 text-4xl select-none'>🔭</div>
                <div className='absolute bottom-12 left-80 text-purple-500 opacity-30 text-5xl select-none'>⚛️</div> */}

                <img src="/Frame_158__1_-removebg-preview.png" alt="landing Background" className="w-screen h-screen object-cover opacity-50" />
            </div>

            {/* Main content */}
            <div className='relative z-10 text-center px-6 py-12 max-w-4xl'>
                {/* Coming Soon Flexbox */}
                <div className='flex flex-col items-center'>
                    <h1 className='text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-purple-200 text-transparent bg-clip-text transition-transform transform hover:scale-105 break-words'>
                        Coming Soon! 🚀 <Loader className='inline-block animate-spin' style={{ animationDuration: '2s', transformOrigin: '50% 50%' }} />
                    </h1>

                    {/* Extra Write-up */}
                    <div className='mt-4 sm:mt-8 text-gray-300 text-base xs:text-lg max-w-2xl mx-auto'>
                        <p className='bg-gray-800 p-4 rounded-md'>
                            Still in production. We are working hard to bring you the best experience possible! Stay tuned for updates! <Clock className='inline-block ml-2' />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
