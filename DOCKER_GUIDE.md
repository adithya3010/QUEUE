# Docker Deployment Guide

This document explains how to deploy Smart Queue using Docker and Docker Compose for both development and production environments.

## Overview

Smart Queue uses Docker for containerized deployment with the following services:
- **MongoDB**: Database service
- **Backend**: Node.js/Express API
- **Frontend**: React app served by Nginx

## Prerequisites

Install the following on your system:
- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

**Verify installation**:
```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone and Navigate
```bash
cd Smart-Queue
```

### 2. Create Environment File
```bash
cp .env.docker.example .env
```

### 3. Edit Environment Variables
```bash
# Edit .env file with your configuration
nano .env  # or use your preferred editor
```

**Important**: Change these values:
- `MONGO_ROOT_PASSWORD`: Strong MongoDB password
- `JWT_SECRET`: Random secure string (use generator below)
- `JWT_REFRESH_SECRET`: Different random secure string

**Generate secure secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Start Services
```bash
docker-compose up -d
```

### 5. Access Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs
- **MongoDB**: localhost:27017

## Docker Commands

### Start Services
```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Images
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

## Service Details

### MongoDB

**Image**: mongo:7.0
**Port**: 27017 (configurable via MONGO_PORT)
**Data Persistence**: Stored in Docker volume `mongodb_data`

**Access MongoDB Shell**:
```bash
docker-compose exec mongodb mongosh -u admin -p <password>
```

**Connection String** (from host):
```
mongodb://admin:<password>@localhost:27017/smartqueue?authSource=admin
```

**Backup Database**:
```bash
docker-compose exec mongodb mongodump --uri="mongodb://admin:<password>@localhost:27017/smartqueue?authSource=admin" --out=/data/backup
```

### Backend

**Base Image**: node:18-alpine
**Port**: 5000 (configurable via BACKEND_PORT)
**Health Check**: GET /health (every 30s)

**Environment Variables**:
- `NODE_ENV`: Set to production
- `MONGO_URI`: Auto-configured to connect to mongodb service
- `JWT_SECRET`: Required for authentication
- `JWT_REFRESH_SECRET`: Required for token refresh
- `FRONTEND_URL`: URL of frontend app
- Optional: Sentry, email configuration

**Execute Commands**:
```bash
# Access container shell
docker-compose exec backend sh

# Run database migrations
docker-compose exec backend node scripts/migrate.js

# Check logs
docker-compose exec backend cat logs/combined.log
```

### Frontend

**Base Image**: node:18-alpine (build) + nginx:alpine (production)
**Port**: 80 (configurable via FRONTEND_PORT)
**Build**: Multi-stage build with Vite

**Features**:
- Optimized production build
- Gzip compression
- SPA routing support
- Security headers
- Static asset caching

**Nginx Configuration**:
- Custom config at `frontend/vite-project/nginx.conf`
- Handles all routes for SPA
- Serves static files efficiently

## Environment Configuration

### Required Variables

```env
# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=strong_password_here

# Security
JWT_SECRET=random_secret_32_chars
JWT_REFRESH_SECRET=different_random_secret
```

### Optional Variables

```env
# Ports
MONGO_PORT=27017
BACKEND_PORT=5000
FRONTEND_PORT=80

# URLs
FRONTEND_URL=http://localhost
VITE_API_BASE_URL=http://localhost:5000/api

# Error Tracking
SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_DSN=your_frontend_sentry_dsn

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Smart Queue <noreply@smartqueue.com>
```

## Production Deployment

### 1. Security Hardening

**Update .env file**:
```env
# Use strong passwords
MONGO_ROOT_PASSWORD=<very-strong-password>

# Generate new secrets
JWT_SECRET=<new-secure-secret>
JWT_REFRESH_SECRET=<new-secure-secret>

# Set production URLs
FRONTEND_URL=https://yourapp.com
VITE_API_BASE_URL=https://api.yourapp.com/api
```

**Additional security**:
- Use HTTPS/TLS (configure reverse proxy)
- Enable firewall rules
- Regular security updates
- Monitor logs for suspicious activity

