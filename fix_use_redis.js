const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace(
  /const useRedis = !!process\.env\.REDIS_URL \|\| !IS_PRODUCTION;/,
  `const useRedis = !!process.env.REDIS_URL;`
);
fs.writeFileSync('server.js', serverCode);

let workersCode = fs.readFileSync('workers.js', 'utf8');
workersCode = workersCode.replace(
  /const useRedis = !!config\.REDIS_URL \|\| process\.env\.NODE_ENV !== 'production';/,
  `const useRedis = !!config.REDIS_URL;`
);
fs.writeFileSync('workers.js', workersCode);

console.log('Fixed useRedis condition');
