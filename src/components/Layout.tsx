import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />
      {/* 
        Mobile: tidak ada margin (sidebar overlay)
        Tablet (lg): margin 260px untuk sidebar expanded
        Desktop dengan sidebar collapsed ditangani via CSS variable jika perlu
      */}
      <main className="flex-1 min-h-screen w-full lg:ml-[260px]">
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
