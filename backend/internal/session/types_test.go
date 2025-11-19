package session

import (
	"testing"
	"time"
)

func TestNewSessionStateInitializesFields(t *testing.T) {
	state := NewSessionState("sess-123", "chat-abc", "user-xyz")

	if state.SessionID != "sess-123" || state.ChatID != "chat-abc" || state.UserID != "user-xyz" {
		t.Fatalf("unexpected identifiers: %#v", state)
	}
	if len(state.ConversationFlow) != 0 {
		t.Fatalf("expected empty conversation flow")
	}
	if len(state.PendingActions) != 0 {
		t.Fatalf("expected no pending actions")
	}
	if state.CreatedAt.IsZero() || state.UpdatedAt.IsZero() {
		t.Fatalf("timestamps should be initialized")
	}
}

func TestSessionStatePendingActions(t *testing.T) {
	state := NewSessionState("sess-1", "chat", "user")

	actions := []PendingToolCall{
		{CallID: "1", ToolName: "createAsset"},
		{CallID: "2", ToolName: "createLiability"},
	}
	state.SetPendingActions(actions)

	if len(state.PendingActions) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(state.PendingActions))
	}
	if state.PendingActions[0].CallID != "1" || state.PendingActions[1].CallID != "2" {
		t.Fatalf("pending actions were not copied correctly: %#v", state.PendingActions)
	}

	state.ClearPendingActions()
	if len(state.PendingActions) != 0 {
		t.Fatalf("expected pending actions to be cleared")
	}
}

func TestAppendConversationStepDefaults(t *testing.T) {
	state := NewSessionState("sess-1", "chat", "user")
	step := ConversationStep{ToolName: "createAsset"}

	state.AppendConversationStep(step)

	if len(state.ConversationFlow) != 1 {
		t.Fatalf("expected one conversation step")
	}

	added := state.ConversationFlow[0]
	if added.StepID == "" {
		t.Fatalf("step should have generated ID")
	}
	if added.Timestamp.IsZero() {
		t.Fatalf("step should have timestamp")
	}

	// Ensure timestamps update
	if state.UpdatedAt.Before(state.CreatedAt) {
		t.Fatalf("updated timestamp should be newer")
	}

	// Provide custom metadata and ensure preserved
	existing := ConversationStep{
		StepID:    "custom",
		ToolName:  "updateAsset",
		Result:    map[string]interface{}{"status": "ok"},
		Timestamp: time.Now().Add(-time.Minute),
	}
	state.AppendConversationStep(existing)

	if state.ConversationFlow[1].StepID != "custom" {
		t.Fatalf("custom StepID should be preserved")
	}
	if !state.ConversationFlow[1].Timestamp.Equal(existing.Timestamp) {
		t.Fatalf("custom timestamp should be preserved")
	}
}
