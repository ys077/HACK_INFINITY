import { execSync } from 'child_process';

export async function setup() {
  console.log('Running database seed before tests...');
  execSync('npx tsx prisma/seed.ts', { 
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' }
  });
  console.log('Seed completed.');
}
