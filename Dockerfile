# Production Nginx Server container
FROM nginx:alpine

# Copy static assets to nginx folder
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY mockData.js /usr/share/nginx/html/

# Expose port 80 for production serving
EXPOSE 80

# Start server
CMD ["nginx", "-g", "daemon off;"]
