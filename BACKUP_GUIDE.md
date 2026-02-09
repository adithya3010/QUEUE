# Database Backup and Restore Guide

This document explains the automated backup system for Smart Queue's MongoDB database.

## Overview

Smart Queue includes comprehensive backup and restore scripts for database protection:
- **Automated backups** with configurable retention
- **Manual backup/restore** scripts
- **Docker-compatible** scripts
- **Backup verification** and monitoring
- **Cloud storage integration** (optional)

## Quick Start

### 1. Run Setup Script
```bash
cd Smart-Queue
chmod +x backend/scripts/backup/setup-backups.sh
./backend/scripts/backup/setup-backups.sh
```

This interactive script will:
- Check requirements
- Create necessary directories
- Make scripts executable
- Configure environment
- Test backup
- Set up automated scheduling

### 2. Manual Backup
```bash
# Standard installation
./backend/scripts/backup/backup.sh

# Docker installation
./backend/scripts/backup/backup-docker.sh
```

### 3. Restore Backup
```bash
# Standard installation
./backend/scripts/backup/restore.sh

# Docker installation
./backend/scripts/backup/restore-docker.sh
```

## Backup Scripts

### Standard Backup (`backup.sh`)

For non-Docker MongoDB installations.

**Features**:
- Automatic timestamped backups
- Gzip compression
- Configurable retention period
- Backup manifest with metadata
- Old backup cleanup
- Cloud upload support (optional)
- Notification support (optional)

**Usage**:
```bash
./backend/scripts/backup/backup.sh
```

**Environment Variables**:
```bash
BACKUP_DIR=./backups              # Backup directory
MONGO_HOST=localhost              # MongoDB host
MONGO_PORT=27017                  # MongoDB port
MONGO_DB_NAME=smartqueue          # Database name
MONGO_ROOT_USERNAME=admin         # MongoDB username
MONGO_ROOT_PASSWORD=password      # MongoDB password
BACKUP_RETENTION_DAYS=30          # Days to keep backups
```

**Output**:
```
./backups/
  └── smartqueue_backup_20240115_020000.tar.gz
```

### Docker Backup (`backup-docker.sh`)

For MongoDB running in Docker containers.

**Features**:
- Works with Docker containers
- Same compression and retention as standard
- Automatic container detection
- No MongoDB tools required on host

**Usage**:
```bash
./backend/scripts/backup/backup-docker.sh
```

**Environment Variables**:
```bash
MONGO_CONTAINER=smart-queue-mongodb  # Container name
# ... plus all variables from standard backup
```

**How It Works**:
1. Executes `mongodump` inside container
2. Copies backup from container to host
3. Cleans up container's temporary files
4. Compresses backup on host

### Standard Restore (`restore.sh`)

Interactive restoration from backup files.

**Features**:
- Lists available backups
- Interactive selection
- Confirmation prompt
- Pre-restore backup of current data
- Automatic extraction and restore
- Restore verification

**Usage**:
```bash
./backend/scripts/backup/restore.sh
```

**Interactive Process**:
1. Lists all available backups
2. User selects backup number
3. Confirmation prompt
4. Creates pre-restore backup (safety)
5. Extracts selected backup
6. Drops existing database
7. Restores from backup
8. Verifies collections

### Docker Restore (`restore-docker.sh`)

For restoring to Docker MongoDB.

**Usage**:
```bash
./backend/scripts/backup/restore-docker.sh
```

**Process**:
1. Lists available backups
2. User selects backup
3. Confirmation required
4. Copies backup to container
5. Executes restore in container
6. Cleans up temporary files

## Automated Backups

### Using Cron (Linux/Mac)

**1. Edit Crontab**:
```bash
crontab -e
```

**2. Add Backup Schedule**:

**Daily at 2:00 AM**:
```cron
0 2 * * * cd /path/to/Smart-Queue && ./backend/scripts/backup/backup.sh >> /var/log/smartqueue/backup.log 2>&1
```

