#!/bin/bash

# Exit immediately if a command fails
set -e

# Setup colors for console outputs
HEX_AMBER="\033[38;2;240;165;0m"
HEX_COBALT="\033[38;2;91;141;239m"
COLOR_RESET="\033[0m"
COLOR_BOLD="\033[1m"
COLOR_DIM="\033[2m"
COLOR_GREEN="\033[32m"
COLOR_RED="\033[31m"

# Resolve directories properly so start.sh can be called from anywhere
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        touch .env
    fi
fi

NO_BROWSER=false
DRY_RUN=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --no-browser)
            NO_BROWSER=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
    esac
done

# Print banner
[ -t 1 ] && [ -n "$TERM" ] && clear
echo -e "${HEX_AMBER}${COLOR_BOLD}"
echo "  ⚡──────────────────────────────────────────⚡"
echo "        BRASS TACKS : LOCAL RESUME ENGINE     "
echo "  ⚡──────────────────────────────────────────⚡"
echo -e "${COLOR_RESET}"

# Check and prompt for Gemini API Key if missing
if [ "$DRY_RUN" = false ]; then
    if ! grep -q "^GEMINI_API_KEY=AI" .env && ! grep -q "^GEMINI_API_KEY=.[a-zA-Z0-9]" .env; then
        echo -e "${HEX_COBALT}🔑 GEMINI API KEY REQUIRED${COLOR_RESET}"
        echo "Brass Tacks needs a free Gemini API key to write your resumes."
        echo "Get one here: https://aistudio.google.com/apikey"
        echo ""
        read -r -p "Paste your Gemini API key here and press Enter: " user_key
        if [ -n "$user_key" ]; then
            sed "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$user_key/" .env > .env.tmp && mv .env.tmp .env
            echo -e "${COLOR_GREEN}✓ API key saved successfully!${COLOR_RESET}\n"
        else
            echo -e "${COLOR_RED}Warning: API key was left empty. You will need to add it to the .env file manually before launching.${COLOR_RESET}\n"
        fi
    fi
fi

# Verify Container Engine (Podman or Docker)
CONTAINER_ENGINE=""
COMPOSE_CMD=""

check_engines() {
    if command -v podman &> /dev/null; then
        CONTAINER_ENGINE="podman"
        if podman compose version &> /dev/null; then
            COMPOSE_CMD="podman compose"
        elif command -v podman-compose &> /dev/null; then
            COMPOSE_CMD="podman-compose"
        fi
    elif command -v docker &> /dev/null; then
        CONTAINER_ENGINE="docker"
        if docker compose version &> /dev/null; then
            COMPOSE_CMD="docker compose"
        elif command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        fi
    fi
}

check_engines

# If neither is found, try auto-install or guide the user
if [ -z "$CONTAINER_ENGINE" ] || [ -z "$COMPOSE_CMD" ]; then
    echo -e "${COLOR_RED}⚠️ HELPER PROGRAM NOT FOUND!${COLOR_RESET}"
    echo "Brass Tacks needs a helper program (Docker or Podman) to run."
    echo ""
    
    IS_MAC=false
    HAS_BREW=false
    if [[ "$OSTYPE" == "darwin"* ]]; then
        IS_MAC=true
        if command -v brew &> /dev/null; then
            HAS_BREW=true
        fi
    fi
    
    if [ "$IS_MAC" = true ] && [ "$HAS_BREW" = true ]; then
        echo -e "Would you like to install it automatically right now?"
        echo -e "  [Y] Yes, install it for me (Recommended)"
        echo -e "  [N] No, I will install it myself"
        echo -e "  [Q] Quit"
        echo ""
        read -r -p "Select option [Y/N/Q]: " response
        
        # Convert response to uppercase
        response=$(echo "$response" | tr '[:lower:]' '[:upper:]')
        response=${response:-Y} # default to Y
        
        if [ "$response" = "Y" ]; then
            echo -e "\n${HEX_COBALT}⬇️ Downloading and installing... Please wait...${COLOR_RESET}"
            brew install podman
            echo -e "${HEX_COBALT}⚙️ Starting helper program...${COLOR_RESET}"
            podman machine init
            podman machine start
            check_engines
        elif [ "$response" = "Q" ]; then
            echo -e "${COLOR_RED}Exiting. Brass Tacks cannot run without a helper program.${COLOR_RESET}"
            exit 1
        fi
    fi
    
    # If still not found (either they chose No, or aren't on Mac with Brew)
    if [ -z "$CONTAINER_ENGINE" ] || [ -z "$COMPOSE_CMD" ]; then
        echo -e "\n${COLOR_BOLD}Please download and install one of these helper programs manually:${COLOR_RESET}"
        echo -e "  1. ${COLOR_BOLD}Docker Desktop${COLOR_RESET} (Recommended):"
        echo "     👉 https://www.docker.com/products/docker-desktop/"
        echo -e "  2. ${COLOR_BOLD}Podman Desktop${COLOR_RESET}:"
        echo "     👉 https://podman.io/docs/installation"
        echo ""
        echo "After installing it, open this launcher again."
        exit 1
    fi
