# Add Event Dropdown Feature

## Overview

Convert the "Add Event" button on the chart header to a dropdown menu that allows users to choose between different event types.

## Current Behavior

- Clicking "+ Add Event" opens the ScenarioEventModal directly

## Proposed Behavior

- Clicking "+ Add Event" shows a dropdown with options:
  1. **Property** - Opens PropertyPlannerModal (for creating property scenarios)
  2. **Custom Event** - Opens ScenarioEventModal (existing behavior)

## UI Design

```
[ + Add Event ▼ ]
      ┌─────────────────┐
      │ 🏠 Property     │  → Opens PropertyPlannerModal
      │ ✨ Custom Event │  → Opens ScenarioEventModal
      └─────────────────┘
```

## Files to Modify

- `frontend/src/components/dashboard/projections/ChartHeader.tsx` - Replace button with dropdown
- `frontend/src/components/dashboard/Dashboard.tsx` - Add handler for property option

## Implementation Notes

- Use existing `CustomDropdown` component or a simple popover menu
- Property option should call `setShowPropertyPlanner(true)`
- Custom Event option should call existing `onAddScenario` callback

## Status

- [ ] Not started