**Docker version**:
```cron
0 2 * * * cd /path/to/Smart-Queue && ./backend/scripts/backup/backup-docker.sh >> /var/log/smartqueue/backup.log 2>&1
```

**Weekly on Sundays at 3:00 AM**:
```cron
0 3 * * 0 cd /path/to/Smart-Queue && ./backend/scripts/backup/backup.sh >> /var/log/smartqueue/backup.log 2>&1
```

**Monthly on 1st at 1:00 AM**:
```cron
0 1 1 * * cd /path/to/Smart-Queue && BACKUP_DIR=/path/to/monthly-backups ./backend/scripts/backup/backup.sh >> /var/log/smartqueue/backup.log 2>&1
```

**3. Verify Cron Job**:
```bash
crontab -l
```

**4. Check Logs**:
```bash
tail -f /var/log/smartqueue/backup.log
```

### Using Systemd Timer (Linux)

**1. Create Service File** (`/etc/systemd/system/smartqueue-backup.service`):
```ini
[Unit]
Description=Smart Queue Database Backup
After=network.target

[Service]
Type=oneshot
User=youruser
WorkingDirectory=/path/to/Smart-Queue
ExecStart=/path/to/Smart-Queue/backend/scripts/backup/backup.sh
StandardOutput=append:/var/log/smartqueue/backup.log
StandardError=append:/var/log/smartqueue/backup.log
```

**2. Create Timer File** (`/etc/systemd/system/smartqueue-backup.timer`):
```ini
[Unit]
Description=Smart Queue Backup Timer
Requires=smartqueue-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

**3. Enable and Start**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable smartqueue-backup.timer
sudo systemctl start smartqueue-backup.timer
```

**4. Check Status**:
```bash
sudo systemctl status smartqueue-backup.timer
sudo systemctl list-timers
```

### Using Windows Task Scheduler

**1. Open Task Scheduler**:
- Search for "Task Scheduler" in Start menu

**2. Create Basic Task**:
- Name: "Smart Queue Backup"
- Trigger: Daily at 2:00 AM
- Action: Start a program

**3. Program Details**:
- Program: `C:\Program Files\Git\bin\bash.exe`
- Arguments: `-c "cd /c/path/to/Smart-Queue && ./backend/scripts/backup/backup.sh"`
- Start in: `C:\path\to\Smart-Queue`

**4. Configure Settings**:
- Run whether user is logged on or not
- Run with highest privileges
- Configure for Windows 10

## Backup Storage

### Local Storage

**Default Location**: `./backups/`

**Backup Naming**: `smartqueue_backup_YYYYMMDD_HHMMSS.tar.gz`

**Example**:
```
./backups/
  ├── smartqueue_backup_20240115_020000.tar.gz  (12 MB)
  ├── smartqueue_backup_20240116_020000.tar.gz  (12 MB)
  └── smartqueue_backup_20240117_020000.tar.gz  (13 MB)
```

Each backup includes:
- Compressed database dump (gzip)
- Backup manifest file with metadata
- All collections and indexes

### Cloud Storage Integration

The backup scripts support cloud upload (disabled by default).

#### Amazon S3

**1. Install AWS CLI**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**2. Configure AWS**:
```bash
aws configure
```

**3. Edit `backup.sh`**, uncomment S3 section:
```bash
if [ ! -z "$AWS_S3_BUCKET" ]; then
    log_info "Uploading backup to S3..."
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${AWS_S3_BUCKET}/backups/"
    log_info "Upload to S3 completed."
fi
```

**4. Add to `.env`**:
```bash
AWS_S3_BUCKET=my-smartqueue-backups
```

#### Google Cloud Storage

**1. Install gcloud CLI**:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**2. Edit `backup.sh`**, uncomment GCS section:
```bash
if [ ! -z "$GCS_BUCKET" ]; then
    log_info "Uploading backup to Google Cloud Storage..."
    gsutil cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "gs://${GCS_BUCKET}/backups/"
    log_info "Upload to GCS completed."
fi
```

