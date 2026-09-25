import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deptsToCreate = [
    { name: 'Cyber Security', code: 'CSY' },
    { name: 'Computer and Communication Engineering', code: 'CCE' },
    { name: 'Mechanical Engineering', code: 'MECH' },
    { name: 'Civil Engineering', code: 'CIV' },
    { name: 'Artificial Intelligence and Machine Learning', code: 'AIML' },
    { name: 'Artificial Intelligence and Data Science', code: 'AIDS' },
    { name: 'Electrical and Electronics Engineering', code: 'EEE' },
    { name: 'Electronics and Communication Engineering', code: 'ECE' }
  ];

  for (const d of deptsToCreate) {
    console.log(`Processing department: ${d.name}`);
    
    // Create Department
    let dept = await prisma.department.findUnique({ where: { code: d.code } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: d.name, code: d.code }
      });
    }

    // Create a default Course for this department
    const courseCode = `BTech-${d.code}`;
    let course = await prisma.course.findUnique({ where: { code: courseCode } });
    if (!course) {
      course = await prisma.course.create({
        data: { name: `B.Tech ${d.name}`, code: courseCode, departmentId: dept.id }
      });
    }

    // Create Sections A to E for Year 1
    const sections = ['A', 'B', 'C', 'D', 'E'];
    for (const sec of sections) {
      const existingSec = await prisma.section.findFirst({
        where: { name: sec, year: 1, courseId: course.id }
      });
      if (!existingSec) {
        await prisma.section.create({
          data: { name: sec, year: 1, courseId: course.id }
        });
      }
    }
  }

  console.log('Successfully added departments and sections.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
