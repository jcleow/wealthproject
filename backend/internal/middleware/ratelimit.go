package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter implements per-IP rate limiting for API endpoints
// SECURITY: Prevents brute force attacks, DoS, and API abuse
type RateLimiter struct {
	visitors map[string]*visitorLimiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

type visitorLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter with the specified requests per second and burst size
// Example: NewRateLimiter(10, 20) allows 10 req/sec with bursts up to 20
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitorLimiter),
		rate:     rate.Limit(rps),
		burst:    burst,
	}

	// Start background goroutine to clean up old visitors
	go rl.cleanupVisitors()

	return rl
}

// getVisitor returns the rate limiter for a given IP, creating one if needed
func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.visitors[ip] = &visitorLimiter{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupVisitors removes old visitor entries every minute
func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(time.Minute)

		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// getIP extracts the client IP from the request, checking X-Forwarded-For first
func getIP(r *http.Request) string {
	// Check X-Forwarded-For header (set by reverse proxies)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP in the chain (original client)
		for i := 0; i < len(forwarded); i++ {
			if forwarded[i] == ',' {
				return forwarded[:i]
			}
		}
		return forwarded
	}

	// Check X-Real-IP header
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

// RateLimit middleware limits requests per IP address
// SECURITY: Protects against brute force attacks, DoS, and API abuse
func RateLimit(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getIP(r)
			limiter := rl.getVisitor(ip)

			if !limiter.Allow() {
				w.Header().Set("Retry-After", "1")
				w.Header().Set("X-RateLimit-Limit", "10")
				http.Error(w, "Rate limit exceeded. Please slow down.", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// DefaultRateLimiter returns a rate limiter with sensible defaults
// 10 requests per second with a burst of 20
func DefaultRateLimiter() *RateLimiter {
	return NewRateLimiter(10, 20)
}
