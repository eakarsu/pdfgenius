# Use Node.js Alpine as the base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for native Node modules (if any during yarn install)
# and runtime dependencies like LibreOffice and Poppler utilities.
# Alpine uses 'apk' as its package manager.
RUN apk update && \
    apk add --no-cache \
    # Common build tools often needed for 'yarn install' if native modules are compiled
    build-base \
    python3 \
    # Runtime dependencies for your application
    poppler-utils \
    libreoffice \
    # Common fonts for LibreOffice to prevent issues with missing characters
    # You might need to add more specific font packages depending on your documents
    ttf-dejavu
    # Note: LibreOffice on Alpine might require a Java Runtime Environment (JRE)
    # like openjdk17-jre-headless or similar if it's not pulled in automatically
    # by the libreoffice package and you encounter issues.
    # Add it here if needed, e.g., 'openjdk17-jre-headless'

# Copy package.json and yarn.lock
COPY package.json yarn.lock* ./

# Install dependencies
# The build-base and python3 installed above should help if any packages need native compilation
RUN yarn install

# Copy the rest of the application
# Ensure you have a comprehensive .dockerignore file to avoid copying unnecessary files
COPY . .

# Expose the port your React app runs on
EXPOSE 3000
EXPOSE 3001

# Start the development server
CMD ["yarn", "dev"]

