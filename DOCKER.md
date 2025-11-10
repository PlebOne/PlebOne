# Docker Testing Guide for PlebOne

## Prerequisites

Make sure Docker and Docker Compose are installed:

```bash
# Check Docker installation
docker --version
docker compose version
```

## Quick Start with Docker

### 1. Build and Start Services

```bash
# Start in development mode (with hot reload)
docker compose up --build

# Or run in detached mode (background)
docker compose up -d --build
```

This will:
- Create and start PostgreSQL database
- Build and start the PlebOne application
- Expose the app at http://localhost:3000
- Enable hot-reload for development

### 2. View Logs

```bash
# View all logs
docker compose logs -f

# View only app logs
docker compose logs -f app

# View only database logs
docker compose logs -f postgres
```

### 3. Access the Application

- **Main Site**: http://localhost:3000
- **About**: http://localhost:3000/about.html
- **Blog**: http://localhost:3000/blog.html
- **Projects**: http://localhost:3000/projects.html
- **Admin**: http://localhost:3000/admin.html

### 4. Stop Services

```bash
# Stop containers
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Production Mode

For production testing:

```bash
# Build and run production version
docker compose -f docker-compose.prod.yml up --build

# Or in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

## Database Access

### Connect to PostgreSQL

```bash
# Access PostgreSQL shell
docker exec -it plebone-postgres psql -U plebone -d plebone

# Run SQL queries
docker exec -it plebone-postgres psql -U plebone -d plebone -c "SELECT * FROM blog_posts;"
```

### View Database Tables

```bash
docker exec -it plebone-postgres psql -U plebone -d plebone -c "\dt"
```

## Useful Commands

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker compose build app

# Force rebuild everything
docker compose build --no-cache
```

### Execute Commands in Container

```bash
# Access app container shell
docker exec -it plebone-app sh

# Run npm commands
docker exec -it plebone-app npm run build
```

### Monitor Resources

```bash
# View container stats
docker stats

# List running containers
docker ps
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
# For app: "3001:3000"
# For postgres: "5433:5432"
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker compose ps

# View postgres logs
docker compose logs postgres

# Restart services
docker compose restart
```

### Reset Everything

```bash
# Stop all containers and remove volumes
docker compose down -v

# Remove all related images
docker compose down --rmi all

# Start fresh
docker compose up --build
```

## Environment Variables

Set your Nostr pubkey before starting:

```bash
# Linux/Mac
export ADMIN_PUBKEYS=your_nostr_hex_pubkey_here

# Or create .env file (already exists)
echo "ADMIN_PUBKEYS=your_pubkey" >> .env

# Then start
docker compose up
```

## Testing Workflow

1. **Start services**: `docker compose up -d`
2. **Check logs**: `docker compose logs -f app`
3. **Open browser**: http://localhost:3000
4. **Test admin**: http://localhost:3000/admin.html (need Nostr extension)
5. **Create test data**: Add blog posts and projects via admin
6. **View changes**: Changes in `src/` and `public/` auto-reload
7. **Stop**: `docker compose down`

## Notes

- Development mode mounts source code for hot-reload
- PostgreSQL data persists in Docker volume
- First startup may take longer (building + npm install)
- Database initializes automatically on first run
