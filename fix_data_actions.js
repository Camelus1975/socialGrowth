const fs = require('fs');
const filePath = 'k:/app socialmedia growth/index.html';
let html = fs.readFileSync(filePath, 'utf8');

// Convert data-on-click="fn(args)" to data-action="fn" data-args="arg1|arg2"
html = html.replace(/data-on-click="([a-zA-Z0-9_]+)\((.*?)\)"/g, (match, fn, args) => {
  if (!args.trim()) return `data-action="${fn}"`;
  
  let cleanArgs = args.split(',').map(a => {
    let t = a.trim();
    if (t === 'this' || t === 'event') return t;
    if (t.startsWith("'") || t.startsWith('"')) return t.slice(1, -1);
    return t;
  }).join('|');
  
  return `data-action="${fn}" data-args="${cleanArgs}"`;
});

// Convert data-on-click="fn" without parentheses
html = html.replace(/data-on-click="([a-zA-Z0-9_]+)"/g, 'data-action="$1"');

fs.writeFileSync(filePath, html);
console.log('Fixed data-actions in index.html');
