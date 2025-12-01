#!/bin/bash

# Script to generate secure secrets for .env file

set -e

echo "🔐 Setting up secure secrets for .env file..."

# Create .env file from template if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env

    # Generate secure passwords
    echo "📝 Generating secure passwords..."
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)

    # Replace placeholders in .env file
    sed -i.bak "s/your_secure_database_password_here/$POSTGRES_PASSWORD/g" .env
    sed -i.bak "s/your_super_secret_jwt_key_here/$JWT_SECRET/g" .env
    rm .env.bak

    echo "✅ .env file created with generated secure passwords"
else
    echo "⚠️  .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Add your API keys to .env file:"
echo "     - OPENAI_API_KEY=your_actual_openai_key"
echo "     - ANTHROPIC_API_KEY=your_actual_anthropic_key"
echo ""
echo "  2. Run your application:"
echo "     docker-compose up"
echo ""
echo "⚠️  Important: Never commit the .env file to version control!"