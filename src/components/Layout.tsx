import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />
      <main className="flex-1 min-h-screen w-full lg:ml-[240px]">
        {/* pt-16: ruang hamburger mobile, pb-20: ruang bottom nav mobile */}
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto pt-16 lg:pt-6 pb-24 lg:pb-6">
          {children}
        </div>
      </main>
    </div>
  );
}
