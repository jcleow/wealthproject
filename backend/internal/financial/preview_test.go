package financial

import (
	"testing"

	"financial-chat-system/backend/internal/llm"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestActionPreviewService_GeneratePreview_BasicAsset(t *testing.T) {
	svc := NewActionPreviewService(NewClient(nil))

	toolCall := llm.ToolCall{
		ID:   "call_1",
		Type: "function",
		Function: llm.FunctionCall{
			Name:      "createAsset",
			Arguments: `{"name":"Savings","currentValue":15000,"category":"cash_savings"}`,
		},
	}

	actions, err := svc.GeneratePreview([]llm.ToolCall{toolCall})
	require.NoError(t, err)
	require.Len(t, actions, 1)

	act := actions[0]
	assert.Equal(t, "call_1", act.CallID)
	assert.Equal(t, "createAsset", act.ToolName)
	assert.NotNil(t, act.EstimatedImpact)
	assert.Contains(t, act.FriendlyDescription, "Savings")
}

func TestActionPreviewService_GeneratePreview_InvalidJSON(t *testing.T) {
	svc := NewActionPreviewService(NewClient(nil))

	toolCall := llm.ToolCall{
		ID:   "call_bad",
		Type: "function",
		Function: llm.FunctionCall{
			Name:      "createAsset",
			Arguments: `{"broken":`, // malformed
		},
	}

	_, err := svc.GeneratePreview([]llm.ToolCall{toolCall})
	require.Error(t, err)
}

func TestActionPreviewService_AnalyzeDependencies(t *testing.T) {
	svc := NewActionPreviewService(NewClient(nil))

	create := llm.ToolCall{
		ID:   "call_create",
		Type: "function",
		Function: llm.FunctionCall{
			Name:      "createAsset",
			Arguments: `{"name":"A","assetType":"savings","currentValue":1}`,
		},
	}
	update := llm.ToolCall{
		ID:   "call_update",
		Type: "function",
		Function: llm.FunctionCall{
			Name:      "updateAsset",
			Arguments: `{"assetId":"123","currentValue":2}`,
		},
	}

	deps := svc.analyzeDependencies([]llm.ToolCall{create, update})
	assert.Equal(t, []string{"call_create"}, deps["call_update"])
}
