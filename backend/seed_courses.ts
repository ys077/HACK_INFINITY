import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const courseData = {
  'Cyber Security': [
    { name: 'B.Tech Cyber Security', code: 'BTCY' },
    { name: 'M.Tech Cyber Security', code: 'MTCY' }
  ],
  'Computer and Communication Engineering': [
    { name: 'B.Tech Computer and Communication', code: 'BTCCE' }
  ],
  'Mechanical Engineering': [
    { name: 'B.Tech Mechanical Engineering', code: 'BTME' },
    { name: 'B.Tech Automobile Engineering', code: 'BTAE' }
  ],
  'Civil Engineering': [
    { name: 'B.Tech Civil Engineering', code: 'BTCE' }
  ],
  'Artificial Intelligence and Machine Learning': [
    { name: 'B.Tech Artificial Intelligence & ML', code: 'BTAIML' }
  ],
  'Artificial Intelligence and Data Science': [
    { name: 'B.Tech Artificial Intelligence & DS', code: 'BTAIDS' }
  ],
  'Electrical and Electronics Engineering': [
    { name: 'B.Tech Electrical & Electronics', code: 'BTEEE' }
  ],
  'Electronics and Communication Engineering': [
    { name: 'B.Tech Electronics & Communication', code: 'BTECE' },
    { name: 'M.Tech VLSI Design', code: 'MTVLSI' }
  ]
};

async function main() {
  console.log('Seeding more courses...');
  const departments = await prisma.department.findMany();
  
  if (departments.length === 0) {
    console.error('No departments found. Cannot seed courses.');
    return;
  }

  for (const dept of departments) {
    const coursesToAdd = courseData[dept.name as keyof typeof courseData] || [];
    
    for (const cData of coursesToAdd) {
      let course = await prisma.course.findUnique({ where: { code: cData.code } });
      if (!course) {
        course = await prisma.course.create({
          data: {
            name: cData.name,
            code: cData.code,
            departmentId: dept.id
          }
        });
        console.log(`Created course: ${course.name}`);
        
        // Let's create some sections for this course as well to make it usable
        const sectionNames = ['A', 'B', 'C'];
        for (const sName of sectionNames) {
          await prisma.section.upsert({
            where: {
              name_courseId_year: {
                name: sName,
                courseId: course.id,
                year: 1
              }
            },
            update: {},
            create: {
              name: sName,
              year: 1,
              courseId: course.id
            }
          });
        }
        console.log(`  -> Added Sections A, B, C for ${course.name}`);
      } else {
        console.log(`Course ${course.name} already exists.`);
      }
    }
  }

  console.log('Done adding courses and sections!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
