const config = require('./config.js');
console.log('Protocol:', config.REDIS_URL ? config.REDIS_URL.split(':')[0] : 'None');
