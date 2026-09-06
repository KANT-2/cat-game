#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: scripts/backup-production.sh /absolute/path/backup.dump" >&2
  exit 2
fi

backup_path=$1
case "$backup_path" in
  /*) ;;
  *)
    echo "backup path must be absolute" >&2
    exit 2
    ;;
esac

if [ -e "$backup_path" ]; then
  echo "refusing to overwrite existing backup: $backup_path" >&2
  exit 2
fi

umask 077
docker compose --env-file "${CAT_GAME_ENV_FILE:-production.env}" -f compose.production.yml \
  exec -T db pg_dump --username cat_game --dbname cat_game --format custom >"$backup_path"

if [ ! -s "$backup_path" ]; then
  echo "backup is empty: $backup_path" >&2
  exit 1
fi

docker compose --env-file "${CAT_GAME_ENV_FILE:-production.env}" -f compose.production.yml \
  exec -T db pg_restore --list <"$backup_path" >/dev/null
echo "verified backup: $backup_path"
