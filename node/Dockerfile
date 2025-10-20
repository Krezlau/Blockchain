# --- STAGE 1: Build the Application ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install dependencies (including dev for building)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# 🚨 Ensure the destination directory exists (Optional, but safe)
# This will prevent the "dist: not found" error if the build output is empty
RUN mkdir -p dist

# 🚨 Run the TypeScript compilation. Errors here halt the build immediately.
RUN npm run build

# --- STAGE 2: Run the Application (Leaner Image) ---
FROM node:20-alpine
WORKDIR /usr/src/app

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy the compiled output from the builder stage
# This step is now guaranteed to find the 'dist' directory.
COPY --from=builder /usr/src/app/dist ./dist

# Run the compiled JavaScript
CMD [ "node", "dist/node.js" ]
