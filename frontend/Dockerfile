# Frontend Dockerfile - React Application
# v1.2.0-alpha.1

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# node ausführen vermeidet Exit 126 (kein direkter Binary-Aufruf)
CMD ["node", "node_modules/vite/bin/vite.js", "--port", "3000", "--host", "0.0.0.0"]

