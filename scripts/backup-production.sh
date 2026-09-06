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

backup_partial_path="${backup_path}.partial"
if [ -e "$backup_partial_path" ]; then
  echo "refusing to overwrite incomplete backup: $backup_partial_path" >&2
  exit 2
fi

cleanup_partial_backup() {
  if [ -f "$backup_partial_path" ]; then
    rm -- "$backup_partial_path"
  fi
}
trap cleanup_partial_backup EXIT INT TERM

umask 077
docker compose --env-file "${CAT_GAME_ENV_FILE:-production.env}" -f compose.production.yml \
  exec -T db pg_dump --username cat_game --dbname cat_game --format custom >"$backup_partial_path"

if [ ! -s "$backup_partial_path" ]; then
  echo "backup is empty: $backup_partial_path" >&2
  exit 1
fi

docker compose --env-file "${CAT_GAME_ENV_FILE:-production.env}" -f compose.production.yml \
  exec -T db pg_restore --list <"$backup_partial_path" >/dev/null
mv "$backup_partial_path" "$backup_path"
trap - EXIT INT TERM
echo "verified backup: $backup_path"
