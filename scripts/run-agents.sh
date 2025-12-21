#!/bin/bash

# AI Scenario Implementation - 3 Agent Coordinator using tmux
# This script runs 3 Claude agents in parallel with dependency management
#
# Git Workflow:
# - Each agent works on their own branch (feat/agent1-context, feat/agent2-scenario-crud, feat/agent3-analysis)
# - When done, agents create PRs to the intermediary branch (feat/ai-scenario-handling)
# - User reviews and merges PRs to intermediary branch
# - Final PR from feat/ai-scenario-handling to main is created separately

set -e

BASE_DIR="/Users/jitcorn"
SIGNAL_DIR="$BASE_DIR/assetra3/.agent-signals"
MAIN_REPO="$BASE_DIR/assetra3"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check for tmux
if ! command -v tmux &> /dev/null; then
    echo "tmux is required. Install with: brew install tmux"
    exit 1
fi

# Ensure intermediary branch exists
echo -e "${BLUE}Checking intermediary branch...${NC}"
cd "$MAIN_REPO"
if ! git show-ref --verify --quiet refs/heads/feat/ai-scenario-handling; then
    echo -e "${YELLOW}Creating intermediary branch feat/ai-scenario-handling...${NC}"
    git branch feat/ai-scenario-handling 2>/dev/null || true
fi

# Push intermediary branch if not on remote
if ! git ls-remote --heads origin feat/ai-scenario-handling | grep -q feat/ai-scenario-handling; then
    echo -e "${YELLOW}Pushing intermediary branch to origin...${NC}"
    git push -u origin feat/ai-scenario-handling 2>/dev/null || true
fi

# Create signal directory
mkdir -p "$SIGNAL_DIR"
rm -f "$SIGNAL_DIR"/*.done 2>/dev/null || true

SESSION="ai-agents"

# Kill existing session if any
tmux kill-session -t $SESSION 2>/dev/null || true

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AI Scenario Implementation${NC}"
echo -e "${BLUE}  Launching 3 Claude Agents in tmux${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create new tmux session with Agent 1
tmux new-session -d -s $SESSION -n "agent1" -c "$BASE_DIR/assetra3-agent1"

# Create panes for Agent 2 and Agent 3
tmux new-window -t $SESSION -n "agent2" -c "$BASE_DIR/assetra3-agent2"
tmux new-window -t $SESSION -n "agent3" -c "$BASE_DIR/assetra3-agent3"

# Agent 1 - Context & Settings (starts immediately)
tmux send-keys -t $SESSION:agent1 "echo '🚀 Agent 1: Context & Settings'" Enter
tmux send-keys -t $SESSION:agent1 "echo 'Starting Claude... Type: /agent1-context'" Enter
tmux send-keys -t $SESSION:agent1 "echo ''" Enter
tmux send-keys -t $SESSION:agent1 "echo 'When done, run: touch $SIGNAL_DIR/agent1.done'" Enter
tmux send-keys -t $SESSION:agent1 "echo ''" Enter
tmux send-keys -t $SESSION:agent1 "claude" Enter

# Agent 3 - Analysis (starts immediately, no dependency)
tmux send-keys -t $SESSION:agent3 "echo '🚀 Agent 3: Analysis Tools'" Enter
tmux send-keys -t $SESSION:agent3 "echo 'Starting Claude... Type: /agent3-analysis'" Enter
tmux send-keys -t $SESSION:agent3 "echo ''" Enter
tmux send-keys -t $SESSION:agent3 "claude" Enter

# Agent 2 - Scenario CRUD (waits for Agent 1)
tmux send-keys -t $SESSION:agent2 "echo '⏳ Agent 2: Scenario CRUD Tools'" Enter
tmux send-keys -t $SESSION:agent2 "echo 'Waiting for Agent 1 to complete B0.1...'" Enter
tmux send-keys -t $SESSION:agent2 "echo ''" Enter
tmux send-keys -t $SESSION:agent2 "while [ ! -f $SIGNAL_DIR/agent1.done ]; do sleep 5; echo 'Still waiting...'; done" Enter
tmux send-keys -t $SESSION:agent2 "echo '✅ Agent 1 completed! Starting Agent 2...'" Enter
tmux send-keys -t $SESSION:agent2 "echo 'Type: /agent2-scenario-crud'" Enter
tmux send-keys -t $SESSION:agent2 "claude" Enter

echo -e "${GREEN}Tmux session '$SESSION' created with 3 windows${NC}"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo ""
echo "1. Attach to the session:"
echo -e "   ${GREEN}tmux attach -t $SESSION${NC}"
echo ""
echo "2. Navigate between agents:"
echo "   - Ctrl+B, 1 = Agent 1 (Context)"
echo "   - Ctrl+B, 2 = Agent 2 (Scenario CRUD)"
echo "   - Ctrl+B, 3 = Agent 3 (Analysis)"
echo ""
echo "3. In each window, type the slash command shown"
echo ""
echo "4. When Agent 1 finishes B0.1, run in that window:"
echo -e "   ${GREEN}touch $SIGNAL_DIR/agent1.done${NC}"
echo "   This will unblock Agent 2"
echo ""
echo "5. Detach from tmux: Ctrl+B, D"
echo ""
echo -e "${YELLOW}Git Workflow:${NC}"
echo "- Each agent creates a PR to: feat/ai-scenario-handling"
echo "- Review & merge PRs in GitHub"
echo "- Then create final PR: feat/ai-scenario-handling -> main"
echo ""
echo -e "${BLUE}Attaching now...${NC}"
echo ""

# Attach to the session
tmux attach -t $SESSION
