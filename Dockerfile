FROM node:18-alpine

WORKDIR /app

# Copy package file and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
