# PlebOne Production Deployment Guide

This guide covers deploying PlebOne to production using Docker and Caddy reverse proxy.

## Prerequisites

- Docker and Docker Compose installed
- Caddy reverse proxy running with Docker integration
- Domain `pleb.one` pointed to your server

## Quick Deployment

1. **Set up environment variables:**
   ```bash
   cp .env.prod.example .env.prod
   ```

2. **Edit `.env.prod` and update:**
   - `DB_PASSWORD`: Set a secure database password
   - The `ADMIN_PUBKEYS` is already configured for your Nostr key

3. **Deploy:**
   ```bash
   ./deploy.sh
   ```

Your site will be available at `https://pleb.one`

## Environment Variables

- `DB_PASSWORD`: Secure password for PostgreSQL database
- `ADMIN_PUBKEYS`: Hex-encoded Nostr public key for admin access (already configured)
- `DOMAIN`: Your domain name (pleb.one)
- `NODE_ENV`: Set to 'production'
- `PORT`: Application port (3000)

## Admin Authentication

Admin access is secured using Nostr authentication. The system uses your provided nsec key:
- **nsec**: `nsec1wrfvr4jaukknvc2ckdeqc8s3m7t697zqc6nca6y02f5e73p3vmxq5qeg49` (keep this secure!)
- **npub**: `npub13hyx3qsqk3r7ctjqrr49uskut4yqjsxt8uvu4rekr55p08wyhf0qq90nt7`
- **Public key (hex)**: `8dc8688200b447ec2e4018ea5e42dc5d480940cb3f19ca8f361d28179dc4ba5e`

**⚠️ SECURITY WARNING**: Keep your nsec private key secure. Never commit it to version control or share it publicly.

## Docker Network Integration

The application is configured to work with Caddy Docker Proxy:
- Connects to external `caddy` network
- Uses Docker labels for automatic Caddy configuration
- Exposes port 3000 internally to Caddy

## Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
./deploy.sh

# Database migrations (if needed)
docker-compose -f docker-compose.prod.yml exec app npm run migration:run
```

## Troubleshooting

### Services won't start
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Ensure Caddy network exists: `docker network create caddy`
- Verify environment variables in `.env.prod`

### Database connection issues
- Ensure PostgreSQL container is healthy
- Check database credentials in `.env.prod`
- Verify network connectivity between containers

### Caddy not routing traffic
- Ensure Caddy Docker Proxy is running
- Check Docker labels in `docker-compose.prod.yml`
- Verify domain DNS points to your server

## Manual Caddy Configuration

If using manual Caddy configuration instead of Docker labels, use the provided `Caddyfile` as reference.

## Security Notes

1. **Database**: Uses strong password protection
2. **Admin Access**: Secured with Nostr cryptographic authentication
3. **HTTPS**: Automatically provided by Caddy
4. **Network**: Isolated Docker networks for security
5. **Headers**: Security headers configured in Caddy

## Backup

Important data to backup:
- PostgreSQL data volume: `plebone_postgres_data`
- Environment configuration: `.env.prod`
- Application code and configuration files