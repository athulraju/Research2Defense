#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PORT=9000

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Research2Defense (R2D)                        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# Load .env if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

LOCAL_MODEL="${LOCAL_MODEL:-}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"

if ! command -v ollama &> /dev/null; then
  echo -e "${YELLOW}⚠ Ollama CLI not found.${NC}"
  echo "  Install Ollama from https://ollama.com if you want local AI generation."
  echo ""
else
  DETECTED_MODEL="$(ollama list | awk 'NR==2 {print $1}')"
  if [ -z "$LOCAL_MODEL" ] && [ -n "$DETECTED_MODEL" ]; then
    LOCAL_MODEL="$DETECTED_MODEL"
  fi
fi

if [ -n "$LOCAL_MODEL" ]; then
  echo -e "${GREEN}✓ Local model: ${LOCAL_MODEL}${NC}"
else
  echo -e "${YELLOW}⚠ No local model configured or detected.${NC}"
  echo "  Pull one with: ollama pull llama3.1:8b"
fi
echo -e "${GREEN}✓ Ollama endpoint: ${OLLAMA_BASE_URL}${NC}"
echo ""

if command -v ollama &> /dev/null && [ -n "$LOCAL_MODEL" ]; then
  if ! ollama list | awk 'NR>1 {print $1}' | grep -Fx "$LOCAL_MODEL" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Model $LOCAL_MODEL is not pulled yet.${NC}"
    echo "  Run: ollama pull $LOCAL_MODEL"
    echo ""
  else
    echo -e "${GREEN}✓ Ollama model available${NC}"
    echo ""
  fi
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}✗ Python 3 not found. Install from https://python.org${NC}"
  exit 1
fi

# Kill anything already on the port
EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo -e "${YELLOW}Port $PORT in use (PID $EXISTING_PID) — clearing it...${NC}"
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}✓ Port $PORT cleared${NC}"
fi

# Python venv
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}Creating Python virtual environment...${NC}"
  python3 -m venv venv
fi
source venv/bin/activate

# Install Python deps
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Python dependencies ready${NC}"

# Frontend
FRONTEND_DIR="$SCRIPT_DIR/app/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

if [[ "$*" == *"--rebuild"* ]]; then
  echo -e "${YELLOW}Rebuilding frontend...${NC}"
  cd "$FRONTEND_DIR"
  npm run build
  cd "$SCRIPT_DIR"
  echo -e "${GREEN}✓ Frontend rebuilt${NC}"
elif [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
  echo -e "${YELLOW}Building React frontend...${NC}"
  cd "$FRONTEND_DIR"
  if [ ! -d "node_modules" ]; then
    npm install --silent
  fi
  npm run build
  cd "$SCRIPT_DIR"
  echo -e "${GREEN}✓ Frontend built${NC}"
else
  echo -e "${GREEN}✓ Frontend ready (--rebuild to force)${NC}"
fi

echo ""
echo -e "${GREEN}Starting server on port $PORT...${NC}"
echo -e "${BLUE}➜  Open http://localhost:$PORT in your browser${NC}"
echo ""

cd "$SCRIPT_DIR/app/backend"
LOCAL_MODEL="$LOCAL_MODEL" OLLAMA_BASE_URL="$OLLAMA_BASE_URL" python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT --reload
