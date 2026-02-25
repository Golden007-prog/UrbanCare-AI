FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the port
EXPOSE 8080

# Start the server
ENV PORT=8080
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
