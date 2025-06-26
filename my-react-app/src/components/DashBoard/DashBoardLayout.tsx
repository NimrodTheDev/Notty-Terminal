
import { Outlet } from 'react-router-dom'
import Sidebar from './SideBar'

function DashBoardLayout() {
    return (
        <div className='flex h-auto bg-custom-dark-blue text-white'>
            <div className=' flex h-screen w-auto bg-inherit'>
                <Sidebar />
            </div>
            <div className='flex-1   bg-gray-100'>
                {/* Main content goes here */}
                {/* <h1 className='text-2xl font-bold text-gray-800'>Dashboard Content</h1>
                <p className='text-gray-600'>This is where your dashboard content will be displayed.</p> */}
                <Outlet />
            </div>
        </div>
    )
}

export default DashBoardLayout