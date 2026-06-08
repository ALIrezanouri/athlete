# Supabase Docker Compose

## Quick Start

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Start all services:
```bash
docker-compose up -d
```

3. Check service status:
```bash
docker-compose ps
```

4. View logs:
```bash
docker-compose logs -f
```

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 54322 | Database |
| API Gateway (Kong) | 54421 | Main API endpoint |
| Studio | 54423 | Admin dashboard |
| Inbucket | 54424 | Email testing UI |
| Realtime | 54427 | WebSocket service |

## Access URLs

- **Studio**: http://localhost:54423
- **API**: http://localhost:54421
- **Email Testing**: http://localhost:54424

## Environment Variables

Edit `.env` file to customize:
- `SUPABASE_JWT_SECRET`: JWT signing key (min 32 chars)
- `POSTGRES_PASSWORD`: Database password
- `SUPABASE_ANON_KEY`: Public API key
- `SUPABASE_SERVICE_KEY`: Service role key (admin access)

## Stop Services

```bash
docker-compose down
```

## Remove All Data

```bash
docker-compose down -v
```

## Connect from Apps

Use these credentials in your application:

```typescript
const supabaseUrl = 'http://localhost:54421'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
```

## Troubleshooting

### Database not ready
```bash
docker-compose logs db
```

### Restart specific service
```bash
docker-compose restart <service-name>
```

### Clear and rebuild
```bash
docker-compose down -v
docker-compose up -d
```
