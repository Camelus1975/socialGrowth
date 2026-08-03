const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const startStr = "try {\n      // 1. Create a tracking record in orchestration_jobs";
const startIdx = code.indexOf(startStr);
if (startIdx === -1) { console.log("start not found"); process.exit(1); }

const endStr = "res.status(500).json({ error: \"Failed to start orchestration pipeline. DETAILS: \" + JSON.stringify(error) });\n  }";
const endIdx = code.indexOf(endStr, startIdx);
if (endIdx === -1) { console.log("end not found"); process.exit(1); }

const newBlock = fs.readFileSync('patch_trigger.js', 'utf8');
const newCode = code.substring(0, startIdx) + newBlock + code.substring(endIdx + endStr.length);
fs.writeFileSync('server.js', newCode);
console.log("Patched!");
