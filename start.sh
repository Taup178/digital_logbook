#!/usr/bin/env bash
# ============================================================
# Digital Logbook — Start All Services
# Starts all 4 backend services + frontend in parallel,
# checks .env validity, and reports health status.
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Service definitions ──────────────────────────────────────
# name | directory | port | start command | health path | expected keyword in response
SERVICES=(
  "auth-service|$ROOT/services/auth-service|5001|npm start|/|auth-service"
  "dashboard-service|$ROOT/services/dashboard-service|5002|npm start|/|dashboard-service"
  "project-service|$ROOT/services/project-service|5003|npm start|/|project-service"
  "profile-service|$ROOT/services/profile-service|5004|npm start|/|profile-service"
  "frontend|$ROOT/frontend|3000|npm run dev|/|Digital Logbook"
)

# Track PIDs for cleanup
declare -a PIDS

cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping all services...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  sleep 1
  # Force kill any survivors
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# ── Helper: check .env for required keys ─────────────────────
check_env() {
  local name="$1"
  local dir="$2"
  local env_file="$dir/.env"
  local issues=0

  if [[ ! -f "$env_file" ]]; then
    echo -e "  ${RED}[FAIL]${NC} .env file not found at $env_file"
    return 1
  fi

  # auth-service doesn't need DATABASE_URL (no database access)
  if [[ "$name" == "auth-service" ]]; then
    echo -e "  ${GREEN}[OK]${NC} auth-service has no database dependencies"
    return 0
  fi

  # Check for DATABASE_URL
  if ! grep -q "^DATABASE_URL=." "$env_file"; then
    echo -e "  ${RED}[FAIL]${NC} DATABASE_URL is missing or empty in .env"
    issues=$((issues + 1))
  fi

  # project-service also needs SUPABASE_JWT_SECRET for JWT verification
  if [[ "$name" == "project-service" ]]; then
    if ! grep -q "^SUPABASE_JWT_SECRET=." "$env_file"; then
      echo -e "  ${RED}[FAIL]${NC} SUPABASE_JWT_SECRET is missing or empty in .env"
      issues=$((issues + 1))
    fi
  fi

  if [[ $issues -eq 0 ]]; then
    echo -e "  ${GREEN}[OK]${NC} .env looks good"
    return 0
  else
    return 1
  fi
}

# ── Helper: check node_modules ───────────────────────────────
check_deps() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    echo -e "  ${YELLOW}[INSTALL]${NC} node_modules not found, running npm install..."
    (cd "$dir" && npm install --silent 2>&1)
    return $?
  fi
  return 0
}

# ── Helper: health check a service ───────────────────────────
health_check() {
  local port="$1"
  local path="$2"
  local keyword="$3"
  local max_tries=15
  local try=1

  while [[ $try -le $max_tries ]]; do
    local response
    response=$(curl -s --max-time 2 "http://localhost:${port}${path}" 2>/dev/null || echo "")

    if [[ -n "$response" ]]; then
      if [[ "$response" == *"$keyword"* ]] || [[ "$response" == *"Vite"* ]] || [[ "$response" == *"<!DOCTYPE html>"* ]]; then
        echo -e "  ${GREEN}[ALIVE]${NC} Responding on port ${port}"
        return 0
      fi
    fi

    # Check if process is still running (for early crash detection)
    sleep 1
    try=$((try + 1))
  done

  echo -e "  ${RED}[DEAD]${NC} No response on port ${port} after ${max_tries}s"
  return 1
}

# ── Main ─────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        Digital Logbook — Start All Services               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Phase 1: Pre-flight checks
echo -e "${BOLD}Phase 1: Pre-flight checks${NC}"
echo "─────────────────────────────────"

ALL_OK=true

for svc in "${SERVICES[@]}"; do
  IFS='|' read -r name dir port cmd health_path keyword <<< "$svc"

  echo -e "${BOLD}${name}${NC} (port ${port})"

  # Check .env (skip frontend — it uses VITE_ vars, not DATABASE_URL)
  if [[ "$name" != "frontend" ]]; then
    check_env "$name" "$dir" || ALL_OK=false
  else
    echo -e "  ${GREEN}[OK]${NC} frontend uses VITE_ env vars from .env"
  fi

  # Check node_modules
  check_deps "$dir" || ALL_OK=false
done

echo ""

if [[ "$ALL_OK" == "false" ]]; then
  echo -e "${YELLOW}⚠  Some .env issues detected. Services will start but may fail at runtime.${NC}"
  echo -e "${YELLOW}   Fix the issues above before continuing for full functionality.${NC}"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
  fi
fi

# Phase 2: Start services
echo -e "${BOLD}Phase 2: Starting services${NC}"
echo "────────────────────────────"

for svc in "${SERVICES[@]}"; do
  IFS='|' read -r name dir port cmd health_path keyword <<< "$svc"

  echo -e "${CYAN}Starting ${name}...${NC}"
  (cd "$dir" && $cmd > /tmp/${name}.log 2>&1) &
  pid=$!
  PIDS+=("$pid")
  echo -e "  PID: ${pid} → logging to /tmp/${name}.log"
done

echo ""

# Phase 3: Health checks
echo -e "${BOLD}Phase 3: Health checks${NC}"
echo "─────────────────────────────"

# Give services time to boot
echo -n "Waiting for services to boot"
for i in {1..5}; do
  echo -n "."
  sleep 1
done
echo ""

ALL_ALIVE=true

for svc in "${SERVICES[@]}"; do
  IFS='|' read -r name dir port cmd health_path keyword <<< "$svc"

  echo -e "${BOLD}${name}${NC} (port ${port})"
  health_check "$port" "$health_path" "$keyword" || ALL_ALIVE=false

  # Show last few lines of log if dead
  if [[ -f "/tmp/${name}.log" ]]; then
    # Check for common errors in the log
    if grep -qi "Missing DATABASE_URL\|Missing SUPABASE" "/tmp/${name}.log" 2>/dev/null; then
      echo -e "  ${RED}[ENV ISSUE]${NC} .env variables not loaded — check dotenv configuration"
    fi
    if grep -qi "EADDRINUSE" "/tmp/${name}.log" 2>/dev/null; then
      echo -e "  ${RED}[PORT CONFLICT]${NC} Port ${port} is already in use"
    fi
    if grep -qi "ERR_MODULE_NOT_FOUND\|Cannot find module" "/tmp/${name}.log" 2>/dev/null; then
      echo -e "  ${RED}[DEPS ISSUE]${NC} Missing modules — run: cd ${dir} && npm install"
    fi
  fi
done

echo ""

# Summary
echo -e "${BOLD}═══════════════════════════════════════════════════════════"
if [[ "$ALL_ALIVE" == "true" ]]; then
  echo -e "${GREEN}✓  All services are alive and running!${NC}"
else
  echo -e "${YELLOW}⚠  Some services failed to start. Check logs above.${NC}"
  echo -e "    View full logs: cat /tmp/<service-name>.log"
fi
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:   ${CYAN}http://localhost:3000${NC}"
echo -e "  Auth:       ${CYAN}http://localhost:5001${NC}"
echo -e "  Dashboard:  ${CYAN}http://localhost:5002${NC}"
echo -e "  Project:    ${CYAN}http://localhost:5003${NC}"
echo -e "  Profile:    ${CYAN}http://localhost:5004${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services"
echo ""

# Keep script alive — wait for background processes
wait
