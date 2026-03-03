#!/bin/bash

# Configuration
SUPABASE_URL="https://srvammwwpqgpyqbgeuoi.supabase.co/rest/v1"
SERVICE_ROLE_KEY="sb_secret_l-0J8wy44Dz2K4KxAO8DQA_BLJHgziw"
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="supabase/backups/$DATE"

mkdir -p "$BACKUP_DIR"

TABLES=("transactions" "app_settings" "budget_months" "budget_expenses" "wishlist" "diary")

echo "Starting backup for $DATE..."

for TABLE in "${TABLES[@]}"
do
    echo "Backing up $TABLE..."
    curl -s -X GET "$SUPABASE_URL/$TABLE?select=*" \
        -H "apikey: $SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -o "$BACKUP_DIR/$TABLE.json"
    
    # Check if backup is empty or has error
    if [[ ! -s "$BACKUP_DIR/$TABLE.json" ]]; then
        echo "Error: Backup for $TABLE is empty."
    else
        COUNT=$(jq '. | length' "$BACKUP_DIR/$TABLE.json" 2>/dev/null || echo "unknown")
        echo "Successfully backed up $TABLE ($COUNT rows)."
    fi
done

echo "Backup completed in $BACKUP_DIR"
