require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const { URL } = require('url');

async function setup() {
  const dbUrl = process.env.DATABASE_URL;
  const urlParams = new URL(dbUrl);
  
  const targetDbName = urlParams.pathname.slice(1);
  urlParams.pathname = '/postgres';
  const postgresUrl = urlParams.toString();

  console.log('🔗 Connecting to default postgres db...');
  const client = new Client({
    connectionString: postgresUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected. Checking if ${targetDbName} database exists...`);
    const res = await client.query(`SELECT datname FROM pg_database WHERE datname = $1`, [targetDbName]);
    
    if (res.rowCount === 0) {
      console.log(`🏗️ Creating database "${targetDbName}"...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log('✅ Database created.');
    } else {
      console.log(`✅ Database "${targetDbName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Error creating database:', err.message);
  } finally {
    await client.end();
  }

  console.log(`🔗 Connecting to ${targetDbName} db to run schema...`);
  const schemaClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await schemaClient.connect();
    const schemaSql = fs.readFileSync('schema.sql', 'utf8');
    console.log('🏗️ Executing schema.sql...');
    await schemaClient.query(schemaSql);
    console.log('✅ Schema executed successfully.');
  } catch(err) {
    console.error('❌ Error executing schema:', err.message);
  } finally {
    await schemaClient.end();
  }
}

setup();
