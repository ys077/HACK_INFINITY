import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const defaultPassword = 'password123'
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(defaultPassword, salt)

  // Clear the database first to ensure fresh seed
  await prisma.auditLog.deleteMany()
  await prisma.attendanceConflict.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.presenceEvent.deleteMany()
  await prisma.attendanceSession.deleteMany()
  await prisma.studentDevice.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.student.deleteMany()
  await prisma.class.deleteMany()
  await prisma.classroom.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.section.deleteMany()
  await prisma.course.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.department.deleteMany()
  await prisma.user.deleteMany()

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@presenza.edu',
      passwordHash, // Dummy hash
      role: 'ADMIN',
      admin: {
        create: {
          name: 'Super Admin',
        }
      }
    },
    include: { admin: true }
  })

  // Departments
  const deptCS = await prisma.department.create({
    data: { name: 'Computer Science', code: 'CS' }
  })
  const deptIT = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT' }
  })

  // Faculty
  const faculty1 = await prisma.user.create({
    data: {
      email: 'john.smith@presenza.edu',
      passwordHash,
      role: 'FACULTY',
      faculty: {
        create: {
          employeeId: 'F001',
          name: 'John Smith',
          departmentId: deptCS.id
        }
      }
    },
    include: { faculty: true }
  })

  const faculty2 = await prisma.user.create({
    data: {
      email: 'jane.doe@presenza.edu',
      passwordHash,
      role: 'FACULTY',
      faculty: {
        create: {
          employeeId: 'F002',
          name: 'Jane Doe',
          departmentId: deptIT.id
        }
      }
    },
    include: { faculty: true }
  })

  // Courses
  const courseCS = await prisma.course.create({
    data: { name: 'B.Sc. Computer Science', code: 'BCS', departmentId: deptCS.id }
  })
  const courseIT = await prisma.course.create({
    data: { name: 'B.Sc. Information Technology', code: 'BIT', departmentId: deptIT.id }
  })

  // Sections
  const sectionA = await prisma.section.create({
    data: { name: 'A', year: 1, courseId: courseCS.id }
  })
  const sectionB = await prisma.section.create({
    data: { name: 'B', year: 1, courseId: courseIT.id }
  })

  // Subjects
  const subj1 = await prisma.subject.create({
    data: { code: 'CS101', name: 'Introduction to Programming', credits: 4 }
  })
  const subj2 = await prisma.subject.create({
    data: { code: 'CS102', name: 'Data Structures', credits: 4 }
  })
  const subj3 = await prisma.subject.create({
    data: { code: 'IT101', name: 'Web Technologies', credits: 3 }
  })
  const subj4 = await prisma.subject.create({
    data: { code: 'IT102', name: 'Database Systems', credits: 4 }
  })

  // Classrooms
  const room1 = await prisma.classroom.create({
    data: { name: 'Lab 1', building: 'Tech Block', floor: '1st', roomNumber: '101' }
  })
  const room2 = await prisma.classroom.create({
    data: { name: 'Lecture Hall A', building: 'Main Block', floor: 'Ground', roomNumber: 'G01' }
  })

  // Classes
  const class1 = await prisma.class.create({
    data: {
      subjectId: subj1.id,
      sectionId: sectionA.id,
      facultyId: faculty1.faculty!.id,
      classroomId: room1.id
    }
  })

  const class2 = await prisma.class.create({
    data: {
      subjectId: subj3.id,
      sectionId: sectionB.id,
      facultyId: faculty2.faculty!.id,
      classroomId: room2.id
    }
  })

  // Students (20 students)
  const students = []
  for (let i = 1; i <= 20; i++) {
    const isCS = i <= 10
    const studentUser = await prisma.user.create({
      data: {
        email: `student${i}@presenza.edu`,
        passwordHash,
        role: 'STUDENT',
        student: {
          create: {
            studentId: `S${1000 + i}`,
            name: `Student ${i}`,
            departmentId: isCS ? deptCS.id : deptIT.id,
            courseId: isCS ? courseCS.id : courseIT.id,
            sectionId: isCS ? sectionA.id : sectionB.id,
            year: 1
          }
        }
      },
      include: { student: true }
    })
    students.push(studentUser.student!)

    // Enrollments
    await prisma.enrollment.create({
      data: {
        studentId: studentUser.student!.id,
        classId: isCS ? class1.id : class2.id,
        status: 'ACTIVE'
      }
    })
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
