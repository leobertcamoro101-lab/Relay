import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

function RootLayout() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>}>
      <Outlet />
    </Suspense>
  );
}

export default RootLayout;

// if you have top navigation in your web app after login
// import { Suspense, useContext } from 'react';
// import { Outlet, useLocation } from 'react-router-dom';

// import ChatInterface from './ChatInterface';
// import { AuthContext } from '../context/auth-context';
// import LoadingSpinner from '../components/LoadingSpinner';

// function RootLayout() {
//   const location = useLocation();
//   const { token } = useContext(AuthContext);
//   // const hideNav = location.pathname === '/' && !token;
//   const publicPaths = ['/', '/forgot-password', '/signup'];
//   const hideInterface = !token && (   
//   publicPaths.includes(location.pathname) ||
//   location.pathname.startsWith('/reset-password/')
// );
//   return (
//     <>
//       {!hideInterface && <ChatInterface />}
//       <main className={hideInterface ? '' : 'pt-16'}>
//         <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner/></div>}>
//           <Outlet />
//         </Suspense>
//       </main>
//     </>
//   );
// }

// export default RootLayout;