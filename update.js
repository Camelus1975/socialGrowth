const fs = require('fs');
let content = fs.readFileSync('aiGatewayRouter.js', 'utf8');

const regex = /router\.post\('\/generate-video', async \(req, res\) => \{[\s\S]*?const \{ prompt, type, appId \} = req\.body;/;
content = content.replace(regex, outer.post('/generate-video', async (req, res) => {
  // Ensure authentication
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized: Missing user context' });
  }

  try {
    const userId = req.user.id;
    const { prompt, type, appId, duration } = req.body;
);

fs.writeFileSync('aiGatewayRouter.js', content);
console.log("Updated body destruct");
