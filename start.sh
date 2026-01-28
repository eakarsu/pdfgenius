#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}    PDFGenius Local Startup${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""

# 1. Kill processes on used ports
echo -e "${YELLOW}[1/5] Cleaning up ports...${NC}"
kill -9 $(lsof -ti:3000) 2>/dev/null && echo "  - Killed process on port 3000" || echo "  - Port 3000 is free"
kill -9 $(lsof -ti:3001) 2>/dev/null && echo "  - Killed process on port 3001" || echo "  - Port 3001 is free"

# 2. Check PostgreSQL
echo -e "${YELLOW}[2/5] Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    echo "  - PostgreSQL client found"
else
    echo -e "${RED}  PostgreSQL not found. Please install PostgreSQL.${NC}"
    echo "  On macOS: brew install postgresql@15"
    exit 1
fi

# 3. Create database if not exists
echo -e "${YELLOW}[3/5] Setting up database...${NC}"
createdb pdfgenius 2>/dev/null && echo "  - Database 'pdfgenius' created" || echo "  - Database 'pdfgenius' already exists"

# 4. Install dependencies if needed
echo -e "${YELLOW}[4/5] Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "  - Installing dependencies..."
    yarn install
else
    echo "  - Dependencies already installed"
fi

# Create data directories
mkdir -p data uploads outputs

# 5. Sync database and seed
echo -e "${YELLOW}[5/5] Syncing database and seeding...${NC}"
node -e "
const { sequelize } = require('./src/config/database');
const models = require('./src/models');

async function setup() {
    try {
        await sequelize.sync({ alter: true });
        console.log('  - Database synchronized');

        // Run seed
        const seed = require('./src/seeds/seed');
        await seed();
    } catch (error) {
        console.error('  - Setup error:', error.message);
        process.exit(1);
    }
}
setup().then(() => {
    console.log('  - Setup complete');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
"

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}    Starting PDFGenius...${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:3000"
echo -e "  ${BLUE}Backend:${NC}   http://localhost:3001"
echo ""
echo -e "  ${YELLOW}Demo Login:${NC}"
echo -e "    Email:    demo@pdfgenius.com"
echo -e "    Password: demo123"
echo ""

# Start with concurrently
yarn dev
