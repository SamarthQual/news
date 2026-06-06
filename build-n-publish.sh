#!/bin/bash
BASEDIR=$(dirname $0)
cd ${BASEDIR}

# Colors
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Spinner frames (braille dots)
SPIN_FRAMES=(⠹ ⠺ ⠼ ⠴ ⠦ ⠧)

# Run command with spinner
run_with_spinner() {
    local msg=$1
    shift
    local i=0
    
    mkdir -p /tmp/build-logs
    local logfile="/tmp/build-logs/$(date +%s)-$$.log"
    touch "$logfile"
    chmod 644 "$logfile"

    # Print initial line
    echo -n "  $msg"

    # Run command in background (logs to file)
    "$@" >"$logfile" 2>&1 &
    local pid=$!

    # Animate while running
    while kill -0 $pid 2>/dev/null; do
        local frame=${SPIN_FRAMES[i++ % ${#SPIN_FRAMES[@]}]}
        printf "\r%s %s" "$frame" "$msg"
        sleep 0.2
    done

    wait $pid
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        printf "\r${GREEN}✔${NC} %s\n" "$msg"
    else
        printf "\r${RED}✘${NC} %s\n" "$msg"
        echo "---- LOGS ----"
        cat "$logfile"
        echo "--------------"
        rm "$logfile"
        exit 1
    fi

    rm "$logfile"
}

# Options for the menu
options=("Build Web API" "Publish WebApi to server" "Build WebApp" "Publish WebApp to server" "Run WebApi Local DB" "Run WebApi Prod DB" "Run WebApp" "Exit")

# Current selection
selected=0

# Function to draw menu
draw_menu() {
    clear
    echo "Use ↑/↓ arrows to navigate, Enter to select:"
    for i in "${!options[@]}"; do
        if [[ $i -eq $selected ]]; then
            # Highlight current option
            echo -e "> \e[32m${options[$i]}\e[0m"
        else
            echo "  ${options[$i]}"
        fi
    done
}

# Menu loop
while true; do
    draw_menu

    # Read key
    read -rsn1 key
    if [[ $key == $'\x1b' ]]; then
        read -rsn2 key
        case $key in
            "[A") # Up arrow
                ((selected--))
                if [ $selected -lt 0 ]; then
                    selected=$((${#options[@]} - 1))
                fi
                ;;
            "[B") # Down arrow
                ((selected++))
                if [ $selected -ge ${#options[@]} ]; then
                    selected=0
                fi
                ;;
        esac
    elif [[ $key == "" ]]; then
        # Enter pressed
        case $selected in
            0) echo
               run_with_spinner "Removing old api build" rm -rf backend/dist
               cd backend
               run_with_spinner "Building Web API" npx tsc --sourceMap false
               cd ..
               exit 0;;
            1) echo
               run_with_spinner "Publishing Web API" scp -i /e/AWS/KeyPair/admin-rirasoft-web-server-key.pem -r backend/dist/* ec2-user@15.207.71.124:/home/ec2-user/node-projects/blog/backend/dist/.
               exit 0;;
            2) echo
               run_with_spinner "Removing old webapp build" rm -rf frontend/dist
               cd frontend
               run_with_spinner "Building WebApp" ng build
               cd ..
               exit 0;;
            3) echo
               run_with_spinner "Publishing WebApp" scp -i /e/AWS/KeyPair/admin-rirasoft-web-server-key.pem -r frontend/dist/blog/* ec2-user@15.207.71.124:/home/ec2-user/node-projects/blog/frontend/blog/.
               exit 0;;
            4) echo
                cd backend
                npm run dev
                exit 0;;
            5) echo
                cd backend
                npm run start
                exit 0;;
            6) echo
                cd frontend
                npm run start
                exit 0;;
            7) echo "Exiting..."; exit 0;;
        esac
        read -p "Press any key to continue..." -n1
    fi
done