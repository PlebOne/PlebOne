# PlebOne - Testing Summary

## ✅ Successfully Running!

The PlebOne site is now operational at: **http://localhost:3000**

### What's Working:

1. **Backend (NestJS)**
   - ✅ PostgreSQL database connected (port 5433)
   - ✅ Blog posts API endpoints
   - ✅ Projects API endpoints
   - ✅ Admin API endpoints with Nostr NIP-07 auth
   - ✅ Database tables auto-created (blog_posts, projects)

2. **Frontend**
   - ✅ Main landing page
   - ✅ About page
   - ✅ Projects page (dynamic loading)
   - ✅ Blog page (date + title listing)
   - ✅ Donations page
   - ✅ Admin panel (with Nostr login)

3. **Design**
   - ✅ Cypherpunk/SpecOps dark theme
   - ✅ Green accent color (#00ff41)
   - ✅ Minimalist, text-centric layout
   - ✅ Monospace fonts
   - ✅ No cards, clean lines

### Current Setup:

```
Database: PostgreSQL (Podman container)
  - Port: 5433
  - Container: plebone-test-db
  - User: plebone
  - Database: plebone

Application: NestJS
  - Port: 3000
  - Mode: Development (hot-reload enabled)
  - Process: Background (PID in /tmp/plebone.log)
```

### Test the Site:

1. **Main Site**: http://localhost:3000
2. **Blog**: http://localhost:3000/blog.html
3. **Projects**: http://localhost:3000/projects.html
4. **Admin**: http://localhost:3000/admin.html
   - Requires Nostr extension (nos2x, Alby, etc.)
   - Your pubkey must be in ADMIN_PUBKEYS in .env

### API Testing:

```bash
# Get blog posts
curl http://localhost:3000/api/blog

# Get projects
curl http://localhost:3000/api/projects

# Get auth challenge
curl http://localhost:3000/api/auth/challenge
```

### Admin Access:

To use the admin panel:
1. Install a Nostr browser extension (nos2x or Alby)
2. Get your Nostr pubkey (hex format)
3. Add it to `.env`: `ADMIN_PUBKEYS=your_hex_pubkey_here`
4. Restart the app
5. Go to http://localhost:3000/admin.html
6. Click "SIGN IN WITH NOSTR"

### Managing the App:

```bash
# View logs
tail -f /tmp/plebone.log

# Stop the app
pkill -f "npm run start:dev"

# Restart
npm run start:dev > /tmp/plebone.log 2>&1 &

# Stop database
podman stop plebone-test-db

# Start database
podman start plebone-test-db
```

### Next Steps:

1. Add your Nostr pubkey to admin access
2. Create some blog posts via admin panel
3. Add your projects
4. Update donation addresses in `public/donations.html`
5. Customize the About page content

### Docker Setup (Future):

The Docker Compose files are ready but need a small fix:
- `docker-compose.yml` - Development
- `docker-compose.prod.yml` - Production
- See `DOCKER.md` for full Docker instructions

---

**PlebOne is live and ready for freedom tech!** 🔐⚡
