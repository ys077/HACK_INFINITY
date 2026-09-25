import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const defaultPassword = 'password123'
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(defaultPassword, salt)

  // Clear the database first to ensure fresh seed
  await prisma.deviceChallenge.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.attendanceConflict.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.presenceEvent.deleteMany()
  await prisma.attendanceSession.deleteMany()
  await prisma.studentDevice.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.student.deleteMany()
  await prisma.class.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.section.deleteMany()
  await prisma.course.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.department.deleteMany()
  await prisma.user.deleteMany()

  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@presenza.edu',
      passwordHash,
      role: 'ADMIN',
      admin: {
        create: {
          name: 'System Admin',
        }
      }
    }
  })

  // Departments & Courses
  const departmentsData = [
    { name: 'Cyber Security', code: 'CYBER' },
    { name: 'Computer and Communication Engineering', code: 'CCE' },
    { name: 'Mechanical Engineering', code: 'MECH' },
    { name: 'Civil Engineering', code: 'CIVIL' },
    { name: 'Artificial Intelligence and Machine Learning', code: 'AIML' },
    { name: 'Artificial Intelligence and Data Science', code: 'AIDS' },
    { name: 'Electrical and Electronics Engineering', code: 'EEE' },
    { name: 'Electronics and Communication Engineering', code: 'ECE' },
    { name: 'Computer Science', code: 'CS' },
    { name: 'Information Technology', code: 'IT' }
  ]

  const departments = []
  const courses = []
  const sections = []
  
  for (const deptData of departmentsData) {
    const dept = await prisma.department.create({
      data: deptData
    })
    departments.push(dept)

    const course1 = await prisma.course.create({
      data: { name: `B.Tech ${dept.name}`, code: `BT-${dept.code}`, departmentId: dept.id }
    })
    const course2 = await prisma.course.create({
      data: { name: `M.Tech ${dept.name}`, code: `MT-${dept.code}`, departmentId: dept.id }
    })
    
    courses.push(course1, course2)

    // Sections A to E for course1
    for (const sec of ['A', 'B', 'C', 'D', 'E']) {
      const section = await prisma.section.create({
        data: { name: sec, year: 1, courseId: course1.id }
      })
      sections.push(section)
    }
  }

  // Classrooms
  const rooms = []
  for (let i = 1; i <= 5; i++) {
    const room = await prisma.classroom.create({
      data: { name: `Lab ${i}`, building: 'Tech Block', floor: '1st', roomNumber: `10${i}` }
    })
    rooms.push(room)
  }

  // Faculty and Classes
  const facultyMembers = []
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i]
    
    const facultyUser = await prisma.user.create({
      data: {
        email: `faculty.${course.code.toLowerCase()}@presenza.edu`,
        passwordHash,
        role: 'FACULTY',
        faculty: {
          create: {
            employeeId: `F${1000 + i}`,
            name: `Prof. ${course.code}`,
            departmentId: course.departmentId,
            courseId: course.id
          }
        }
      },
      include: { faculty: true }
    })
    facultyMembers.push(facultyUser.faculty!)

    // Create a class for this faculty if there are sections available for this course
    const courseSections = sections.filter(s => s.courseId === course.id)
    if (courseSections.length > 0) {
      await prisma.class.create({
        data: {
          sectionId: courseSections[0].id,
          facultyId: facultyUser.faculty!.id,
          classroomId: rooms[i % rooms.length].id
        }
      })
    }
  }

  // Students
  let studentCounter = 1
  for (const section of sections) {
    // Add 5 students per section
    const course = courses.find(c => c.id === section.courseId)!
    for (let i = 1; i <= 5; i++) {
      const studentUser = await prisma.user.create({
        data: {
          email: `student${studentCounter}@presenza.edu`,
          passwordHash,
          role: 'STUDENT',
          student: {
            create: {
              studentId: `S${10000 + studentCounter}`,
              name: `Student ${studentCounter}`,
              departmentId: course.departmentId,
              courseId: course.id,
              sectionId: section.id,
              year: 1
            }
          }
        },
        include: { student: true }
      })

      const cls = await prisma.class.findFirst({ where: { sectionId: section.id } })
      if (cls) {
        await prisma.enrollment.create({
          data: {
            studentId: studentUser.student!.id,
            classId: cls.id,
            status: 'ACTIVE'
          }
        })
      }
      studentCounter++
    }
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
