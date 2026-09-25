import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Play } from 'lucide-react';

const FacultyStartSession = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [duration, setDuration] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showSummary, setShowSummary] = useState(false);
  const [facultyInfo, setFacultyInfo] = useState<any>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const [clsRes, facRes] = await Promise.all([
          api.get('/faculty/classes'),
          api.get('/faculty/profile')
        ]);
        setClasses(clsRes.data.data || []);
        setFacultyInfo(facRes.data.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const departments = Array.from(new Set(classes.map(c => c.section?.course?.department?.name).filter(Boolean)));
  
  const availableClasses = classes.filter(c => !selectedDept || c.section?.course?.department?.name === selectedDept);
  const classNames = Array.from(new Set(availableClasses.map(c => `${c.section?.course?.name} - ${c.section?.name}`).filter(Boolean)));

  const availableSubjects = availableClasses.filter(c => !selectedClass || `${c.section?.course?.name} - ${c.section?.name}` === selectedClass);
  const subjects = Array.from(new Set(availableSubjects.map(c => c.subject?.name).filter(Boolean)));

  const availableRooms = availableSubjects.filter(c => !selectedSubject || c.subject?.name === selectedSubject);
  const rooms = Array.from(new Set(availableRooms.map(c => c.classroom?.name).filter(Boolean)));

  const targetClass = classes.find(c => 
    c.section?.course?.department?.name === selectedDept &&
    `${c.section?.course?.name} - ${c.section?.name}` === selectedClass &&
    c.subject?.name === selectedSubject &&
    c.classroom?.name === selectedClassroom
  );

  const handleReview = () => {
    if (!targetClass) return alert('Please select a valid combination');
    setShowSummary(true);
  };

  const handleStart = async () => {
    if (!targetClass) return alert('Please select a valid combination');
    setIsSubmitting(true);
    try {
      const res = await api.post('/faculty/sessions', {
        classId: targetClass.id,
        expectedEndAt: new Date(Date.now() + parseInt(duration) * 60000).toISOString()
      });
      navigate(`/faculty/sessions/${res.data.data.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to start session');
      setIsSubmitting(false);
      setShowSummary(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading assignments...</div>;

  if (classes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Start Attendance Session</h1>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">You are not assigned to any classes yet.</p>
        </div>
      </div>
    );
  }

  if (showSummary && targetClass) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">START CLASS SESSION</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Department</p>
              <p className="text-lg font-semibold text-gray-900">{selectedDept}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 font-medium">Class</p>
              <p className="text-lg font-semibold text-gray-900">{selectedClass}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 font-medium">Subject</p>
              <p className="text-lg font-semibold text-gray-900">{selectedSubject}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 font-medium">Classroom</p>
              <p className="text-lg font-semibold text-gray-900">{selectedClassroom}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 font-medium">Faculty</p>
              <p className="text-lg font-semibold text-gray-900">{facultyInfo?.name || 'Faculty'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Date</p>
                <p className="text-lg font-semibold text-gray-900">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 font-medium">Students</p>
              <p className="text-lg font-semibold text-gray-900">{targetClass.enrollments?.length || 0} enrolled</p>
            </div>
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button 
              onClick={() => setShowSummary(false)}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button 
              onClick={handleStart}
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isSubmitting ? 'STARTING...' : 'START SESSION'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Start Attendance Session</h1>
      <p className="text-gray-500">Configure your session context before initiating continuous presence monitoring.</p>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Department</label>
          <select 
            value={selectedDept} 
            onChange={e => { setSelectedDept(e.target.value); setSelectedClass(''); setSelectedSubject(''); setSelectedClassroom(''); }} 
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
          >
            <option value="">Choose department...</option>
            {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">2. Select Class</label>
          <select 
            value={selectedClass} 
            onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedClassroom(''); }} 
            disabled={!selectedDept} 
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50"
          >
            <option value="">Choose class & section...</option>
            {classNames.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">3. Select Subject</label>
          <select 
            value={selectedSubject} 
            onChange={e => { setSelectedSubject(e.target.value); setSelectedClassroom(''); }} 
            disabled={!selectedClass} 
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50"
          >
            <option value="">Choose subject...</option>
            {subjects.map((s: any) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">4. Select Classroom</label>
          <select 
            value={selectedClassroom} 
            onChange={e => setSelectedClassroom(e.target.value)} 
            disabled={!selectedSubject} 
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-50"
          >
            <option value="">Choose classroom...</option>
            {rooms.map((r: any) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Duration</label>
          <select 
            value={duration} 
            onChange={e => setDuration(e.target.value)} 
            className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
          >
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour (Recommended)</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <button 
          onClick={handleReview}
          disabled={!targetClass}
          className="w-full py-3.5 mt-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          REVIEW SESSION
        </button>
      </div>
    </div>
  );
};

export default FacultyStartSession;
