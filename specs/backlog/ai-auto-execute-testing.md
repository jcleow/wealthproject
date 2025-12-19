# Auto-Execute Feature Testing Guide

## Overview

The auto-execute feature allows AI-suggested actions to be executed immediately without requiring user confirmation. When disabled (default), users see a preview and must approve actions before they run.

---

## Test Setup

1. Start the backend server: `go run ./cmd/server`
2. Start the frontend: `npm run dev`
3. Open the application in browser
4. Ensure you have some existing financial data (or create some manually first)

---

## Test 1: Verify Auto-Execute Toggle in Settings

**Steps:**
1. Open Settings modal (gear icon)
2. Go to "General" section

**Expected:**
- [ ] "Auto-Execute AI Actions" toggle visible at bottom of General settings
- [ ] Default state is OFF
- [ ] Toggle label shows "Execute AI-suggested changes immediately without confirmation"
- [ ] When toggled ON, warning appears: "⚠️ Actions will be executed immediately. Use with caution."

---

## Test 2: Standard Mode (Auto-Execute OFF) - Tool Preview

**Steps:**
1. Ensure auto-execute is OFF in settings (Save if changed)
2. In chat, type:
   ```
   Add a new income source called "Freelance" for $2000/month
   ```

**Expected:**
- [ ] AI responds with a preview of the action
- [ ] You see pending action card(s) with "Execute" button
- [ ] The income is NOT created until you click Execute
- [ ] After clicking Execute, income appears in timeline

---

## Test 3: Auto-Execute Mode ON - Immediate Execution

**Steps:**
1. Open Settings, enable auto-execute toggle, click Save
2. In chat, type:
   ```
   Add a new expense called "Gym Membership" for $50/month
   ```

**Expected:**
- [ ] AI immediately executes the action (no confirmation prompt)
- [ ] Response indicates the expense was created successfully
- [ ] New expense visible in timeline/financial data
- [ ] No "pending actions" or approval buttons shown

---

## Test 4: Auto-Execute with Multiple Actions

**Steps:**
1. Keep auto-execute ON
2. In chat, type:
   ```
   Add an asset called "Emergency Fund" worth $10,000 and a liability called "Credit Card" with balance $2,000
   ```

**Expected:**
- [ ] Both items created immediately without prompts
- [ ] Response confirms both were created
- [ ] Both items appear in financial data/timeline

---

## Test 5: Read-Only Operations (Should Work Same Either Way)

**Steps:**
1. With auto-execute ON, type:
   ```
   What is my current net worth?
   ```
2. Note the response
3. Toggle auto-execute OFF in Settings, Save
4. Ask the same question again

**Expected:**
- [ ] Both queries return answers immediately
- [ ] No approval prompts for read-only operations in either mode
- [ ] Answers are consistent

---

## Test 6: Toggle Persistence

**Steps:**
1. Enable auto-execute in Settings
2. Click Save
3. Refresh the page (F5 or Cmd+R)
4. Open Settings again

**Expected:**
- [ ] Auto-execute toggle is still ON after refresh
- [ ] Setting persisted to database

---

## Test 7: Update Existing Item with Auto-Execute

**Steps:**
1. With auto-execute ON, type:
   ```
   Update the Gym Membership expense to $75/month
   ```

**Expected:**
- [ ] Expense is updated immediately
- [ ] Response confirms the update
- [ ] Timeline reflects new amount

---

## Test 8: Delete Item with Auto-Execute

**Steps:**
1. With auto-execute ON, type:
   ```
   Delete the Gym Membership expense
   ```

**Expected:**
- [ ] Expense is deleted immediately
- [ ] Response confirms deletion
- [ ] Item no longer appears in timeline

---

## Test 9: Error Handling in Auto-Execute Mode

**Steps:**
1. With auto-execute ON, type:
   ```
   Delete the expense called "NonexistentItem12345"
   ```

**Expected:**
- [ ] AI handles error gracefully
- [ ] Response indicates item was not found or operation failed
- [ ] No crash or hanging state
- [ ] Chat remains functional

---

## Test 10: Switching Modes Mid-Conversation

**Steps:**
1. Start with auto-execute OFF
2. Type: `Add an income called "Bonus" for $5000/year`
3. See preview (don't execute yet)
4. Open Settings, enable auto-execute, Save
5. Type: `Add an expense called "Insurance" for $200/month`

**Expected:**
- [ ] First action still shows as pending (from when auto-execute was OFF)
- [ ] Second action executes immediately (auto-execute now ON)
- [ ] Both modes work correctly in same session

---

## API-Level Verification (Browser Dev Tools)

Open browser dev tools (F12) → Network tab

### Check setting save:
1. Toggle auto-execute and click Save
2. Look for `PUT` or `PATCH` to `/api/v1/user-settings`
3. Request body should include `"autoExecuteTools": true`

### Check setting load:
1. Refresh page
2. Look for `GET /api/v1/user-settings`
3. Response should include `"autoExecuteTools": true` (if enabled)

### Check immediate execution:
1. With auto-execute ON, create an item via chat
2. Should see direct API call to create endpoint (e.g., `POST /api/v1/expenses`)
3. No intermediate "pending" state in network traffic

---

## Test Results Summary

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| 1. Toggle in Settings | | | |
| 2. Standard Mode Preview | | | |
| 3. Auto-Execute Immediate | | | |
| 4. Multiple Actions | | | |
| 5. Read-Only Operations | | | |
| 6. Toggle Persistence | | | |
| 7. Update with Auto-Execute | | | |
| 8. Delete with Auto-Execute | | | |
| 9. Error Handling | | | |
| 10. Mode Switching | | | |

---

## Troubleshooting

### Setting not persisting
- Check browser console for errors on Settings save
- Verify database migration ran: `auto_execute_tools` column exists in `user_settings` table

### Auto-execute not working
- Check backend logs for errors in chat handler
- Verify `GetAutoExecuteTools` is being called (add logging if needed)
- Check that user ID is being passed correctly

### Actions still showing preview when auto-execute is ON
- Clear browser cache and refresh
- Check that Settings save was successful
- Verify the setting is being read correctly on chat requests
