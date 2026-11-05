#!/usr/bin/env bash
#
# Boots the production build with the real `medusa start`. The integration tests cannot show this:
# the Medusa test runner registers its own /health and never runs this command.
#
# Expects a finished build, migrated database, Redis and every required variable in the environment.
# Every failure stops the script and prints the logs of each process.
set -euo pipefail

server_port=9000
worker_port=9001
refused_port=9002
boot_timeout_seconds=180
worker_watch_seconds=45
# Winston's text and JSON formats, plus what Node prints when a process crashes.
fatal_pattern='(^|[^[:alnum:]_-])(error|fatal)( |:|")|"level":"(error|fatal)"|unhandled|uncaught|ELIFECYCLE'

log_dir="$(mktemp -d)"
pids=()

fail() {
  echo "::error::$1"
  exit 1
}

stop_all() {
  # Each process leads its own group (setsid), which also holds the node process under pnpm.
  for pid in "${pids[@]:-}"; do
    if [ -n "$pid" ]; then
      kill -TERM -- "-$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  pids=()
}

on_exit() {
  local rc=$?
  stop_all
  if [ "$rc" -ne 0 ]; then
    for log in "$log_dir"/*.log; do
      echo "::group::$(basename "$log")"
      cat "$log"
      echo "::endgroup::"
    done
  fi
  exit "$rc"
}
trap on_exit EXIT

# Sets started_pid, because a command substitution would make the process a child of a subshell.
start_backend() {
  local mode=$1 port=$2
  PORT="$port" setsid pnpm --filter @nozco/backend "start:$mode" >"$log_dir/$mode.log" 2>&1 &
  started_pid=$!
  pids+=("$started_pid")
}

http_status() {
  curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 "$1" || true
}

wait_for_health() {
  local mode=$1 pid=$2 port=$3 waited=0
  until [ "$(http_status "http://localhost:$port/health")" = "200" ]; do
    kill -0 "$pid" 2>/dev/null || fail "$mode mode exited before /health answered"
    [ "$waited" -lt "$boot_timeout_seconds" ] ||
      fail "$mode mode did not answer /health in $boot_timeout_seconds s"
    sleep 2
    waited=$((waited + 2))
  done
  echo "$mode mode: GET /health returned 200 after about $waited s"
}

expect_status() {
  local description=$1 url=$2 expected=$3 actual
  actual="$(http_status "$url")"
  [ "$actual" = "$expected" ] || fail "$description: expected $expected, got $actual"
  echo "$description: $actual"
}

expect_clean_log() {
  local mode=$1
  if grep -Ein "$fatal_pattern" "$log_dir/$mode.log"; then
    fail "$mode mode logged an error"
  fi
  echo "$mode mode: no error in the log"
}

# Runs `medusa start` without one variable and expects it to refuse to start, naming that variable.
expect_refusal() {
  local mode=$1 variable=$2 rc=0
  local log="$log_dir/refused-$mode-$variable.log"
  env -u "$variable" PORT="$refused_port" timeout 120 \
    pnpm --filter @nozco/backend "start:$mode" >"$log" 2>&1 || rc=$?
  [ "$rc" -ne 124 ] || fail "$mode mode without $variable was still running after 120 s"
  [ "$rc" -ne 0 ] || fail "$mode mode without $variable exited with 0"
  grep -q "Invalid environment variables" "$log" && grep -q "$variable" "$log" ||
    fail "$mode mode without $variable failed for another reason"
  echo "$mode mode without $variable: exit code $rc, and the error names the variable"
}

echo "--- server mode"
start_backend server "$server_port"
server_pid=$started_pid
wait_for_health server "$server_pid" "$server_port"
# /health answers without any application route, so these show that the application really loaded.
expect_status "server mode: GET /admin/users without a token" \
  "http://localhost:$server_port/admin/users" 401
expect_status "server mode: GET /app (admin dashboard)" "http://localhost:$server_port/app/" 200

echo "--- worker mode, next to the server, on the same Redis"
start_backend worker "$worker_port"
worker_pid=$started_pid
wait_for_health worker "$worker_pid" "$worker_port"
expect_status "worker mode: GET /admin/users (no API routes)" \
  "http://localhost:$worker_port/admin/users" 404
echo "worker mode: watching it for $worker_watch_seconds s"
sleep "$worker_watch_seconds"
kill -0 "$worker_pid" 2>/dev/null || fail "worker mode exited after it started"
kill -0 "$server_pid" 2>/dev/null || fail "server mode exited after the worker started"
expect_status "worker mode: GET /health" "http://localhost:$worker_port/health" 200
expect_status "server mode: GET /health" "http://localhost:$server_port/health" 200
expect_clean_log server
expect_clean_log worker
stop_all

echo "--- refusing to start"
expect_refusal server JWT_SECRET
expect_refusal server DATABASE_URL
expect_refusal worker REDIS_URL

echo "Backend boot smoke test passed"
