#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PHP_CLI_BIN="$(command -v php)"
INI="$(pwd)/php.ini"
HOST=127.0.0.1
PORT=8080
# Show effective key ini values
$PHP_CLI_BIN -d variables_order=EGPCS -c "$INI" -i | egrep -i "(max_input_vars|max_file_uploads|upload_max_filesize|post_max_size|max_input_time|max_input_nesting_level|max_multipart_body_parts) =>" || true
# Clear Grav cache
$PHP_CLI_BIN -c "$INI" bin/grav clearcache || true
# Start PHP built-in server with Grav router
exec $PHP_CLI_BIN -c "$INI" -S "$HOST:$PORT" system/router.php