**3. Add to `.env`**:
```bash
GCS_BUCKET=my-smartqueue-backups
```

## Backup Retention

### Automatic Cleanup

The backup scripts automatically delete old backups based on `BACKUP_RETENTION_DAYS`.

**Default**: 30 days

**Configure Retention**:
```bash
# In .env file
BACKUP_RETENTION_DAYS=30
```

**Manual Cleanup**:
```bash
# Delete backups older than 7 days
find ./backups -name "smartqueue_backup_*.tar.gz" -type f -mtime +7 -delete

# Delete all backups
rm -rf ./backups/smartqueue_backup_*.tar.gz
```

### Multi-Tier Retention Strategy

**Recommended approach**:
- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 30 days
- **Monthly backups**: Keep for 1 year

**Implementation**:

```cron
# Daily backup (7 days retention)
0 2 * * * cd /path/to/Smart-Queue && BACKUP_RETENTION_DAYS=7 ./backend/scripts/backup/backup.sh

# Weekly backup (30 days retention)
0 3 * * 0 cd /path/to/Smart-Queue && BACKUP_DIR=./backups/weekly BACKUP_RETENTION_DAYS=30 ./backend/scripts/backup/backup.sh

# Monthly backup (365 days retention)
0 1 1 * * cd /path/to/Smart-Queue && BACKUP_DIR=./backups/monthly BACKUP_RETENTION_DAYS=365 ./backend/scripts/backup/backup.sh
```

## Monitoring and Notifications

### Slack Notifications

**1. Create Slack Incoming Webhook**:
- Go to https://api.slack.com/apps
- Create app → Incoming Webhooks
- Copy webhook URL

**2. Add to `.env`**:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**3. The script will automatically send notifications**:
- ✅ Backup completed
- ❌ Backup failed (if configured)

### Email Notifications

**Using cron MAILTO**:

```cron
MAILTO=admin@yourcompany.com

0 2 * * * cd /path/to/Smart-Queue && ./backend/scripts/backup/backup.sh
```

**Cron will email output** on errors or if output is generated.

### Log Monitoring

**View Real-Time Logs**:
```bash
tail -f /var/log/smartqueue/backup.log
```

**Check Last Backup**:
```bash
grep "Backup Completed" /var/log/smartqueue/backup.log | tail -1
```

**Check for Errors**:
```bash
grep "ERROR" /var/log/smartqueue/backup.log
```

## Backup Verification

### Manual Verification

**1. List Backups**:
```bash
ls -lh ./backups/
```

**2. Check Backup Size**:
```bash
du -sh ./backups/smartqueue_backup_*.tar.gz
```

**3. Verify Archive Integrity**:
```bash
tar -tzf ./backups/smartqueue_backup_20240115_020000.tar.gz
```

**4. Test Restore** (to test database):
```bash
# Restore to a test database
MONGO_DB_NAME=smartqueue_test ./backend/scripts/backup/restore.sh
```

### Automated Verification

Create `verify-backup.sh`:

```bash
#!/bin/bash
LATEST_BACKUP=$(ls -t ./backups/smartqueue_backup_*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found"
    exit 1
fi

# Check if backup was created today
BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1)
TODAY=$(date +%Y-%m-%d)

if [ "$BACKUP_DATE" != "$TODAY" ]; then
    echo "WARNING: Latest backup is old: $BACKUP_DATE"
    exit 1
fi

# Verify archive integrity
if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
    echo "✓ Backup verified: $LATEST_BACKUP"
else
    echo "ERROR: Backup is corrupted: $LATEST_BACKUP"
    exit 1
fi
```

**Schedule Verification**:
```cron
0 4 * * * /path/to/verify-backup.sh >> /var/log/smartqueue/verify.log 2>&1
```

## Disaster Recovery

### Full System Recovery

**1. Install Smart Queue**:
```bash
git clone <repository>
cd Smart-Queue
npm install
```

