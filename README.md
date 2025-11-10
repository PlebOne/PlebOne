# PlebOne

Open source Nostr tools and freedom tech platform. A spin-off from [11b.Dev](https://11b.dev) focused on building decentralized solutions.

## Features

- **Blog System**: Markdown-based blog with admin management
- **Projects Showcase**: Display and manage open source projects
- **Nostr Authentication**: Admin access via NIP-07 (browser extension signing)
- **Minimalist Design**: Text-centric, cypherpunk-inspired aesthetic
- **RESTful API**: NestJS backend with PostgreSQL
- **No JavaScript Frameworks**: Pure HTML/CSS/JS frontend

## Tech Stack

- **Backend**: NestJS, TypeORM, PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Auth**: Nostr NIP-07 (nos2x, Alby, etc.)
- **Language Runtime**: Node.js managed via Mise

## Prerequisites

- [Mise](https://mise.jdx.dev/) - For Node.js version management
- PostgreSQL 12+ - Database
- Nostr browser extension (nos2x, Alby, etc.) - For admin access

## Setup

### 1. Install Dependencies

```bash
# Mise will automatically install the correct Node version
mise install

# Install npm packages
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
# Using psql
createdb plebone

# Or using SQL
psql -U postgres
CREATE DATABASE plebone;
```

### 3. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=plebone
DB_PASSWORD=your_secure_password
DB_DATABASE=plebone

# Application
PORT=3000
NODE_ENV=development

# Admin Nostr public keys (comma-separated hex pubkeys)
# Get your pubkey from your Nostr extension or client
ADMIN_PUBKEYS=your_nostr_hex_pubkey_here,another_admin_pubkey
```

**Important**: Add your Nostr public key (hex format) to `ADMIN_PUBKEYS` to access the admin panel.

### 4. Run Database Migrations

The app uses TypeORM synchronize in development mode, so tables will be created automatically on first run.

For production, you should:

```bash
# Generate migrations after schema changes
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run
```

## Running the Application

### Development Mode

```bash
npm run start:dev
```

The server will start at `http://localhost:3000` with hot-reload enabled.

### Production Mode

```bash
# Build the application
npm run build

# Run in production
npm run start:prod
```

## Admin Access

1. Visit `http://localhost:3000/admin.html`
2. Install a NIP-07 Nostr browser extension if you haven't already:
   - [nos2x](https://github.com/fiatjaf/nos2x) for Chrome/Brave
   - [Alby](https://getalby.com/) for Chrome/Firefox
   - Or any other NIP-07 compatible extension
3. Click "SIGN IN WITH NOSTR"
4. Approve the signature request in your extension
5. Your pubkey must be in the `ADMIN_PUBKEYS` environment variable

## Project Structure

```
PlebOne/
├── src/
│   ├── admin/          # Admin module with Nostr auth
│   ├── blog/           # Blog posts module
│   ├── projects/       # Projects module
│   ├── config/         # TypeORM and app configuration
│   ├── app.module.ts   # Main application module
│   └── main.ts         # Application entry point
├── public/             # Static frontend files
│   ├── css/           # Cypherpunk-themed styles
│   ├── js/            # Vanilla JavaScript
│   ├── *.html         # Public pages
│   └── admin.html     # Admin interface
├── .mise.toml         # Mise configuration
└── package.json       # Dependencies and scripts
```

## API Endpoints

### Public Endpoints

- `GET /api/blog` - List published blog posts (date & title only)
- `GET /api/blog/:id` - Get full blog post content
- `GET /api/projects` - List active projects

### Admin Endpoints (Require Nostr Auth)

All admin endpoints require `Authorization: Nostr <signed-event-json>` header.

**Blog Posts:**
- `GET /api/admin/blog` - List all posts (including drafts)
- `POST /api/admin/blog` - Create new post
- `PUT /api/admin/blog/:id` - Update post
- `DELETE /api/admin/blog/:id` - Delete post

**Projects:**
- `GET /api/admin/projects` - List all projects
- `POST /api/admin/projects` - Create new project
- `PUT /api/admin/projects/:id` - Update project
- `DELETE /api/admin/projects/:id` - Delete project

## Authentication Flow (NIP-07)

1. User clicks "Sign In" on admin page
2. Browser extension provides user's public key
3. User signs an authentication event (kind 22242)
4. Signed event is sent with each API request in Authorization header
5. Server verifies:
   - Event signature is valid
   - Event timestamp is recent (within 5 minutes)
   - Public key is in authorized admin list

## Customization

### Update Donation Information

Edit `public/donations.html` and replace placeholder addresses with your:
- Lightning address
- Bitcoin address

### Modify Content

- **About Page**: Edit `public/about.html`
- **Styling**: Customize `public/css/style.css` (cypherpunk theme colors in `:root` variables)
- **Admin Pubkeys**: Add authorized users to `.env` file

## Development

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Security Notes

- **Admin Authentication**: Only Nostr pubkeys in `ADMIN_PUBKEYS` can access admin endpoints
- **Event Verification**: All signed events are cryptographically verified
- **Time-based Protection**: Auth events expire after 5 minutes
- **HTTPS Required**: Use HTTPS in production for secure transmission

## License

MIT

## Philosophy

> "Code is speech. Software is freedom."

PlebOne focuses on building tools that respect user privacy, resist censorship, and promote open standards. We're here to build solid, useful software for the Nostr ecosystem—no hype, no token pumping, just freedom tech.

---

**PlebOne** - A spin-off from [11b.Dev](https://11b.dev) | Open Source | Freedom Tech
