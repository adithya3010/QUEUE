#!/bin/bash

################################################################################
# Smart Queue MongoDB Backup Script
#
# This script creates a timestamped backup of the MongoDB database
# and optionally uploads it to cloud storage or remote location.
################################################################################

set -e  # Exit on error

# Load environment variables if .env file exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB_NAME:-smartqueue}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="smartqueue_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    # Check if mongodump is available
    if ! command -v mongodump &> /dev/null; then
        log_error "mongodump is not installed. Please install MongoDB Database Tools."
        log_info "Download from: https://www.mongodb.com/try/download/database-tools"
        exit 1
    fi

    # Check if MongoDB password is set
    if [ -z "$MONGO_PASSWORD" ]; then
        log_error "MONGO_ROOT_PASSWORD is not set. Please set it in .env file."
        exit 1
    fi

    log_info "Requirements check passed."
}

create_backup_directory() {
    log_info "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
}

perform_backup() {
    log_info "Starting backup of database: ${MONGO_DB}"
    log_info "Backup will be saved to: ${BACKUP_PATH}"

    # Construct MongoDB URI
    MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"

    # Perform backup
    if mongodump --uri="${MONGO_URI}" --out="${BACKUP_PATH}" --gzip; then
        log_info "Backup completed successfully!"

        # Get backup size
        BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
        log_info "Backup size: ${BACKUP_SIZE}"

        # Create a manifest file with backup metadata
        cat > "${BACKUP_PATH}/backup_manifest.txt" << EOF
Backup Name: ${BACKUP_NAME}
Database: ${MONGO_DB}
Timestamp: ${TIMESTAMP}
Date: $(date)
MongoDB Host: ${MONGO_HOST}:${MONGO_PORT}
Size: ${BACKUP_SIZE}
EOF

        log_info "Backup manifest created."
    else
        log_error "Backup failed!"
        exit 1
    fi
}

compress_backup() {
    log_info "Compressing backup..."

    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

    if [ $? -eq 0 ]; then
        log_info "Backup compressed successfully."

        # Remove uncompressed backup directory
        rm -rf "${BACKUP_NAME}"
        log_info "Removed uncompressed backup directory."

        # Show final backup file size
        COMPRESSED_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
        log_info "Compressed backup size: ${COMPRESSED_SIZE}"
        log_info "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    else
        log_error "Compression failed!"
        exit 1
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    find "${BACKUP_DIR}" -name "smartqueue_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

    local deleted_count=$(find "${BACKUP_DIR}" -name "smartqueue_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} | wc -l)

    if [ $deleted_count -gt 0 ]; then
        log_info "Deleted ${deleted_count} old backup(s)."
    else
        log_info "No old backups to delete."
    fi
}

upload_to_cloud() {
    # Optional: Upload to cloud storage (S3, Google Cloud Storage, etc.)
    # Uncomment and configure based on your cloud provider

    # Example for AWS S3:
    # if [ ! -z "$AWS_S3_BUCKET" ]; then
    #     log_info "Uploading backup to S3..."
    #     aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${AWS_S3_BUCKET}/backups/"
    #     log_info "Upload to S3 completed."
    # fi

    # Example for Google Cloud Storage:
    # if [ ! -z "$GCS_BUCKET" ]; then
    #     log_info "Uploading backup to Google Cloud Storage..."
    #     gsutil cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "gs://${GCS_BUCKET}/backups/"
    #     log_info "Upload to GCS completed."
    # fi

    log_info "Cloud upload not configured. To enable, edit this script and configure your cloud provider."
}

send_notification() {
    # Optional: Send notification on backup completion
    # Can integrate with email, Slack, etc.

    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Smart Queue backup completed: ${BACKUP_NAME}\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Main execution
main() {
    log_info "=== Smart Queue Database Backup ==="
    log_info "Started at: $(date)"
    echo ""

    check_requirements
    create_backup_directory
    perform_backup
    compress_backup
    cleanup_old_backups
    upload_to_cloud
    send_notification

    echo ""
    log_info "=== Backup Process Completed ==="
    log_info "Finished at: $(date)"
    log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# Run main function
main
