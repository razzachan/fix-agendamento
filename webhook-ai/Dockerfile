# Use Node.js 18 with system packages - Force rebuild
FROM node:18-bullseye

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip Chromium download)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV WA_HEADLESS=true
ENV PUPPETEER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu"

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
