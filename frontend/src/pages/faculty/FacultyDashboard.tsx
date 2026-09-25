import { useEffect, useState } from 'react';
import api from '../../services/api';
import { BookOpen, Radio, Users, Activity, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const FacultyDashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeSessions: 0,
    todayStudents: 0,
    avgAttendance: 0
  });
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const classesRes = await api.get('/faculty/classes');
        const classes = classesRes.data.data;
        
        const activeRes = await api.get('/faculty/sessions?status=IN_PROGRESS');
        const sessions = activeRes.data.data || [];

        setStats({
          totalClasses: classes.length,
          activeSessions: sessions.length,
          todayStudents: 0,
          avgAttendance: 0
        });

        setActiveSessions(sessions);
        setTodayClasses(classes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 animate-pulse">Loading dashboard...</div>;

  return (
    <div className="flex flex-col w-full">
      <div className="w-full space-y-space-lg pb-space-xl">
        <div className="flex justify-end items-center mb-4">
          <Link
            to="/faculty/session/start"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-fixed-variant font-title-md transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Session
          </Link>
        </div>

        {/* HERO SECTION */}
        <section className="relative w-full rounded-[24px] overflow-hidden shadow-xl" style={{ height: '400px', background: 'linear-gradient(135deg, #1A1F3B 0%, #3B2967 58%, #E25B8A 100%)' }}>
          <div className="absolute left-[10%] bottom-0 w-[300px] h-[300px] rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 w-full h-full flex flex-col items-start justify-center px-space-xl py-space-lg">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white font-label-sm uppercase tracking-wider mb-space-md">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>Faculty Portal</span>
            </div>
            <h1 className="text-white font-headline-lg text-headline-lg tracking-tight">Welcome, Professor.</h1>
            <p className="font-headline-sm text-headline-sm text-pink-100 font-semibold mt-1">Manage your classes efficiently.</p>
            <p className="font-body-md text-body-md text-pink-100/80 mt-space-sm max-w-lg leading-relaxed">
              Start a continuous presence session for your class. Once started, PRESENZA handles attendance logging seamlessly without interrupting your teaching flow.
            </p>
          </div>
        </section>

        {activeSessions.length > 0 && (
          <div className="space-y-space-sm mt-space-lg">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Active Sessions ({activeSessions.length})</h2>
            {activeSessions.map(session => (
              <div key={session.id} className="rounded-[20px] bg-surface-container-lowest shadow-md p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md" style={{ border: '2px solid #22C7A3' }}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-sm mb-2">
                    <span className="px-space-sm py-0.5 rounded-full bg-primary-container text-primary font-label-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                      IN PROGRESS
                    </span>
                    <span className="font-label-sm text-tertiary font-mono">{session.id}</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{session.class?.subject?.name || 'Active Session'}</h3>
                  <div className="font-body-md text-tertiary mt-1">{session.class?.section?.name} • {session.class?.classroom?.name}</div>
                </div>
                <Link
                  to={`/faculty/sessions/${session.id}`}
                  className="px-space-xl py-3 rounded-xl bg-primary text-white font-title-md hover:bg-primary-fixed-variant transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>Monitor Live</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg mt-space-lg">
          <div className="rounded-[20px] bg-surface-container-lowest p-space-lg shadow-sm flex flex-col" style={{ border: '1px solid #E5E7EF' }}>
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary mb-space-md">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <span className="font-label-md text-tertiary">My Classes</span>
            <span className="font-headline-md text-on-surface mt-1">{stats.totalClasses}</span>
          </div>

          <div className="rounded-[20px] bg-surface-container-lowest p-space-lg shadow-sm flex flex-col" style={{ border: '1px solid #E5E7EF' }}>
            <div className="w-12 h-12 rounded-xl bg-[#22C7A3]/20 flex items-center justify-center text-[#0E8B70] mb-space-md">
              <span className="material-symbols-outlined text-[24px]">podcasts</span>
            </div>
            <span className="font-label-md text-tertiary">Active Sessions</span>
            <span className="font-headline-md text-on-surface mt-1">{stats.activeSessions}</span>
          </div>

          <div className="rounded-[20px] bg-surface-container-lowest p-space-lg shadow-sm flex flex-col" style={{ border: '1px solid #E5E7EF' }}>
            <div className="w-12 h-12 rounded-xl bg-[#F0A923]/20 flex items-center justify-center text-[#B57C10] mb-space-md">
              <span className="material-symbols-outlined text-[24px]">group</span>
            </div>
            <span className="font-label-md text-tertiary">Today's Students</span>
            <span className="font-headline-md text-on-surface mt-1">-</span>
          </div>

          <div className="rounded-[20px] bg-surface-container-lowest p-space-lg shadow-sm flex flex-col" style={{ border: '1px solid #E5E7EF' }}>
            <div className="w-12 h-12 rounded-xl bg-[#5B5CE2]/20 flex items-center justify-center text-[#4141C8] mb-space-md">
              <span className="material-symbols-outlined text-[24px]">bar_chart</span>
            </div>
            <span className="font-label-md text-tertiary">Avg Attendance</span>
            <span className="font-headline-md text-on-surface mt-1">-</span>
          </div>
        </div>

        {/* MY CLASSES */}
        <section className="rounded-[20px] bg-surface-container-lowest shadow-[0_8px_32px_rgba(16,21,43,0.06)] p-space-xl mt-space-xl" style={{ border: '1px solid #E5E7EF' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2" style={{ borderBottom: '1px solid #E5E7EF' }}>
            <div className="flex items-center gap-space-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Assigned Classes</h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm font-semibold">{todayClasses.length} Courses</span>
            </div>
            <Link to="/faculty/classes" className="text-primary font-title-md text-title-md flex items-center gap-1 hover:underline">
              <span>View All</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          
          <div className="mt-space-lg grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            {todayClasses.map((cls) => (
              <div key={cls.id} className="p-space-lg rounded-2xl bg-surface-container-lowest flex flex-col justify-between gap-space-md" style={{ border: '1px solid #E5E7EF' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface">{cls.subject?.name}</h3>
                    <div className="font-body-md text-tertiary mt-1">
                      {cls.subject?.code} • {cls.section?.course?.name} ({cls.section?.name})
                    </div>
                  </div>
                  <span className="px-space-sm py-1 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-lg font-mono">
                    {cls.classroom?.name}
                  </span>
                </div>
                
                <div className="pt-space-sm mt-auto border-t border-surface-container flex justify-between items-center">
                  <span className="text-sm text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    {cls._count?.enrollments || 0} Enrolled
                  </span>
                  <Link 
                    to={`/faculty/classes/${cls.id}`} 
                    className="text-primary font-label-md hover:text-primary-fixed-variant transition-colors flex items-center gap-1"
                  >
                    Manage Class <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
            
            {todayClasses.length === 0 && (
              <div className="col-span-full p-12 text-center text-gray-500 font-body-md">
                No classes assigned yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FacultyDashboard;
