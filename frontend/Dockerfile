# /frontend/Dockerfile
FROM node:14

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
RUN npm test

# Copy the rest of the app
COPY . .

# Build the React app
RUN npm run build

# Install serve to serve the build
RUN npm install -g serve

# Start the app
CMD ["serve", "-s", "build", "-l", "3000"]
