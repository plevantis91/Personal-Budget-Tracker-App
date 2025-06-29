#!/bin/bash

echo "🚀 Setting up Personal Budget Tracker..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install-all

echo "🗄️ Setting up database..."
echo "Please make sure PostgreSQL is running and create a database named 'personal_budget'"
echo "You can do this by running: createdb personal_budget"

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating environment file..."
    cat > backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_budget
DB_USER=postgres
DB_PASSWORD=password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=development
EOF
    echo "✅ Environment file created. Please update the database credentials in backend/.env"
fi

echo "🔧 Initializing database schema..."
cd backend && node scripts/setup-db.js && cd ..

echo "✅ Setup completed!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "The application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:5000"