fi

echo -e "${COLOR_GREEN}✓ Using container engine: ${CONTAINER_ENGINE} (${COMPOSE_CMD})${COLOR_RESET}"

# Verify Podman Machine on macOS if using Podman
if [ "$CONTAINER_ENGINE" = "podman" ] && [[ "$OSTYPE" == "darwin"* ]]; then
    if ! podman machine info &> /dev/null; then
        echo -e "${HEX_COBALT}⚙️ Podman machine is not initialized or started. Attempting to start...${COLOR_RESET}"
        podman machine start || {
            echo -e "${HEX_COBALT}Initializing new Podman machine...${COLOR_RESET}"
            podman machine init
            podman machine start
        }
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${COLOR_GREEN}✓ Dry-run completed. All validations passed.${COLOR_RESET}"
    exit 0
fi

echo -e "${HEX_COBALT}📦 Starting all containerized services (Postgres, Qdrant, Parser, API, Frontend)...${COLOR_RESET}"
$COMPOSE_CMD up -d

# Helper function to check health via HTTP
wait_for_http() {
    local url=$1
    local name=$2
    local max_attempts=60
    local attempt=1
    
    echo -e "${COLOR_DIM}Waiting for $name to initialize...${COLOR_RESET}"
    while ! curl -s -f "$url" &> /dev/null; do
        sleep 1
        attempt=$((attempt + 1))
        if [ $attempt -gt $max_attempts ]; then
            echo -e "${COLOR_RED}❌ Timeout waiting for $name to respond at $url.${COLOR_RESET}"
            return 1
        fi
    done
    return 0
}

# Wait for frontend first
wait_for_http "http://localhost:3000" "Frontend Dashboard"

# Wait for proxy backend and database connection
wait_for_http "http://localhost:3000/health" "Backend API Engine"

# Function to clean up on exit
cleanup() {
    echo -e "\n${HEX_AMBER}🛑 Shutting down all Brass Tacks services...${COLOR_RESET}"
    echo -e "${COLOR_DIM}Stopping containers...${COLOR_RESET}"
    $COMPOSE_CMD down &> /dev/null
    echo -e "${COLOR_GREEN}✓ Cleanup complete. Goodbye!${COLOR_RESET}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and exit signals
trap cleanup SIGINT SIGTERM EXIT

echo -e "\n${COLOR_GREEN}${COLOR_BOLD}🎉 Brass Tacks is fully operational!${COLOR_RESET}"

if [ "$NO_BROWSER" = false ]; then
    echo -e "${HEX_COBALT}Opening browser to http://localhost:3000...${COLOR_RESET}"
    # Platform agnostic browser open
    if command -v open &> /dev/null; then
        open http://localhost:3000
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v start &> /dev/null; then
        start http://localhost:3000
    else
        echo -e "${HEX_COBALT}Please open http://localhost:3000 in your browser.${COLOR_RESET}"
    fi
else
    echo -e "${HEX_COBALT}Brass Tacks is running in headless mode. Open http://localhost:3000 in your browser.${COLOR_RESET}"
fi

echo -e "\n${COLOR_BOLD}Press [Ctrl+C] at any time to securely terminate all containers.${COLOR_RESET}"

# Keep script running to maintain logs/traps
while true; do
    sleep 2
done

