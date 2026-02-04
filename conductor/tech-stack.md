# Technology Stack

## Overview

The project leverages a modern, distributed architecture designed for scalability, performance, and maintainability.

## Backend

-   **Language:** Go (Golang)
    -   Chosen for its performance characteristics, concurrency model, and strong type safety, making it ideal for building robust API services.
-   **Framework:** Standard Go libraries and potentially specialized HTTP routers (e.g., Gin, Echo, not explicitly stated but common for REST APIs in Go).
-   **LLM Integration:**
    -   OpenAI GPT-4: For primary large language model capabilities and tool-calling.
    -   Anthropic Claude: Supported as an alternative or supplementary LLM provider.
-   **Database Driver:** Likely `database/sql` with a PostgreSQL driver (e.g., `lib/pq` or `pgx`).

## Frontend

-   **Framework/Library:** React 18
    -   A declarative, component-based JavaScript library for building user interfaces, chosen for its efficiency and widespread adoption.
-   **Language:** TypeScript
    -   Provides static typing to JavaScript, enhancing code quality, maintainability, and developer experience.
-   **Styling:** Not explicitly stated, but common choices include CSS-in-JS, Tailwind CSS, or component libraries like Material UI.
-   **Build Tool:** Likely Webpack or Vite (inferred from React 18 context).

## Database

-   **Type:** Relational Database
-   **Specific:** PostgreSQL
    -   A powerful, open-source object-relational database system known for its reliability, feature robustness, and performance.
-   **ORM/Query Builder:** Potentially `GORM`, `sqlc`, or direct `database/sql` usage (not explicitly stated).

## Development and Operations (DevOps)

-   **Containerization:** Docker & Docker Compose
    -   For consistent development environments and streamlined deployment.
-   **Build Automation:** Makefile
    -   Used for managing common development tasks like dependency installation, building, testing, and running services.
-   **Version Control:** Git
    -   Standard distributed version control system.

## Testing

-   **Backend:** Go's built-in testing framework (`testing` package).
-   **Frontend:** Likely React Testing Library, Jest, or similar.

## API

-   **Style:** REST APIs
-   **Documentation:** Swagger UI (inferred from `README.md` mentioning `/swagger/index.html`).
