// App Founder Growth Suite - Config Validator
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'ENCRYPTION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("=========================================================");
  console.error("FATAL CONFIGURATION ERROR: Missing required environment variables.");
  console.error("Please configure the following keys in your .env file:");
  missingEnvVars.forEach(v => console.error(` - ${v}`));
  console.error("=========================================================");
  process.exit(1); // Halt execution immediately
}

module.exports = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
  ENCRYPTION_SALT: process.env.ENCRYPTION_SALT || 'fallback_secure_production_salt',
  PORT: process.env.PORT || 3000
};
