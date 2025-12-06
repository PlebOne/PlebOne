#!/bin/bash

# PlebOne Production Deployment Script
# This script deploys PlebOne to production using Docker and Caddy

set -e  # Exit on any error

echo "🚀 Starting PlebOne production deployment..."

# Check if .env.prod exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please create .env.prod with your production environment variables."
    echo "See .env.prod.example for reference."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.prod | xargs)

# Validate required environment variables
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your_secure_database_password_here" ]; then
    echo "❌ Error: Please set a secure DB_PASSWORD in .env.prod"
    exit 1
fi

if [ -z "$ADMIN_PUBKEYS" ]; then
    echo "❌ Error: ADMIN_PUBKEYS not set in .env.prod"
    exit 1
fi

echo "✅ Environment variables validated"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true

# Remove old images to ensure fresh build
echo "🗑️  Removing old images..."
docker image rm plebone-app:latest || true

# Build and start services
echo "🔨 Building and starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Services are running!"
    
    # Show running containers
    echo "📊 Running containers:"
    docker compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "🌐 Your site should be available at: https://pleb.one"
    echo "🔑 Admin access is secured with your Nostr key"
    echo ""
    echo "📋 Useful commands:"
    echo "  View logs: docker compose -f docker-compose.prod.yml logs -f"
    echo "  Stop: docker compose -f docker-compose.prod.yml down"
    echo "  Restart: docker compose -f docker-compose.prod.yml restart"
else
    echo "❌ Services failed to start. Check logs:"
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi