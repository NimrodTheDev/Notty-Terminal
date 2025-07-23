
import { Outlet } from 'react-router-dom'
import Sidebar from './SideBar'
import Header from '../landingPage/header'

function DashBoardLayout() {
    return (
        <div className='flex flex-col bg-custom-dark-blue text-white'>
            {/* Sticky Header at the top */}
            <div className='sticky top-0 z-40'>
                <Header hideList />
            </div>
            <div className='flex flex-1 flex-col lg:flex-row'>
                {/* Sidebar (no sticky) */}
                <div className='w-full lg:w-auto bg-inherit z-30 overflow-y-auto'>
                    <Sidebar />
                </div>
                {/* Main content scrollable */}
                <div className='flex-1 flex flex-col h-[calc(100vh-0px)]'>
                    <div className='flex-1 overflow-y-auto p-4'>
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DashBoardLayout