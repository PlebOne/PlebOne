# PlebOne Quick Reference Card

## 🌐 Site Access
- **Live Site**: https://pleb.one
- **Admin Panel**: https://pleb.one/admin.html

## 🔑 Admin Credentials
- **Location**: `.credentials.secure` (chmod 600)
- **Public Key (npub)**: npub13hyx3qsqk3r7ctjqrr49uskut4yqjsxt8uvu4rekr55p08wyhf0qq90nt7

## 🚀 Common Commands

### Deployment
```bash
./deploy.sh                 # Deploy/redeploy the site
```

### Container Management
```bash
docker compose -f docker-compose.prod.yml ps              # View status
docker compose -f docker-compose.prod.yml logs -f         # View logs
docker compose -f docker-compose.prod.yml restart         # Restart
docker compose -f docker-compose.prod.yml down            # Stop
docker compose -f docker-compose.prod.yml up -d --build   # Start/rebuild
```

### Caddy Management
```bash
docker exec infrastructure-caddy caddy reload --config /etc/caddy/Caddyfile  # Reload
docker exec infrastructure-caddy caddy validate --config /etc/caddy/Caddyfile # Validate
docker logs infrastructure-caddy                                              # View logs
```

### Database Access
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U plebone -d plebone
```

### Logs
```bash
docker compose -f docker-compose.prod.yml logs -f app       # App logs
docker compose -f docker-compose.prod.yml logs -f postgres  # DB logs
docker logs infrastructure-caddy                            # Caddy logs
```

## 📂 Important Files
- `.env.prod` - Environment variables (secure)
- `.credentials.secure` - Nostr keys (chmod 600, secure)
- `docker-compose.prod.yml` - Docker configuration
- `/home/plebone/infrastructure/Caddyfile` - Reverse proxy config
- `DEPLOYMENT_SUMMARY.md` - Full deployment details

## 🔒 Security Notes
- nsec stored in `.credentials.secure` - KEEP SECURE!
- Database password: 64-char hex in `.env.prod`
- Both files excluded from git via `.gitignore`
- Admin access via Nostr signature authentication

## 📊 Health Checks
```bash
curl https://pleb.one/health          # Should return "PlebOne OK"
curl https://pleb.one/api/blog        # Should return blog posts (JSON)
docker ps | grep plebone              # Should show 2 running containers
```

## ⚠️ Troubleshooting
1. Check container status: `docker compose -f docker-compose.prod.yml ps`
2. View application logs: `docker compose -f docker-compose.prod.yml logs -f app`
3. Test Caddy connectivity: `docker exec infrastructure-caddy wget -O- http://plebone-app-prod:3000`
4. Validate Caddy config: `docker exec infrastructure-caddy caddy validate --config /etc/caddy/Caddyfile`

## 📝 Backup
```bash
# Database backup
docker run --rm -v plebone_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/plebone-db-backup.tar.gz /data

# Copy secure files
cp .env.prod .credentials.secure ~/backups/
```
