# Use Node.js LTS base image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy only the package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Optional: Set environment variables (if needed)
# ENV NODE_ENV=production

# Build the app
RUN npm run build

# Expose application port
EXPOSE 80

# Start the application
CMD ["node", "dist/main.js"]
