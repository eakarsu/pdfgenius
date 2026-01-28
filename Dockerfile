# Use Node.js Alpine as the base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install build dependencies and runtime dependencies
RUN apk update && \
    apk add --no-cache \
    build-base \
    python3 \
    poppler-utils \
    libreoffice \
    ttf-dejavu \
    openjdk17-jre-headless \
    fontconfig \
    ttf-liberation

# Set Java environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH=$JAVA_HOME/bin:$PATH

# Pre-configure LibreOffice Java settings
RUN mkdir -p /root/.config/libreoffice/4/user/config && \
    echo '<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><item oor:path="/org.openoffice.Office.Java/VirtualMachine"><prop oor:name="Home" oor:op="fuse"><value>/usr/lib/jvm/java-17-openjdk</value></prop></item></oor:items>' > /root/.config/libreoffice/4/user/config/javasettings_Linux_x86_64.xml

# Copy package.json and yarn.lock
COPY package.json yarn.lock* ./

# Install dependencies (including uuid for unique directories)
RUN yarn add uuid && yarn install

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p uploads outputs temp /tmp src/services src/middleware src/utils src/routes

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start the development server
CMD ["yarn", "dev"]
