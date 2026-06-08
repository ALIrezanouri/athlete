/**
 * Script to create an admin user with email+password authentication
 * Usage: node scripts/create-admin.js <email> <password> <full_name> <role>
 * 
 * Example: node scripts/create-admin.js admin@rokhdad.fit mypassword123 "System Admin" admin
 * 
 * Roles: admin, manager, coach, doctor
 */

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
});

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || 'Admin User';
  const role = process.argv[5] || 'admin';

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password> [full_name] [role]');
    console.error('Roles: admin, manager, coach, doctor');
    process.exit(1);
  }

  const allowedRoles = ['admin', 'gym_manager', 'coach', 'doctor'];
  if (!allowedRoles.includes(role)) {
    console.error(`Invalid role: ${role}. Must be one of: ${allowedRoles.join(', ')}`);
    process.exit(1);
  }

  console.log(`Creating admin user: ${email} (${role})...`);

  // Create user with email+password
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    process.exit(1);
  }

  console.log(`Auth user created with ID: ${authData.user.id}`);

  // Update the profile with role and email
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      full_name: fullName,
      role: role,
      email: email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
    // Try to clean up the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log(`✅ Admin user created successfully!`);
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${fullName}`);
  console.log(`   Role: ${role}`);
  console.log(`   ID: ${authData.user.id}`);
}

createAdmin().catch(console.error);