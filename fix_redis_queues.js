const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace(
  /agentExecutionQueue = new Queue\('agent_execution', \{ connection: redisConnection \}\);/,
  `agentExecutionQueue = new Queue('agent_execution', { connection: redisConnection });
    agentExecutionQueue.on('error', () => {});`
);
fs.writeFileSync('server.js', serverCode);

let workersCode = fs.readFileSync('workers.js', 'utf8');
workersCode = workersCode.replace(
  /activeQueues\[qName\] = new Queue\(qName, \{ connection: redisConnection \}\);/g,
  `activeQueues[qName] = new Queue(qName, { connection: redisConnection });
      activeQueues[qName].on('error', () => {});`
);
fs.writeFileSync('workers.js', workersCode);

console.log('Fixed Queue error handlers');
