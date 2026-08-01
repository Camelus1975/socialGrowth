const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY);

// Define tools available to the Agent
const tools = [
  {
    type: "function",
    function: {
      name: "create_business",
      description: "Creates a new business workspace for the user in the database.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the business or brand (e.g., 'MyShoeStore')"
          },
          url: {
            type: "string",
            description: "The website URL of the business (e.g., 'https://myshoestore.com')"
          }
        },
        required: ["name"]
      }
    }
  }
];

router.post('/', async (req, res) => {
  const { message, context, agentType } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Get user from JWT
  let userId = null;
  const token = req.headers.authorization?.split(' ')[1];
  if (token && token !== 'mock-supabase-jwt-token') {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }

  try {
    const messages = [
      { 
        role: "system", 
        content: `You are the Social Growth Copilot, an AI Chief of Staff. You help users manage their social media growth. You can call functions to perform actions on their behalf. If the user asks to add or create a business/brand, use the create_business tool. Speak conversationally and concisely.` 
      },
      { role: "user", content: message }
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // Check if the model wanted to call a function
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.function.name === "create_business") {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute the database mutation
        let dbError = null;
        if (userId) {
          const { error } = await supabase.from('businesses').insert({
            user_id: userId,
            name: args.name,
            website: args.url || null,
            business_type: 'custom',
            category: 'brand'
          });
          dbError = error;
        }

        // Return the final response
        if (dbError) {
          console.error("DB Error creating business:", dbError);
          return res.json({ message: `I tried to add **${args.name}**, but I encountered a database error.` });
        } else {
          return res.json({ message: `Awesome! I've successfully set up the workspace for **${args.name}**${args.url ? ` (${args.url})` : ''}. You can now select it from the workspace dropdown in the top left!` });
        }
      }
    }

    // If no function was called, just return the text response
    return res.json({ message: responseMessage.content });

  } catch (err) {
    console.error("[Agent Router] Error:", err);
    return res.status(500).json({ message: "I encountered an internal error processing your request." });
  }
});

module.exports = router;
