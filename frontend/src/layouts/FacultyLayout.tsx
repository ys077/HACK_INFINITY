import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export const FacultyLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    { name: 'Dashboard', to: '/faculty/dashboard', icon: 'grid_view' },
    { name: 'Start Session', to: '/faculty/sessions/start', icon: 'play_arrow' },
    { name: 'My Classes', to: '/faculty/classes', icon: 'menu_book' },
    { name: 'History', to: '/faculty/attendance/history', icon: 'history' },
    { name: 'Conflicts', to: '/faculty/conflicts', icon: 'warning' },
    { name: 'Reports', to: '/faculty/reports', icon: 'insert_chart' },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-0 h-full w-[250px] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col">
          <div className="h-16 px-space-md flex items-center gap-space-sm bg-surface-container-lowest">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-bold text-lg">P</div>
            <div className="flex flex-col min-w-0">
              <span className="font-title-md text-title-md tracking-tight text-on-surface leading-none">PRESENZA</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate mt-0.5">Classroom Presence</span>
            </div>
          </div>
          <div className="mx-space-md mt-space-sm mb-space-sm p-space-sm bg-surface-container-low rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-tertiary">Faculty View</span>
              <button className="text-primary hover:text-on-primary-fixed-variant flex items-center transition-colors" type="button">
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              </button>
            </div>
            <div className="font-label-md text-label-md text-on-surface truncate mt-1">{user?.name || user?.email}</div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono">{user?.employeeId || 'N/A'}</div>
          </div>
          <nav className="px-space-sm space-y-space-xs overflow-y-auto">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) => cn(
                  "flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors font-title-md",
                  isActive 
                    ? "bg-surface-container text-primary font-title-md" 
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body-md text-body-md">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-space-sm flex flex-col gap-space-sm">
          <button onClick={logout} className="flex items-center gap-space-sm px-space-md py-space-xs text-error hover:text-error-container transition-colors w-full">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="font-label-md text-label-md">Sign Out</span>
          </button>
          <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface truncate">{user?.name?.split(' ')[0] || user?.email?.split('@')[0]}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate capitalize">{user?.role?.toLowerCase() || 'faculty'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="pl-[250px] min-h-screen flex flex-col bg-surface">
        <header className="fixed top-0 left-[250px] right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-gutter flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md flex-1 max-w-lg">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-tertiary text-[18px]">search</span>
              <input className="w-full pl-10 pr-space-md py-1.5 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder-tertiary focus:outline-none focus:bg-surface-container-lowest transition-colors" placeholder="Search courses, sessions, or students (⌘K)..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <button aria-label="Notifications" className="relative p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" type="button">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <button aria-label="Help" className="p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" type="button">
              <span className="material-symbols-outlined text-[22px]">help_outline</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-16 w-full px-gutter py-space-lg bg-surface">
          <Outlet />
        </main>

        <footer className="w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-space-md px-gutter mt-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-md text-label-md text-on-surface-variant">
            <p>© 2026 PRESENZA. Continuous Classroom Presence Platform.</p>
            <div className="flex items-center gap-space-md">
              <a className="hover:text-on-surface transition-colors" href="#">Attendance Policy</a>
              <span>•</span>
              <a className="hover:text-on-surface transition-colors" href="#">Privacy</a>
              <span>•</span>
              <a className="hover:text-on-surface transition-colors" href="#">Support Desk</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default FacultyLayout;
