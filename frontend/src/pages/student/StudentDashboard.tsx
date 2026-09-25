import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Radio, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [device, setDevice] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: any;
    
    const fetchData = async () => {
      try {
        const [clsRes, sessionRes, deviceRes, historyRes] = await Promise.all([
          api.get('/student/classes'),
          api.get('/student/sessions/active'),
          api.get('/student/devices').catch(() => ({ data: { data: [] } })),
          api.get('/student/attendance/history')
        ]);
        
        setClasses(clsRes.data.data);
        setActiveSessions(sessionRes.data.data);
        
        const devices = deviceRes.data.data;
        if (devices && devices.length > 0) {
          setDevice(devices[0]);
        }
        
        setHistory(historyRes.data.data.sessions || []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Poll for active sessions every 10 seconds so it dynamically updates when faculty starts a session
    intervalId = setInterval(async () => {
      try {
        const sessionRes = await api.get('/student/sessions/active');
        setActiveSessions(sessionRes.data.data);
      } catch (err) {
        console.error("Failed to poll active sessions", err);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard...</div>;
  }

  // Calculate overall attendance
  let totalClasses = history.length;
  let presentClasses = history.filter(h => h.status === 'PRESENT').length;
  let overallAttendance = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;

  return (
    <div className="flex flex-col w-full">
      <div className="w-full space-y-space-lg pb-space-xl">
        {/* HERO SECTION */}
        <section className="relative w-full rounded-[24px] overflow-hidden shadow-xl" style={{ height: '450px', background: 'linear-gradient(135deg, #10152B 0%, #292F67 58%, #5B5CE2 100%)' }}>
          <div className="absolute right-[14%] top-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-primary-container/25 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-stretch justify-between px-space-xl py-space-lg">
            <div className="w-full md:w-[54%] flex flex-col justify-between py-1 z-20">
              <div>
                <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-primary-fixed font-label-sm uppercase tracking-wider mb-space-md">
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  <span>Welcome Back</span>
                </div>
                <h1 className="text-white font-headline-lg text-headline-lg tracking-tight">Good morning, {user?.name?.split(' ')[0]}.</h1>
                <p className="font-headline-sm text-headline-sm text-indigo-100 font-semibold mt-1">Your classroom presence is ready.</p>
                <p className="font-body-md text-body-md text-indigo-100/80 mt-space-sm max-w-lg leading-relaxed">
                  Join your active class and PRESENZA will keep your attendance updated automatically throughout the lecture.
                </p>
              </div>
              
              {activeSessions.length > 0 ? (
                <div className="space-y-space-sm mt-space-md">
                  <div className="inline-flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/15 text-white shadow-sm">
                    <span className="material-symbols-outlined text-primary-fixed text-[18px]">chat_bubble</span>
                    <span className="font-label-md text-label-md font-medium text-white">Your {activeSessions[0]?.class?.section?.course?.name} class is ready in {activeSessions[0]?.class?.classroom?.name}.</span>
                  </div>
                  <div className="flex items-center gap-space-md pt-1">
                    <div className="flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-white font-label-md">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#22C7A3] animate-pulse"></span>
                      <span>System ready • Classroom ready</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-space-sm mt-space-md">
                  <div className="inline-flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-white/10 backdrop-blur-lg border border-white/15 text-white shadow-sm">
                    <span className="font-label-md text-label-md font-medium text-white">No active classes at the moment.</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-[46%] relative h-full flex items-end justify-center pointer-events-none select-none">
              <div className="absolute bottom-1 w-52 h-4 rounded-full bg-black/45 blur-md"></div>
              <div className="absolute top-4 right-2 z-30 pointer-events-auto flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest/20 backdrop-blur-md border border-white/20 text-white font-label-sm shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C7A3]"></span>
                <span>Interactive Companion • Active</span>
              </div>
              <img alt="Companion" className="relative z-10 max-h-[430px] w-auto object-contain drop-shadow-2xl mix-blend-normal" src="https://lh3.googleusercontent.com/aida/AEtjO1WcbNJhIMxwea07rSATSSOBbYnpzGHI1rEeQhCSYwPHNLH6cT-EOQuRAysh6i3Qg6g4doAcfGuQS2L7XMyB41KBx3fPb1hmopzTi_KhCHYH_7Ro8QeZiiZYVfBG_7OV28xz4RvZB4GFKvs18QdmpsUYIB3a6ZDv8mR7q7tuCq20tZK4ooTJ2gcG7xKM15HudEOiALZyNlcYIKe7ki5JqCGUDqXOCq7txARaMNGY-bIiUQCTUiIApj0gAKI" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col space-y-space-lg">
            {activeSessions.length > 0 ? (
              <div className="rounded-[20px] bg-surface-container-lowest shadow-[0_8px_32px_rgba(16,21,43,0.06)] p-space-xl flex flex-col justify-between" style={{ border: '1px solid #E5E7EF' }}>
                <div>
                  <div className="flex items-center justify-between pb-space-md" style={{ borderBottom: '1px solid #E5E7EF' }}>
                    <div className="flex items-center gap-space-sm">
                      <span className="font-label-md text-label-md text-primary font-bold tracking-wider uppercase">Active Session</span>
                      <span className="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                        LIVE NOW
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-space-md flex items-start justify-between gap-space-md">
                    <div>
                      <h2 className="font-headline-md text-headline-md text-on-surface">{activeSessions[0].class?.section?.course?.name} ({activeSessions[0].class?.section?.name})</h2>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[28px]">shield</span>
                    </div>
                  </div>

                  <div className="mt-space-md grid grid-cols-2 gap-space-sm p-space-md rounded-xl bg-surface-container-low">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">meeting_room</span>
                      <div>
                        <span className="block font-label-sm text-tertiary">Assigned Venue</span>
                        <span className="font-title-md text-title-md text-on-surface">{activeSessions[0].class?.classroom?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-space-lg space-y-space-sm">
                    <span className="font-label-sm text-tertiary uppercase font-bold tracking-wide">Verification Pre-conditions</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                      <div className="flex items-center gap-space-xs p-space-sm rounded-lg bg-surface">
                        <span className="material-symbols-outlined text-[#0E8B70] text-[18px]">check_circle</span>
                        <div className="min-w-0">
                          <span className="block font-label-sm text-tertiary">Classroom</span>
                          <span className="font-label-md text-on-surface truncate">In {activeSessions[0].class?.classroom?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs p-space-sm rounded-lg bg-surface">
                        <span className={`material-symbols-outlined text-[18px] ${device?.status === 'ACTIVE' ? 'text-[#0E8B70]' : 'text-error'}`}>phonelink_ring</span>
                        <div className="min-w-0">
                          <span className="block font-label-sm text-tertiary">Registered Device</span>
                          <span className="font-label-md text-on-surface truncate">{device?.name || 'Not Registered'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs p-space-sm rounded-lg bg-surface">
                        <span className="material-symbols-outlined text-primary text-[18px]">sensors</span>
                        <div className="min-w-0">
                          <span className="block font-label-sm text-tertiary">Presence Sensor</span>
                          <span className="font-label-md text-on-surface truncate">Ready to join</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-space-xl">
                  <Link to={`/student/sessions/${activeSessions[0].id}`} className="w-full h-[54px] rounded-xl bg-primary-container text-white font-title-md text-title-md flex items-center justify-center gap-space-sm shadow-md hover:bg-[#4546b8] active:scale-[0.99] transition-all cursor-pointer">
                    <span>Join Session</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </Link>
                  <p className="font-label-sm text-label-sm text-center text-tertiary mt-2">
                    Your continuous presence will begin after verification. No action needed once verified.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] bg-surface-container-lowest p-space-xl flex flex-col justify-center items-center text-center h-full min-h-[300px]" style={{ border: '1px solid #E5E7EF' }}>
                 <span className="material-symbols-outlined text-[48px] text-tertiary mb-4">check_circle</span>
                 <h2 className="font-headline-md text-headline-md text-on-surface">No Active Sessions</h2>
                 <p className="font-body-md text-tertiary mt-2 max-w-md">You do not have any active classes right now. Once your faculty starts a session, it will appear here automatically.</p>
              </div>
            )}
            
            <div className="rounded-[18px] bg-surface-container-lowest p-space-md flex items-center gap-space-md shadow-sm" style={{ border: '1px solid #E5E7EF' }}>
              <div className="w-10 h-10 rounded-full bg-[#22C7A3]/10 flex items-center justify-center text-[#0E8B70] shrink-0">
                <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-title-md text-title-md text-on-surface">Ambient &amp; Respectful Continuous Verification</h3>
                <p className="font-body-md text-body-md text-tertiary text-sm">PRESENZA maintains uninterrupted attendance logs without biometric cameras or personal location tracking outside assigned venues.</p>
              </div>
              <span className="material-symbols-outlined text-tertiary text-[20px]">lock</span>
            </div>
          </div>
          
          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col space-y-space-lg">
            {/* My Attendance */}
            <div className="rounded-[20px] bg-surface-container-lowest shadow-[0_8px_32px_rgba(16,21,43,0.06)] p-space-lg flex flex-col justify-between" style={{ border: '1px solid #E5E7EF' }}>
              <div className="flex items-center justify-between pb-space-sm" style={{ borderBottom: '1px solid #E5E7EF' }}>
                <span className="font-label-md text-label-md text-tertiary uppercase font-bold tracking-wider">My Attendance</span>
                <span className="font-label-sm text-primary font-semibold">Semester Target: 75%</span>
              </div>
              <div className="py-space-md flex items-center gap-space-lg">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>
                    <path className="text-primary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${overallAttendance}, 100`} strokeLinecap="round" strokeWidth="3.5"></path>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-none">{overallAttendance}%</span>
                    <span className="font-label-sm text-label-sm text-tertiary mt-0.5">Aggregate</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-space-xs">
                  <div className={`inline-flex items-center gap-1 font-label-md font-semibold ${overallAttendance >= 75 ? 'text-[#0E8B70]' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[16px]">{overallAttendance >= 75 ? 'trending_up' : 'trending_down'}</span>
                    <span>{overallAttendance >= 75 ? 'Above requirement' : 'Below requirement'}</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface font-medium">{presentClasses} of {totalClasses} sessions verified</p>
                </div>
              </div>
              <div className="pt-space-sm" style={{ borderTop: '1px solid #E5E7EF' }}>
                <Link to="/student/attendance" className="w-full py-2 flex items-center justify-between text-primary font-title-md text-title-md hover:text-on-primary-fixed-variant transition-colors">
                  <span>View Attendance Ledger</span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </Link>
              </div>
            </div>

            {/* Registered Device */}
            <div className="rounded-[20px] bg-surface-container-lowest shadow-[0_8px_32px_rgba(16,21,43,0.06)] p-space-lg" style={{ border: '1px solid #E5E7EF' }}>
              <div className="flex items-center justify-between pb-space-sm" style={{ borderBottom: '1px solid #E5E7EF' }}>
                <span className="font-label-md text-label-md text-tertiary uppercase font-bold tracking-wider">Registered Device</span>
                {device?.status === 'ACTIVE' ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#22C7A3]/15 text-[#0E8B70] font-label-sm font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C7A3]"></span>
                    Authorized
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-error/15 text-error font-label-sm font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                    Unregistered
                  </span>
                )}
              </div>
              <div className="py-space-md flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[24px]">smartphone</span>
                  </div>
                  <div>
                    <div className="font-title-md text-title-md text-on-surface">{device?.name || 'No Device Found'}</div>
                    <div className="font-label-sm text-tertiary font-mono">ID: {device?.id?.substring(0,8) || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <div className="pt-space-sm flex items-center justify-between" style={{ borderTop: '1px solid #E5E7EF' }}>
                <div className="flex items-center gap-1 text-tertiary font-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#0E8B70]">check</span>
                  <span>Classroom BLE Tether Ready</span>
                </div>
                <Link to="/student/device" className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md hover:bg-surface-variant transition-colors">
                  Manage Device
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
