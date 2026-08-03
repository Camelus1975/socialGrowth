const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  let newCode = code.replace(/requestApi\((.*?),\s*'POST',\s*(\{[\s\S]*?\})\s*\)/g, (match, path, bodyObj) => {
    return `requestApi(${path}, { method: 'POST', body: JSON.stringify(${bodyObj}) })`;
  });
  if (code !== newCode) {
    fs.writeFileSync(file, newCode);
    console.log('Fixed ' + file);
  }
}

fixFile('k:/app socialmedia growth/commandCenterModule.js');
fixFile('k:/app socialmedia growth/inboxModule.js');
fixFile('k:/app socialmedia growth/intelligenceDashboardModule.js');
