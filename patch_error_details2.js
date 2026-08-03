const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

serverCode = serverCode.replace(
  /res\.status\(500\)\.json\(\{ error: "Failed to start orchestration pipeline\.", details: error\.message \|\| error \}\);/,
  `res.status(500).json({ error: "Failed to start orchestration pipeline. DETAILS: " + JSON.stringify(error) });`
);

// Also remove the logs array from the insert payload to see if that was the cause of the DB error
serverCode = serverCode.replace(
  /logs: \[\{ agent: 'System', log: 'Orchestration queued\. Awaiting available AI worker\.\.\.', timestamp: new Date\(\)\.toISOString\(\) \}\]/,
  `// logs omitted to prevent potential JSONB[] type mismatch`
);

fs.writeFileSync('server.js', serverCode);
console.log('Modified server.js to stringify error details and omit logs');
