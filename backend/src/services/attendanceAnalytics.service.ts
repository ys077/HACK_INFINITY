import { prisma } from '../lib/prisma.js';

export class AttendanceAnalyticsService {
  /**
   * --- STUDENT ANALYTICS ---
   */

  static async getStudentSummary(studentId: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
    });

    const totalSessions = records.length;
    let attendedSessions = 0;
    let partialSessions = 0;
    let missedSessions = 0;
    let totalVerifiedSeconds = 0;
    let totalSessionSeconds = 0;

    records.forEach(r => {
      totalVerifiedSeconds += r.totalPresentSeconds;
      totalSessionSeconds += (r.totalPresentSeconds + r.totalAbsentSeconds);

      if (r.status === 'PRESENT') {
        attendedSessions++;
      } else if (r.status === 'LATE' || (r.presencePercentage > 0 && r.presencePercentage < 50)) {
        // We'll treat LATE or partially present (but below PRESENT threshold) as partial
        // or actually, if status is not PRESENT but verified > 0, it's partial.
        // Let's use presencePercentage directly
        if (r.presencePercentage >= 50) attendedSessions++;
        else if (r.presencePercentage > 0) partialSessions++;
        else missedSessions++;
      } else {
        missedSessions++;
      }
    });

    const overallAttendancePercentage = totalSessionSeconds > 0 
      ? Number(((totalVerifiedSeconds / totalSessionSeconds) * 100).toFixed(2)) 
      : 100;

    // Recalculate accurately based on exact status assignment in AttendanceService
    // To be precise with DB:
    const presentCount = records.filter(r => r.status === 'PRESENT').length;
    const absentCount = records.filter(r => r.status === 'ABSENT' && r.presencePercentage === 0).length;
    const partialCount = records.filter(r => r.status === 'ABSENT' && r.presencePercentage > 0).length;

    return {
      overallAttendancePercentage,
      totalSessions,
      attendedSessions: presentCount,
      partialSessions: partialCount,
      missedSessions: absentCount,
      totalVerifiedSeconds,
      totalSessionSeconds
    };
  }

  static async getStudentCourses(studentId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: {
        class: {
          include: {
            section: {
              include: { course: true }
            },
            attendanceSessions: {
              where: { status: 'ENDED' },
              include: {
                attendanceRecords: {
                  where: { studentId }
                }
              }
            }
          }
        }
      }
    });

    const courses = enrollments.map(e => {
      let sumPresent = 0;
      let sumTotal = 0;

      e.class.attendanceSessions.forEach(session => {
        session.attendanceRecords.forEach(r => {
          sumPresent += r.totalPresentSeconds;
          sumTotal += (r.totalPresentSeconds + r.totalAbsentSeconds);
        });
      });

      return {
        courseId: e.class.section?.course?.id || e.class.id,
        courseName: e.class.section?.course?.name || 'Unknown Course',
        courseCode: e.class.section?.course?.code || '',
        totalSessions: e.class.attendanceSessions.length,
        attendancePercentage: sumTotal > 0 ? Number(((sumPresent / sumTotal) * 100).toFixed(2)) : 100
      };
    });

    const grouped = new Map<string, any>();
    courses.forEach(c => {
      if (!grouped.has(c.courseId)) {
        grouped.set(c.courseId, c);
      }
    });

    return { courses: Array.from(grouped.values()) };
  }

  static async getStudentTrends(studentId: string, from?: string, to?: string) {
    const whereClause: any = { studentId };
    
    // Default to last 30 days if not provided
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    whereClause.session = {
      startedAt: {
        gte: fromDate,
        lte: toDate
      },
      status: 'ENDED'
    };

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        session: true
      },
      orderBy: {
        session: { startedAt: 'asc' }
      }
    });

    // Group by week or day depending on range
    // For simplicity, let's just group by ISO date string
    const pointsMap = new Map<string, { presentSecs: number, totalSecs: number }>();

    records.forEach(r => {
      if (!r.session.startedAt) return;
      const dateKey = r.session.startedAt.toISOString().split('T')[0];
      const existing = pointsMap.get(dateKey) || { presentSecs: 0, totalSecs: 0 };
      existing.presentSecs += r.totalPresentSeconds;
      existing.totalSecs += (r.totalPresentSeconds + r.totalAbsentSeconds);
      pointsMap.set(dateKey, existing);
    });

    const points = Array.from(pointsMap.entries()).map(([date, data]) => ({
      date,
      attendancePercentage: data.totalSecs > 0 ? Number(((data.presentSecs / data.totalSecs) * 100).toFixed(2)) : 0
    }));

    return { points };
  }


  /**
   * --- FACULTY ANALYTICS ---
   */

  static async getFacultyClassSummary(facultyId: string, classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId, facultyId },
      include: {
        enrollments: { where: { status: 'ACTIVE' } },
        attendanceSessions: { 
          where: { status: 'ENDED' },
          include: { attendanceRecords: true } 
        }
      }
    });

    if (!cls) throw new Error('Class not found or access denied');

    const totalStudents = cls.enrollments.length;
    const totalSessions = cls.attendanceSessions.length;
    
    let totalPresentCount = 0;
    let totalPartialCount = 0;
    let totalAbsentCount = 0;
    let sumVerifiedSeconds = 0;
    let sumSessionSeconds = 0;

    cls.attendanceSessions.forEach(session => {
      session.attendanceRecords.forEach(r => {
        sumVerifiedSeconds += r.totalPresentSeconds;
        sumSessionSeconds += (r.totalPresentSeconds + r.totalAbsentSeconds);
        if (r.status === 'PRESENT') totalPresentCount++;
        else if (r.presencePercentage > 0) totalPartialCount++;
        else totalAbsentCount++;
      });
    });

    const averageAttendance = sumSessionSeconds > 0 
      ? Number(((sumVerifiedSeconds / sumSessionSeconds) * 100).toFixed(2)) 
      : 100;
      
    const totalRecords = totalPresentCount + totalPartialCount + totalAbsentCount;
    const averageVerifiedDuration = totalRecords > 0 ? sumVerifiedSeconds / totalRecords : 0;

    return {
      totalStudents,
      totalSessions,
      totalPresent: totalPresentCount,
      totalPartial: totalPartialCount,
      totalAbsent: totalAbsentCount,
      averageAttendance,
      averageVerifiedDurationSeconds: Math.round(averageVerifiedDuration)
    };
  }

  static async getFacultyStudentBreakdown(facultyId: string, classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId, facultyId },
      include: {
        enrollments: { 
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                attendanceRecords: {
                  where: { session: { classId, status: 'ENDED' } }
                }
              }
            }
          }
        }
      }
    });

    if (!cls) throw new Error('Class not found or access denied');

    const students = cls.enrollments.map(e => {
      const records = e.student.attendanceRecords;
      let presentCount = 0;
      let partialCount = 0;
      let absentCount = 0;
      let sumPresent = 0;
      let sumTotal = 0;

      records.forEach(r => {
        sumPresent += r.totalPresentSeconds;
        sumTotal += (r.totalPresentSeconds + r.totalAbsentSeconds);
        if (r.status === 'PRESENT') presentCount++;
        else if (r.presencePercentage > 0) partialCount++;
        else absentCount++;
      });

      const attendancePercentage = sumTotal > 0 ? Number(((sumPresent / sumTotal) * 100).toFixed(2)) : 100;

      return {
        studentId: e.student.studentId,
        studentName: e.student.name,
        sessionsAttended: presentCount,
        partialSessions: partialCount,
        missedSessions: absentCount,
        attendancePercentage
      };
    });

    return { students };
  }

  /**
   * --- ADMIN ANALYTICS ---
   */

  static async getAdminOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalFaculty,
      totalSessions,
      activeSessions,
      completedSessionsToday,
      totalClasses,

      totalDepartments,
      totalCourses,
      totalSections,
      totalClassrooms,
      openConflicts,
      agg
    ] = await Promise.all([
      prisma.student.count(),
      prisma.faculty.count(),
      prisma.attendanceSession.count({ where: { status: 'ENDED' } }),
      prisma.attendanceSession.count({ where: { status: 'IN_PROGRESS' as any } }),
      prisma.attendanceSession.count({ where: { status: 'ENDED', endedAt: { gte: today } } }),
      prisma.class.count(),

      prisma.department.count(),
      prisma.course.count(),
      prisma.section.count(),
      prisma.classroom.count(),
      prisma.attendanceConflict.count({ where: { resolvedAt: null } }),
      prisma.attendanceRecord.aggregate({
        _sum: {
          totalPresentSeconds: true,
          totalAbsentSeconds: true
        }
      })
    ]);

    const sumPresent = agg._sum.totalPresentSeconds || 0;
    const sumAbsent = agg._sum.totalAbsentSeconds || 0;
    const sumTotal = sumPresent + sumAbsent;

    const averageAttendance = sumTotal > 0 ? Number(((sumPresent / sumTotal) * 100).toFixed(2)) : 100;

    return {
      totalStudents,
      totalFaculty,
      totalSessions,
      activeSessions,
      completedSessionsToday,
      totalClasses,

      totalDepartments,
      totalCourses,
      totalSections,
      totalClassrooms,
      openConflicts,
      averageAttendance
    };
  }

  static async getAdminDepartments() {
    const departments = await prisma.department.findMany({
      include: {
        students: {
          include: {
            attendanceRecords: true
          }
        }
      }
    });

    const results = departments.map(dept => {
      let sumPresent = 0;
      let sumTotal = 0;

      dept.students.forEach(student => {
        student.attendanceRecords.forEach(r => {
          sumPresent += r.totalPresentSeconds;
          sumTotal += (r.totalPresentSeconds + r.totalAbsentSeconds);
        });
      });

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        studentCount: dept.students.length,
        averageAttendance: sumTotal > 0 ? Number(((sumPresent / sumTotal) * 100).toFixed(2)) : 100
      };
    });

    return { departments: results };
  }
}
