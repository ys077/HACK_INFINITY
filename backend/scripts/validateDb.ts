import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validate() {
  console.log('--- Validating Database Schema ---')

  const usersCount = await prisma.user.count()
  console.log(`Users: ${usersCount}`)

  const adminCount = await prisma.admin.count()
  console.log(`Admins: ${adminCount}`)

  const facultyCount = await prisma.faculty.count()
  console.log(`Faculty: ${facultyCount}`)

  const studentCount = await prisma.student.count()
  console.log(`Students: ${studentCount}`)

  const deptCount = await prisma.department.count()
  console.log(`Departments: ${deptCount}`)

  const courseCount = await prisma.course.count()
  console.log(`Courses: ${courseCount}`)

  const sectionCount = await prisma.section.count()
  console.log(`Sections: ${sectionCount}`)

  const subjectCount = await prisma.subject.count()
  console.log(`Subjects: ${subjectCount}`)

  const classroomCount = await prisma.classroom.count()
  console.log(`Classrooms: ${classroomCount}`)

  const classesCount = await prisma.class.count()
  console.log(`Classes: ${classesCount}`)

  const enrollmentCount = await prisma.enrollment.count()
  console.log(`Enrollments: ${enrollmentCount}`)

  if (usersCount === 0) {
    console.error('Validation failed: Users not found')
    process.exit(1)
  }
  
  if (studentCount !== 20) {
    console.error(`Validation failed: Expected 20 students, found ${studentCount}`)
    process.exit(1)
  }

  // Validate relationships
  const sampleStudent = await prisma.student.findFirst({
    include: {
      user: true,
      department: true,
      course: true,
      section: true,
      enrollments: {
        include: {
          class: true
        }
      }
    }
  })

  if (!sampleStudent || !sampleStudent.user || !sampleStudent.department || !sampleStudent.enrollments.length) {
    console.error('Validation failed: Student relationships missing')
    process.exit(1)
  }

  console.log('--- Database Validation Passed ---')
}

validate()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
