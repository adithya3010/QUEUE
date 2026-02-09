#!/bin/bash

################################################################################
# Smart Queue MongoDB Restore Script
#
# This script restores a MongoDB database from a backup file.
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

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_prompt() {
    echo -e "${BLUE}[INPUT]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    # Check if mongorestore is available
    if ! command -v mongorestore &> /dev/null; then
        log_error "mongorestore is not installed. Please install MongoDB Database Tools."
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

list_available_backups() {
    log_info "Available backups in ${BACKUP_DIR}:"
    echo ""

    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "Backup directory does not exist: ${BACKUP_DIR}"
        return 1
    fi

    local backups=($(ls -t "${BACKUP_DIR}"/smartqueue_backup_*.tar.gz 2>/dev/null))

    if [ ${#backups[@]} -eq 0 ]; then
        log_warning "No backup files found in ${BACKUP_DIR}"
        return 1
    fi

    local index=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -sh "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" 2>/dev/null || stat -f %Sm "$backup" 2>/dev/null)

        echo "${index}. ${filename}"
        echo "   Size: ${size} | Date: ${date}"
        echo ""
        ((index++))
    done

    return 0
}

select_backup() {
    list_available_backups

    if [ $? -ne 0 ]; then
        log_error "No backups available for restore."
        exit 1
    fi

    local backups=($(ls -t "${BACKUP_DIR}"/smartqueue_backup_*.tar.gz 2>/dev/null))

    log_prompt "Enter the number of the backup to restore (or 'q' to quit): "
    read selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        log_info "Restore cancelled."
        exit 0
    fi

    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection."
        exit 1
    fi

    BACKUP_FILE="${backups[$((selection-1))]}"
    log_info "Selected backup: $(basename ${BACKUP_FILE})"
}

confirm_restore() {
    log_warning "WARNING: This will replace the current database!"
    log_warning "Database: ${MONGO_DB}"
    log_warning "Host: ${MONGO_HOST}:${MONGO_PORT}"
    echo ""
    log_prompt "Are you sure you want to proceed? Type 'yes' to confirm: "
    read confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled."
        exit 0
    fi
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup of current database..."

    local pre_restore_dir="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "${pre_restore_dir}"

    MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"

    if mongodump --uri="${MONGO_URI}" --out="${pre_restore_dir}" --gzip 2>/dev/null; then
        log_info "Pre-restore backup created at: ${pre_restore_dir}"
    else
        log_warning "Failed to create pre-restore backup. Continuing anyway..."
    fi
}

extract_backup() {
    log_info "Extracting backup file..."

    local extract_dir="${BACKUP_DIR}/restore_temp"
    rm -rf "${extract_dir}"
    mkdir -p "${extract_dir}"

    tar -xzf "${BACKUP_FILE}" -C "${extract_dir}"

    if [ $? -eq 0 ]; then
        log_info "Backup extracted successfully."

        # Find the extracted backup directory
        EXTRACTED_BACKUP=$(find "${extract_dir}" -type d -name "smartqueue_backup_*" | head -n 1)

        if [ -z "$EXTRACTED_BACKUP" ]; then
            log_error "Could not find extracted backup directory."
            exit 1
        fi

        log_info "Using backup directory: ${EXTRACTED_BACKUP}"
    else
        log_error "Failed to extract backup file."
        exit 1
    fi
}

perform_restore() {
    log_info "Starting database restore..."

    MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"

    # Drop existing database first
    log_warning "Dropping existing database..."
    if mongosh "${MONGO_URI}" --eval "db.dropDatabase()" 2>/dev/null || mongo "${MONGO_URI}" --eval "db.dropDatabase()" 2>/dev/null; then
        log_info "Existing database dropped."
    else
        log_warning "Could not drop existing database. It may not exist. Continuing..."
    fi

    # Restore from backup
    local db_backup_dir="${EXTRACTED_BACKUP}/${MONGO_DB}"

    if [ ! -d "$db_backup_dir" ]; then
        log_error "Database backup directory not found: ${db_backup_dir}"
        exit 1
    fi

    if mongorestore --uri="${MONGO_URI}" --gzip --dir="${db_backup_dir}"; then
        log_info "Database restored successfully!"
    else
        log_error "Restore failed!"
        exit 1
    fi
}

cleanup_temp_files() {
    log_info "Cleaning up temporary files..."

    local extract_dir="${BACKUP_DIR}/restore_temp"
    if [ -d "$extract_dir" ]; then
        rm -rf "${extract_dir}"
        log_info "Temporary files removed."
    fi
}

verify_restore() {
    log_info "Verifying restore..."

    MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"

    # Count documents in collections
    local collections=$(mongosh "${MONGO_URI}" --quiet --eval "db.getCollectionNames().join(',')" 2>/dev/null || mongo "${MONGO_URI}" --quiet --eval "db.getCollectionNames().join(',')" 2>/dev/null)

    if [ ! -z "$collections" ]; then
        log_info "Restored collections: ${collections}"
        log_info "Restore verification completed."
    else
        log_warning "Could not verify collections. Please check manually."
    fi
}

# Main execution
main() {
    log_info "=== Smart Queue Database Restore ==="
    log_info "Started at: $(date)"
    echo ""

    check_requirements
    select_backup
    confirm_restore
    create_pre_restore_backup
    extract_backup
    perform_restore
    verify_restore
    cleanup_temp_files

    echo ""
    log_info "=== Restore Process Completed ==="
    log_info "Finished at: $(date)"
    log_info "Database ${MONGO_DB} has been restored from: $(basename ${BACKUP_FILE})"
    echo ""
    log_warning "Remember to verify your application is working correctly after restore."
}

# Run main function
main
