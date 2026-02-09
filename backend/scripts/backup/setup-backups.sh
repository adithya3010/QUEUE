#!/bin/bash

################################################################################
# Smart Queue Backup Setup Script
#
# This script helps set up automated backups for Smart Queue
################################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_prompt() { echo -e "${BLUE}[INPUT]${NC} $1"; }

print_banner() {
    echo ""
    echo "================================================"
    echo "  Smart Queue - Automated Backup Setup"
    echo "================================================"
    echo ""
}

check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root. This is okay for system-wide installation."
    else
        log_info "Running as user: $(whoami)"
        log_warning "You may need sudo for system-wide cron installation."
    fi
}

check_requirements() {
    log_info "Checking requirements..."

    # Check for mongodump
    if ! command -v mongodump &> /dev/null; then
        log_warning "mongodump not found. Install MongoDB Database Tools."
        log_info "Download: https://www.mongodb.com/try/download/database-tools"
    else
        log_info "✓ mongodump found: $(which mongodump)"
    fi

    # Check for Docker (if using Docker)
    if command -v docker &> /dev/null; then
        log_info "✓ Docker found: $(which docker)"
    else
        log_warning "Docker not found. Docker-based backups will not work."
    fi
}

create_directories() {
    log_info "Creating backup directories..."

    mkdir -p ./backups
    mkdir -p /var/log/smartqueue 2>/dev/null || mkdir -p ./logs

    log_info "✓ Directories created"
}

make_scripts_executable() {
    log_info "Making backup scripts executable..."

    chmod +x ./backend/scripts/backup/*.sh

    log_info "✓ Scripts are now executable"
}

configure_environment() {
    log_info "Checking environment configuration..."

    if [ ! -f .env ]; then
        log_warning ".env file not found!"
        log_info "Creating .env from .env.example..."

        if [ -f .env.example ]; then
            cp .env.example .env
            log_warning "Please edit .env file and set MONGO_ROOT_PASSWORD"
        else
            log_error ".env.example not found. Please create .env manually."
        fi
    else
        log_info "✓ .env file exists"

        # Check if password is set
        if grep -q "MONGO_ROOT_PASSWORD=.*[^ ]" .env; then
            log_info "✓ MongoDB password is configured"
        else
            log_warning "MONGO_ROOT_PASSWORD not set in .env"
        fi
    fi
}

test_backup() {
    log_info "Would you like to test the backup now? (y/n)"
    read -p "> " response

    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        log_info "Running test backup..."
        echo ""

        if docker ps | grep -q "smart-queue-mongodb"; then
            ./backend/scripts/backup/backup-docker.sh
        else
            ./backend/scripts/backup/backup.sh
        fi

        if [ $? -eq 0 ]; then
            log_info "✓ Test backup completed successfully!"
        else
            log_error "Test backup failed. Please check errors above."
        fi
    fi
}

setup_cron() {
    echo ""
    log_info "Setting up automated backups with cron..."
    echo ""

    log_prompt "Enter backup schedule (default: 0 2 * * * = 2:00 AM daily): "
    read schedule

    if [ -z "$schedule" ]; then
        schedule="0 2 * * *"
    fi

    log_prompt "Use Docker backup script? (y/n, default: n): "
    read use_docker

    local script_path
    if [ "$use_docker" = "y" ] || [ "$use_docker" = "Y" ]; then
        script_path="$(pwd)/backend/scripts/backup/backup-docker.sh"
    else
        script_path="$(pwd)/backend/scripts/backup/backup.sh"
    fi

    local log_path="/var/log/smartqueue/backup.log"
    if [ ! -w "/var/log/smartqueue" ] 2>/dev/null; then
        log_path="$(pwd)/logs/backup.log"
    fi

    local cron_entry="${schedule} cd $(pwd) && ${script_path} >> ${log_path} 2>&1"

    echo ""
    log_info "Cron entry to add:"
    echo "${cron_entry}"
    echo ""

    log_prompt "Add this to your crontab? (y/n): "
    read add_cron

    if [ "$add_cron" = "y" ] || [ "$add_cron" = "Y" ]; then
        (crontab -l 2>/dev/null; echo "${cron_entry}") | crontab -

        if [ $? -eq 0 ]; then
            log_info "✓ Cron job added successfully!"
            echo ""
            log_info "View your crontab: crontab -l"
            log_info "Edit your crontab: crontab -e"
            log_info "Check logs at: ${log_path}"
        else
            log_error "Failed to add cron job."
            log_info "Add it manually: crontab -e"
        fi
    else
        log_info "Skipped cron setup."
        log_info "To add manually, run: crontab -e"
        log_info "Then add: ${cron_entry}"
    fi
}

show_summary() {
    echo ""
    echo "================================================"
    log_info "Setup Summary"
    echo "================================================"
    echo ""
    echo "Backup Scripts:"
    echo "  - Standard: ./backend/scripts/backup/backup.sh"
    echo "  - Docker: ./backend/scripts/backup/backup-docker.sh"
    echo "  - Restore: ./backend/scripts/backup/restore.sh"
    echo "  - Docker Restore: ./backend/scripts/backup/restore-docker.sh"
    echo ""
    echo "Backup Location: ./backups/"
    echo ""
    echo "Manual Commands:"
    echo "  - Create backup: ./backend/scripts/backup/backup.sh"
    echo "  - Restore backup: ./backend/scripts/backup/restore.sh"
    echo "  - List backups: ls -lh ./backups/"
    echo ""
    echo "Documentation: ./BACKUP_GUIDE.md"
    echo ""
    echo "================================================"
}

main() {
    print_banner
    check_root
    check_requirements
    create_directories
    make_scripts_executable
    configure_environment
    test_backup
    setup_cron
    show_summary

    echo ""
    log_info "✓ Backup setup completed!"
    echo ""
}

main
