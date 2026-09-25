import { Client } from 'pg';

async function createDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:YourNewPassword123!@localhost:5432/postgres'
  });
  
  try {
    await client.connect();
    console.log('Connected to postgres db');
    const res = await client.query('SELECT datname FROM pg_database WHERE datname = \'attendance\'');
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE attendance');
      console.log('Database attendance created successfully');
    } else {
      console.log('Database attendance already exists');
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.end();
  }
}

createDb();
