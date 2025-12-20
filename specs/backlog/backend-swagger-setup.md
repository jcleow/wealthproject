# OpenAPI/Swagger Documentation

This project now includes OpenAPI/Swagger documentation for testing all API endpoints.

## Accessing Swagger UI

1. Start the backend server:
   ```bash
   cd backend
   go run cmd/server/main.go
   ```

2. Open Swagger UI in your browser:
   ```
   http://localhost:8080/swagger/index.html
   ```

## Using Swagger UI

The Swagger UI provides an interactive interface where you can:

- Browse all available API endpoints organized by tags
- View request/response schemas
- Test endpoints directly from the browser
- See example payloads for each endpoint

### Available Endpoint Groups

- **Health** - Health checks and system information
- **Chat** - AI chat interactions with financial tools
- **Timeline** - Financial timeline management
- **Actions** - Execute financial actions
- **Scenario Events** - Manage scenario events

## Updating the Documentation

When you add or modify API endpoints:

1. Add Swagger annotations to your handler functions:
   ```go
   // @Summary Your endpoint summary
   // @Description Detailed description
   // @Tags YourTag
   // @Accept json
   // @Produce json
   // @Param paramName query string false "Parameter description"
   // @Success 200 {object} YourResponseType
   // @Router /your/path [get]
   func YourHandler(w http.ResponseWriter, r *http.Request) {
       // handler code
   }
   ```

2. Regenerate the Swagger documentation:
   ```bash
   cd /Users/jitcorn/assetra3
   ~/go/bin/swag init -d backend/cmd/server -g main.go --output ./docs --parseDependency --parseInternal
   ```

3. Restart the server to see the updated documentation

## Swagger Annotations Reference

Common annotations:
- `@Summary` - Short description of the endpoint
- `@Description` - Detailed description
- `@Tags` - Group endpoints together
- `@Accept` - Input content type (e.g., json)
- `@Produce` - Output content type (e.g., json)
- `@Param` - Define parameters (query, path, body, header)
- `@Success` - Success response (code, type, description)
- `@Failure` - Error response (code, type, description)
- `@Router` - API path and HTTP method

## Example Endpoints to Test

1. **Health Check**: `GET /api/v1/health`
2. **Get Timeline**: `GET /api/v1/financial/timeline`
3. **Chat**: `POST /api/v1/chat`
4. **Execute Actions**: `POST /api/v1/financial/actions/dispatch`

## Notes

- The base path for all API endpoints is `/api/v1`
- Some endpoints require authentication headers
- Use the "Try it out" button to test endpoints directly
