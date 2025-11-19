package middleware

import (
	"net/http"
	"strings"
)

type VersionMiddleware struct {
	supportedVersions  map[string]bool
	deprecatedVersions map[string]string
}

func NewVersionMiddleware() *VersionMiddleware {
	return &VersionMiddleware{
		supportedVersions: map[string]bool{
			"v1": true,
		},
		deprecatedVersions: map[string]string{
			// "v1": "Version v1 will be deprecated on 2024-07-01. Please upgrade to v2.",
		},
	}
}

func (v *VersionMiddleware) ValidateVersion(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		version := v.extractVersion(r)

		if !v.supportedVersions[version] {
			writeErrorResponse(w, 400, "unsupported_api_version",
				"API version '"+version+"' is not supported", nil)
			return
		}

		// Add version to response headers
		w.Header().Set("API-Version", version)

		// Add deprecation warning if applicable
		if warning, deprecated := v.deprecatedVersions[version]; deprecated {
			w.Header().Set("X-API-Deprecation-Warning", warning)
		}

		next.ServeHTTP(w, r)
	})
}

func (v *VersionMiddleware) extractVersion(r *http.Request) string {
	// First try to get version from URL path
	path := r.URL.Path
	if strings.HasPrefix(path, "/api/v") {
		parts := strings.Split(path, "/")
		if len(parts) >= 3 {
			return parts[2] // Extract "v1" from "/api/v1/..."
		}
	}

	// Fallback to header
	if headerVersion := r.Header.Get("API-Version"); headerVersion != "" {
		return headerVersion
	}

	// Default to v1
	return "v1"
}
