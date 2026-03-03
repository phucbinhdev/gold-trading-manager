import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const tables = [
  'transactions',
  'app_settings',
  'budget_months',
  'budget_expenses',
  'wishlist',
  'diary'
];

async function backup() {
  const date = new Date().toISOString().split('T')[0];
  const backupDir = `./supabase/backups/${date}`;
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const table of tables) {
    console.log(`Backing up table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    
    if (error) {
      console.error(`Error backing up ${table}:`, error.message);
      continue;
    }

    fs.writeFileSync(`${backupDir}/${table}.json`, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} rows to ${table}.json`);
  }
}

backup().catch(console.error);
