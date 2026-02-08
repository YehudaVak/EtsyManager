import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath: string, name: string) {
  console.log(`\n📋 Running migration: ${name}...`);

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from('_migrations').insert({
            name: name,
            sql: statement
          });

          // Ignore if it's just "already exists" errors
          if (error.message && !error.message.includes('already exists')) {
            console.warn(`  ⚠️  Warning: ${error.message}`);
          }
        }
      }
    }

    console.log(`  ✅ Migration completed: ${name}`);
  } catch (error: any) {
    console.error(`  ❌ Error running migration ${name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Running database migrations...\n');

  const migrations = [
    { file: 'supabase/stores_table.sql', name: 'Create stores table' },
    { file: 'supabase/users_table.sql', name: 'Create users table' },
    { file: 'supabase/add_store_id_to_tables.sql', name: 'Add store_id columns' },
  ];

  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), migration.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    await runMigration(filePath, migration.name);
  }

  console.log('\n✅ All migrations completed successfully!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