**2. Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

**3. Restore Database**:
```bash
# Copy your backup file to ./backups/
./backend/scripts/backup/restore.sh
```

**4. Start Application**:
```bash
npm start
```

**5. Verify**:
- Check application functionality
- Verify data integrity
- Test critical workflows

### Point-in-Time Recovery

To restore to a specific point:

```bash
# List backups with timestamps
ls -lh ./backups/

# Restore specific backup
./backend/scripts/backup/restore.sh
# Select the backup from the desired time
```

### Partial Recovery

To restore specific collections:

```bash
# Extract backup
tar -xzf ./backups/smartqueue_backup_20240115_020000.tar.gz

# Restore specific collection
mongorestore --uri="mongodb://admin:password@localhost:27017/smartqueue?authSource=admin" \
    --nsInclude="smartqueue.doctors" \
    ./smartqueue_backup_20240115_020000/smartqueue/
```

## Best Practices

### Backup Strategy

1. **3-2-1 Rule**:
   - 3 copies of data
   - 2 different media types
   - 1 copy off-site

2. **Regular Testing**:
   - Monthly restore tests
   - Verify backup integrity
   - Document restore time

3. **Monitoring**:
   - Set up alerts for failed backups
   - Monitor backup sizes
   - Track backup timing

4. **Security**:
   - Encrypt backups at rest
   - Secure backup storage locations
   - Restrict access to backups
   - Use different passwords for backups

### Performance Optimization

**1. Schedule During Low Traffic**:
```cron
# 2 AM when traffic is low
0 2 * * * ./backup.sh
```

**2. Use Compression**:
- Already enabled with gzip
- Reduces storage by ~70%

**3. Incremental Backups** (advanced):
```bash
# Full backup weekly
0 2 * * 0 ./backup.sh

# Oplog backup daily (captures changes)
0 2 * * 1-6 mongodump --oplog
```

### Storage Management

**1. Monitor Disk Space**:
```bash
df -h ./backups
```

**2. Set Up Alerts**:
```bash
# Alert if disk usage > 80%
USAGE=$(df ./backups | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "WARNING: Backup disk usage is ${USAGE}%"
fi
```

**3. Implement Lifecycle Policies** (cloud storage):
- Move old backups to cheaper storage tiers
- Automatic deletion after retention period

## Troubleshooting

### Backup Failures

**Problem**: "mongodump: command not found"
**Solution**:
```bash
# Install MongoDB Database Tools
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.6.1.tgz
tar -xzf mongodb-database-tools-*.tgz
sudo cp mongodb-database-tools-*/bin/* /usr/local/bin/
```

**Problem**: "Authentication failed"
**Solution**:
- Check MONGO_ROOT_PASSWORD in .env
- Verify MongoDB user has correct permissions
- Test connection: `mongosh -u admin -p password`

**Problem**: "Disk full"
**Solution**:
- Delete old backups manually
- Reduce retention period
- Use external storage location

### Restore Issues

**Problem**: "Database not found"
**Solution**:
- Verify backup file is valid
- Check backup extraction
- Ensure correct database name

**Problem**: "Existing connections"
**Solution**:
```bash
# Stop application first
docker-compose stop backend frontend

# Then restore
./backend/scripts/backup/restore.sh

# Restart application
docker-compose up -d
```

## Summary

The backup system provides:
- ✅ Automated daily backups
- ✅ Configurable retention (default 30 days)
- ✅ Compression (gzip)
- ✅ Docker support
- ✅ Cloud storage integration
- ✅ Monitoring and notifications
- ✅ Easy restore process
- ✅ Disaster recovery ready

**Critical Actions**:
1. Run setup script: `./backend/scripts/backup/setup-backups.sh`
2. Schedule automated backups (cron/systemd/Task Scheduler)
3. Test restore process monthly
4. Monitor backup logs regularly
5. Keep backups off-site (cloud storage)

Your database is now protected! 🛡️
