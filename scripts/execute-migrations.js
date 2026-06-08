#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase PostgreSQL connection string — read from environment variable
// For local dev:  DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
// For production: DATABASE_URL=postgresql://postgres:PASSWORD@db:5432/postgres
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  console.error('  Usage: DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres node scripts/execute-migrations.js');
  process.exit(1);
}

// Migration SQL files
const migrations = [
  {
    name: '20240519000000_fix_auth_trigger_conflict',
    file: './supabase/migrations/20240519000000_fix_auth_trigger_conflict.sql'
  },
  {
    name: '20240523000000_create_admin_user',
    file: './supabase/migrations/20240523000000_create_admin_user.sql'
  },
  {
    name: '20240524000000_create_workout_tracking_schema',
    file: './supabase/migrations/20240524000000_create_workout_tracking_schema.sql'
  },
  {
    name: '20240525000000_seed_exercises_with_translations',
    file: './supabase/migrations/20240525000000_seed_exercises_with_translations.sql'
  },
  {
    name: '20240526000000_create_routines_body_stats',
    file: './supabase/migrations/20240526000000_create_routines_body_stats.sql'
  }
];

async function executeMigration(client, sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*[\s\S]*?\*\/$/));
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.trim()) {
      try {
        await client.query(statement);
        console.log(`  ✓ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Check if it's an idempotent error (object already exists)
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`  ⊘ Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          console.error(`  ✗ Statement ${i + 1}/${statements.length} failed:`, error.message);
          throw error;
        }
      }
    }
  }
}

async function runMigrations() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('✓ Connected successfully\n');
    
    console.log('Starting migration execution...\n');
    
    for (const migration of migrations) {
      console.log(`Executing migration: ${migration.name}`);
      
      try {
        const sql = fs.readFileSync(path.join(__dirname, migration.file), 'utf8');
        console.log(`  SQL loaded from ${migration.file}`);
        
        await executeMigration(client, sql);
        
        console.log(`✓ Migration ${migration.name} completed successfully\n`);
      } catch (error) {
        console.error(`✗ Migration ${migration.name} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('All migrations executed successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

runMigrations();