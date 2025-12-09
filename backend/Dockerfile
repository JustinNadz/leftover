FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY uploads ./uploads

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "src/index.js"]
