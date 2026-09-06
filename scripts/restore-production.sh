#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: CAT_GAME_RESTORE_CONFIRM=restore-cat-game scripts/restore-production.sh /absolute/path/backup.dump" >&2
  exit 2
fi

backup_path=$1
if [ "${CAT_GAME_RESTORE_CONFIRM:-}" != "restore-cat-game" ]; then
  echo "set CAT_GAME_RESTORE_CONFIRM=restore-cat-game to acknowledge destructive restore" >&2
  exit 2
fi
case "$backup_path" in
  /*) ;;
  *)
    echo "backup path must be absolute" >&2
    exit 2
    ;;
esac
if [ ! -f "$backup_path" ] || [ ! -s "$backup_path" ]; then
  echo "backup does not exist or is empty: $backup_path" >&2
  exit 2
fi

run_compose() {
  docker compose --env-file "${CAT_GAME_ENV_FILE:-production.env}" -f compose.production.yml "$@"
}

run_compose exec -T db pg_restore --list <"$backup_path" >/dev/null
run_compose stop backend
run_compose exec -T db pg_restore \
  --username cat_game \
  --dbname cat_game \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges <"$backup_path"
run_compose up -d backend frontend
echo "restore completed; verify /ready and run the production smoke check"
