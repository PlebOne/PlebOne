# PlebOne Deployment Summary

## ✅ Deployment Complete!

Your PlebOne site is now successfully deployed and accessible at **https://pleb.one**

## Deployment Configuration

### Infrastructure
- **Domain**: pleb.one
- **Reverse Proxy**: Caddy (via infrastructure/Caddyfile)
- **Application Server**: NestJS on Node.js 20
- **Database**: PostgreSQL 16 (Alpine)
- **Container Orchestration**: Docker Compose

### Network Configuration
- **Network**: pleb-services (shared with other apps)
- **Application Port**: 3000 (internal)
- **Exposed Ports**: 80 (HTTP) → 443 (HTTPS) via Caddy

### Security Features
1. **HTTPS**: Automatic SSL/TLS via Caddy with Let's Encrypt
2. **Admin Authentication**: Nostr-based cryptographic authentication
3. **Security Headers**: X-Frame-Options, X-Content-Type-Options, XSS-Protection, etc.
4. **Database**: Strong password protection (64-char hex password)
5. **Network Isolation**: Separate Docker networks for security

## Admin Access

### Nostr Credentials
Your admin access is secured using Nostr authentication:

- **nsec (Private Key)**: Stored in `.credentials.secure` file
- **npub (Public Key)**: `npub13hyx3qsqk3r7ctjqrr49uskut4yqjsxt8uvu4rekr55p08wyhf0qq90nt7`
- **Hex Public Key**: `8dc8688200b447ec2e4018ea5e42dc5d480940cb3f19ca8f361d28179dc4ba5e`

### How to Login as Admin
1. Install a Nostr browser extension (like nos2x, Alby, or similar)
2. Import your nsec key into the extension
3. Visit https://pleb.one/admin.html
4. The application will authenticate using your Nostr signature

⚠️ **CRITICAL**: Your nsec is stored in `.credentials.secure` - keep this file backed up and secure!

## Container Status

```bash
# Running containers:
- plebone-app-prod (Application)
- plebone-postgres-prod (Database)

# Networks:
- plebone_plebone-network (internal)
- pleb-services (external, shared with Caddy)
```

## Useful Commands

```bash
# View application logs
docker compose -f docker-compose.prod.yml logs -f app

# View database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild and redeploy
./deploy.sh

# Database migrations
docker compose -f docker-compose.prod.yml exec app npm run migration:run

# Access database directly
docker compose -f docker-compose.prod.yml exec postgres psql -U plebone -d plebone
```

## Files and Locations

### Secure Files (NOT in version control)
- `.env.prod` - Production environment variables
- `.credentials.secure` - Nostr keys and credentials (chmod 600)

### Configuration Files
- `docker-compose.prod.yml` - Production Docker Compose config
- `/home/plebone/infrastructure/Caddyfile` - Caddy reverse proxy config
- `deploy.sh` - Deployment automation script

### Application Code
- `src/` - NestJS application source code
- `public/` - Static HTML/CSS/JS files
- `dist/` - Compiled application (in container)

## Caddy Configuration

The site is configured in the main Caddyfile at `/home/plebone/infrastructure/Caddyfile`:

```caddy
pleb.one {
    reverse_proxy plebone-app-prod:3000
    header { ... }
    encode gzip zstd
    log { ... }
}
```

To reload Caddy after configuration changes:
```bash
docker exec infrastructure-caddy caddy reload --config /etc/caddy/Caddyfile
```

## Backup Recommendations

### Critical Data to Backup
1. **Database Volume**: `plebone_postgres_data`
   ```bash
   docker run --rm -v plebone_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/plebone-db-backup.tar.gz /data
   ```

2. **Environment Configuration**: `.env.prod`
3. **Credentials**: `.credentials.secure`
4. **Application Code**: Git repository

### Backup Schedule
- Database: Daily
- Configuration files: After each change
- Full application: Weekly

## Monitoring

### Health Check Endpoints
- Application: https://pleb.one/health (returns "PlebOne OK")
- API Status: https://pleb.one/api/blog (should return blog posts)

### Logs
- Application logs: `docker compose -f docker-compose.prod.yml logs app`
- Caddy access logs: `/home/plebone/infrastructure/caddy/logs/plebone.log` (in container)
- Caddy container: `docker logs infrastructure-caddy`

## Troubleshooting

### Site not accessible
1. Check if containers are running: `docker ps | grep plebone`
2. Check Caddy configuration: `docker exec infrastructure-caddy caddy validate --config /etc/caddy/Caddyfile`
3. Test internal connectivity: `docker exec infrastructure-caddy wget -O- http://plebone-app-prod:3000`

### Database connection issues
1. Check database health: `docker compose -f docker-compose.prod.yml ps postgres`
2. Verify credentials in `.env.prod` match
3. Check application logs for connection errors

### Admin authentication not working
1. Verify ADMIN_PUBKEYS in `.env.prod` matches your nsec's public key
2. Ensure Nostr extension has the correct nsec imported
3. Check browser console for authentication errors
4. Verify event timestamp is within 5 minutes (check server time)

## Next Steps

1. ✅ Site is live at https://pleb.one
2. Test admin authentication at https://pleb.one/admin.html
3. Create your first blog post via the admin panel
4. Add your projects via the projects admin panel
5. Set up automated backups
6. Configure monitoring/alerting (optional)

## Support

- Application logs: `docker compose -f docker-compose.prod.yml logs -f`
- System logs: `journalctl -u docker`
- Caddy documentation: https://caddyserver.com/docs/

---

**Deployed on**: November 10, 2025
**Node.js Version**: 20.19.5 (via mise)
**Docker Compose Version**: Modern (v2+)
**PostgreSQL Version**: 16-alpine
