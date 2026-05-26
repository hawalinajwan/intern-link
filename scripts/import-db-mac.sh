#!/usr/bin/env bash
set -euo pipefail

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DB="${MYSQL_DB:-magang_db}"
MONGO_DB="${MONGO_DB:-magang_chat}"
DUMP_DIR="${1:-}"

if [[ -z "$DUMP_DIR" ]]; then
  echo "Usage: MYSQL_USER=root MYSQL_DB=magang_db MONGO_DB=magang_chat $0 /path/to/db-migration/YYYYMMDD-HHMMSS"
  exit 1
fi

if [[ ! -d "$DUMP_DIR" ]]; then
  echo "Dump directory not found: $DUMP_DIR"
  exit 1
fi

MYSQL_DUMP="$DUMP_DIR/$MYSQL_DB.sql"
MONGO_DUMP="$DUMP_DIR/mongodb/$MONGO_DB"

if [[ ! -f "$MYSQL_DUMP" ]]; then
  echo "MySQL dump not found: $MYSQL_DUMP"
  exit 1
fi

if [[ ! -d "$MONGO_DUMP" ]]; then
  echo "MongoDB dump not found: $MONGO_DUMP"
  exit 1
fi

echo "Creating MySQL database '$MYSQL_DB' if needed..."
mysql -u "$MYSQL_USER" -p -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Restoring MySQL dump from $MYSQL_DUMP"
mysql -u "$MYSQL_USER" -p "$MYSQL_DB" < "$MYSQL_DUMP"

echo "Restoring MongoDB dump from $MONGO_DUMP"
mongorestore --drop --db "$MONGO_DB" "$MONGO_DUMP"

echo ""
echo "Done. Databases restored:"
echo "- MySQL: $MYSQL_DB"
echo "- MongoDB: $MONGO_DB"
