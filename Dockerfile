# Use Node.js as the base image
FROM node:22-bullseye

# Set working directory
WORKDIR /app

# Install LibreOffice and Poppler utilities
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    poppler-utils \
    libreoffice \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and yarn.lock
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install

# Copy the rest of the application
COPY . .

# Expose the port your React app runs on
EXPOSE 3000
EXPOSE 3001

# Start the development server
CMD ["yarn", "dev"]

