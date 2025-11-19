# Financial Chat Frontend

React frontend for the Financial Chat System - built without AI SDK dependencies to integrate with Go backend.

## Features

- **Chat Interface**: Matches the exact look and feel of the original system
- **Action Previews**: Manual approval workflow for financial actions
- **No AI SDK**: Custom hooks replace Vercel AI SDK for Go backend integration
- **Type Safe**: Full TypeScript implementation with Zod schemas

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Architecture

- **React 18** + **Vite** for fast development
- **TanStack Query** for server state management
- **Radix UI** components with exact design tokens
- **Tailwind CSS** with custom design system

## API Integration

The frontend integrates with Go backend endpoints:

- `POST /api/v1/chat` - Send messages and receive action proposals
- `POST /api/v1/financial/actions/dispatch` - Execute approved actions

## Key Components

- `useChat()` - Custom hook replacing AI SDK
- `ActionReviewCard` - Action preview with approval workflow
- `Messages` - Chat interface with exact styling
- `ChatInput` - Input component with send/stop controls