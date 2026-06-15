// App Founder Growth Suite - Config Validator
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'ENCRYPTION_SECRET',
  'ENCRYPTION_SALT'
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

// Warn about optional but important keys
const optionalKeys = ['OPENAI_API_KEY', 'REDIS_URL', 'SUPABASE_SERVICE_KEY'];
optionalKeys.forEach(key => {
  if (!process.env[key]) {
    console.warn(`WARNING: ${key} is not set. Some features will be unavailable.`);
  }
});

module.exports = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
  ENCRYPTION_SALT: process.env.ENCRYPTION_SALT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : undefined,
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
  META_REDIRECT_URI: process.env.META_REDIRECT_URI,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  PORT: process.env.PORT || 3000
};
