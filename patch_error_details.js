const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

serverCode = serverCode.replace(
  /res\.status\(500\)\.json\(\{ error: "Failed to start orchestration pipeline\." \}\);/,
  `res.status(500).json({ error: "Failed to start orchestration pipeline.", details: error.message || error });`
);

fs.writeFileSync('server.js', serverCode);
console.log('Modified server.js to return detailed errors');
