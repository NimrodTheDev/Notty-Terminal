import { Users, Heart, Star } from 'lucide-react';

function Profile() {
    return (
        <div className='relative sm:min-h-[180vh] xl:min-h-[124vh]'>

            <div className="h-64 z-10 crtGradient background-container top-10 left-10">


            </div>

            <div className="max-[400px] h-[1200px] mx-auto bg-custom-dark-blue relative flex items-center justify-center">
                <div className="flex justify-center items-center absolute mt-10 flex-col border-gray-600 border max-w-[970px] 
                w-full top-[-150px] mx-auto bg-custom-dark-blue z-10 p-4 text-white rounded">
                    <div className="mb-8">
                        <div className="flex items-center justify-between p-6 border-b border-gray-800">
                            <div className="flex items-center space-x-4">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                    <span className="text-xl font-bold">🚀</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold">Username</h1>
                                    <p className="text-gray-400 text-sm">@username</p>
                                </div>
                            </div>
                            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Follow
                            </button>
                        </div>
                        {/* <h1 className="text-2xl font-bold text-center mb-2">Project details</h1>
                        <p className="text-gray-400">
                            Provide important details about your project
                        </p> */}
                    </div>

                </div>

            </div>
        </div>
    )

}


export default Profile