### 2. Use Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  mongodb:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
```

**Start with production config**:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Reverse Proxy Setup

Use Nginx or Traefik for:
- HTTPS/SSL termination
- Load balancing
- Rate limiting
- Security headers

**Example Nginx config**:
```nginx
server {
    listen 443 ssl http2;
    server_name yourapp.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Monitoring and Logging

**View resource usage**:
```bash
docker stats
```

**Monitor health**:
```bash
docker-compose ps
```

**Set up log rotation**:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Database Management

### Backup

**Manual backup**:
```bash
# Create backup
docker-compose exec mongodb mongodump \
  --uri="mongodb://admin:<password>@localhost:27017/smartqueue?authSource=admin" \
  --out=/data/backup

# Copy to host
docker cp smart-queue-mongodb:/data/backup ./backups/$(date +%Y%m%d)
```

**Automated backup script**:
```bash
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

docker-compose exec -T mongodb mongodump \
  --uri="mongodb://admin:$MONGO_ROOT_PASSWORD@localhost:27017/smartqueue?authSource=admin" \
  --out=/data/backup

docker cp smart-queue-mongodb:/data/backup $BACKUP_DIR
echo "Backup completed: $BACKUP_DIR"
```

### Restore

```bash
# Copy backup to container
docker cp ./backups/20240115 smart-queue-mongodb:/data/restore

# Restore database
docker-compose exec mongodb mongorestore \
  --uri="mongodb://admin:<password>@localhost:27017/smartqueue?authSource=admin" \
  /data/restore/smartqueue
```

### Database Migrations

If you need to run migrations:

```bash
# Create migration file in backend/migrations/
# Then run:
docker-compose exec backend node migrations/run.js
```

## Development with Docker

### Using Docker for Development

**Start services without building**:
```bash
docker-compose -f docker-compose.dev.yml up
```

**Create `docker-compose.dev.yml`**:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      target: dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: npm run dev

  frontend:
    build:
      context: ./frontend/vite-project
      target: dev
    volumes:
      - ./frontend/vite-project:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      NODE_ENV: development
    command: npm run dev
```

### Hot Reloading

When using development mode with volumes, changes to source code will automatically reload.

## Troubleshooting

### Services Won't Start

**Check logs**:
```bash
docker-compose logs backend
docker-compose logs mongodb
```

**Common issues**:
1. Port already in use
   ```bash
   # Check what's using the port
   netstat -ano | findstr :5000  # Windows
   lsof -i :5000                # Mac/Linux
   ```

2. Permission issues
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER ./
   ```

3. Insufficient resources
   ```bash
   # Check Docker resources
   docker system df
   docker system prune  # Clean up
   ```

### MongoDB Connection Issues

**Check MongoDB is healthy**:
```bash
docker-compose ps
docker-compose logs mongodb
```

**Test connection**:
```bash
docker-compose exec mongodb mongosh -u admin -p <password> --eval "db.runCommand({ping: 1})"
```

### Frontend Not Loading

**Check nginx logs**:
```bash
docker-compose logs frontend
```

**Verify build**:
```bash
# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Backend API Errors

**Check environment variables**:
```bash
docker-compose exec backend env | grep -E 'MONGO_URI|JWT_SECRET'
```

**Test health endpoint**:
```bash
curl http://localhost:5000/health
```

## Performance Optimization

### Image Size Reduction

Current image sizes:
- Backend: ~150MB (alpine-based)
- Frontend: ~25MB (nginx-alpine)
- MongoDB: ~700MB (official image)

### Resource Limits

Set appropriate limits in production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

### Caching

Docker build uses layer caching:
- Dependencies installed first
- Source code copied last
- Rebuild only changed layers

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build images
        run: docker-compose build

      - name: Run tests
        run: |
          docker-compose up -d mongodb
          docker-compose run backend npm test

      - name: Push to registry
        run: |
          docker tag smart-queue-backend:latest registry.com/backend:latest
          docker push registry.com/backend:latest
```

## Best Practices

1. **Security**:
   - Never commit `.env` files
   - Use strong passwords
   - Regular security updates
   - Enable HTTPS in production

2. **Backups**:
   - Automated daily backups
   - Store backups off-site
   - Test restore procedures

3. **Monitoring**:
   - Set up health checks
   - Monitor resource usage
   - Configure alerts
   - Log aggregation

4. **Updates**:
   - Regular dependency updates
   - Test updates in staging
   - Rolling updates in production
   - Keep base images updated

## Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Rebuild and restart
docker-compose up -d --build

# Execute command in container
docker-compose exec [service] [command]

# Scale services
docker-compose up -d --scale backend=3

# View resource usage
docker stats

# Clean up
docker-compose down -v  # Remove volumes
docker system prune -a  # Clean everything
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- GitHub Issues: https://github.com/your-repo/issues
- Documentation: ./docs/

## Summary

Docker deployment provides:
- ✅ Consistent environments
- ✅ Easy deployment
- ✅ Scalability
- ✅ Isolation
- ✅ Portability

Access your application at:
- Frontend: http://localhost
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/api-docs
