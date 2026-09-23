# Hosting: paragonmedia.io + admin.paragonmedia.io

## Hostnames

| Host | Serves |
|------|--------|
| `paragonmedia.io` / `www.paragonmedia.io` | Company marketing site (`/var/www/paragonmedia-io`) |
| `admin.paragonmedia.io` | Portal FE (`/var/www/paragon-fe/dist`) + `/api` → `:3000` |
| `admin.pgnmapprovedlander.com` | Same portal (legacy) |
| `138.68.231.226` | Same portal (direct IP; keep for now) |

## GoDaddy DNS (paragonmedia.io)

Point these **A** records to `138.68.231.226`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `138.68.231.226` | 600 (or default) |
| A | `www` | `138.68.231.226` | 600 |
| A | `admin` | `138.68.231.226` | 600 |

After DNS propagates, issue TLS:

```bash
certbot --nginx -d paragonmedia.io -d www.paragonmedia.io -d admin.paragonmedia.io
```

## Smoke tests

```bash
# Company site (after DNS)
curl -sI -H 'Host: paragonmedia.io' http://138.68.231.226/ | head -5
curl -sI https://paragonmedia.io/ | head -5

# Portal on admin host
curl -sI -H 'Host: admin.paragonmedia.io' http://138.68.231.226/ | head -5
curl -sI https://admin.paragonmedia.io/ | head -5

# API proxy
curl -sI -H 'Host: admin.paragonmedia.io' http://138.68.231.226/api/v1/health
# or whatever health/login probe the BE exposes
```

Browser:

1. https://paragonmedia.io — company 1-pager
2. https://admin.paragonmedia.io — login + API calls same-origin `/api/...`
3. http://138.68.231.226 — portal still works

## Deploy notes

- Nginx config source: `deploy/nginx-paragon-fe.conf`
- Company site files: `company-site/` → `/var/www/paragonmedia-io/`
- Portal rebuild: `cd /var/www/paragon-fe && npm ci && npm run build` (after pulling FE with `src/config/api.js` same-origin fix)
