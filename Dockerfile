# syntax=docker/dockerfile:1

# Use an official Node.js runtime as the base image
FROM node:23.11.0

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Copy the rest of the application code
COPY . .

# Install dependencies
RUN npm install

# Command to run the application
CMD ["npm", "run", "start:prod"]

# Expose port 8000
EXPOSE 3000
