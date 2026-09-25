import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding classes and enrollments...');

  const depts = await prisma.department.findMany();
  if (depts.length < 2) {
    console.error('Not enough departments found.');
    return;
  }
  const cse = depts[0];
  const ece = depts[1];

  // Get sections
  const sections = await prisma.section.findMany();
  if (sections.length < 2) {
    console.error('Not enough sections found. Run the previous seed script first.');
    return;
  }
  const section1 = sections[0];
  const section2 = sections[1];

  // Get a faculty member
  let faculty = await prisma.faculty.findFirst();
  if (!faculty) {
    console.error('No faculty found. Please create one in the admin panel first.');
    return;
  }

  // Get a classroom
  let classroom = await prisma.classroom.findFirst();
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: 'Room 101',
        building: 'Main Block',
        floor: '1',
        roomNumber: '101'
      }
    });
  }

  // Assign faculty to Class 1 (Department 1 / Section 1)
  let class1 = await prisma.class.findFirst({
    where: { facultyId: faculty.id, sectionId: section1.id }
  });
  if (!class1) {
    class1 = await prisma.class.create({
      data: {
        sectionId: section1.id,
        facultyId: faculty.id,
        classroomId: classroom.id
      }
    });
    console.log(`Created Class 1: ${class1.id}`);
  }

  // Assign SAME faculty to Class 2 (Different section)
  let class2 = await prisma.class.findFirst({
    where: { facultyId: faculty.id, sectionId: section2.id }
  });
  if (!class2) {
    class2 = await prisma.class.create({
      data: {
        sectionId: section2.id,
        facultyId: faculty.id,
        classroomId: classroom.id
      }
    });
    console.log(`Created Class 2: ${class2.id}`);
  }

  // Enroll all students from section 1 into class 1
  const studentsSec1 = await prisma.student.findMany({ where: { sectionId: section1.id } });
  for (const student of studentsSec1) {
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: student.id, classId: class1.id } }
    });
    if (!existing) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: class1.id
        }
      });
      console.log(`Enrolled student ${student.name} in Class 1`);
    }
  }

  // Enroll all students from section 2 into class 2
  const studentsSec2 = await prisma.student.findMany({ where: { sectionId: section2.id } });
  for (const student of studentsSec2) {
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: student.id, classId: class2.id } }
    });
    if (!existing) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: class2.id
        }
      });
      console.log(`Enrolled student ${student.name} in Class 2`);
    }
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
