package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

type fakePropertyLinkStore struct {
	assets      map[string]repository.Asset
	liabilities map[string]repository.Liability
	scenarios   map[string]repository.PropertyScenario
	links       map[string]repository.PropertyLink
}

func newFakePropertyLinkStore() *fakePropertyLinkStore {
	return &fakePropertyLinkStore{
		assets:      map[string]repository.Asset{},
		liabilities: map[string]repository.Liability{},
		scenarios:   map[string]repository.PropertyScenario{},
		links:       map[string]repository.PropertyLink{},
	}
}

func (f *fakePropertyLinkStore) GetAsset(_ context.Context, id string) (repository.Asset, error) {
	a, ok := f.assets[id]
	if !ok {
		return repository.Asset{}, repository.ErrNotFound
	}
	return a, nil
}

func (f *fakePropertyLinkStore) ConvertAssetToProperty(_ context.Context, id string) (repository.Asset, error) {
	a, ok := f.assets[id]
	if !ok {
		return repository.Asset{}, repository.ErrNotFound
	}
	a.Category = "property"
	f.assets[id] = a
	return a, nil
}

func (f *fakePropertyLinkStore) GetLiability(_ context.Context, id string) (repository.Liability, error) {
	li, ok := f.liabilities[id]
	if !ok {
		return repository.Liability{}, repository.ErrNotFound
	}
	return li, nil
}

func (f *fakePropertyLinkStore) ConvertLiabilityToProperty(_ context.Context, id string) (repository.Liability, error) {
	li, ok := f.liabilities[id]
	if !ok {
		return repository.Liability{}, repository.ErrNotFound
	}
	li.Category = "property"
	f.liabilities[id] = li
	return li, nil
}

func (f *fakePropertyLinkStore) GetPropertyScenario(_ context.Context, id string) (repository.PropertyScenario, error) {
	s, ok := f.scenarios[id]
	if !ok {
		return repository.PropertyScenario{}, repository.ErrNotFound
	}
	return s, nil
}

func (f *fakePropertyLinkStore) CreatePropertyScenario(_ context.Context, ps repository.PropertyScenario) (repository.PropertyScenario, error) {
	id := "scn-" + time.Now().Format("150405.000000")
	ps.ID = id
	ps.UpdatedAt = time.Now()
	f.scenarios[id] = ps
	return ps, nil
}

func (f *fakePropertyLinkStore) CreateOrReplacePropertyLink(_ context.Context, link repository.PropertyLink) (repository.PropertyLink, error) {
	for _, existing := range f.links {
		if existing.PropertyScenarioID == link.PropertyScenarioID && existing.AssetID == link.AssetID {
			existing.LiabilityID = link.LiabilityID
			existing.UpdatedAt = time.Now()
			f.links[existing.ID] = existing
			return existing, nil
		}
	}
	link.ID = "link-" + time.Now().Format("150405.000000")
	link.CreatedAt = time.Now()
	link.UpdatedAt = link.CreatedAt
	f.links[link.ID] = link
	return link, nil
}

func (f *fakePropertyLinkStore) UpdatePropertyLink(_ context.Context, link repository.PropertyLink) (repository.PropertyLink, error) {
	if _, ok := f.links[link.ID]; !ok {
		return repository.PropertyLink{}, repository.ErrNotFound
	}
	link.CreatedAt = f.links[link.ID].CreatedAt
	link.UpdatedAt = time.Now()
	f.links[link.ID] = link
	return link, nil
}

func (f *fakePropertyLinkStore) ListPropertyLinksByScenario(_ context.Context, scenarioID string) ([]repository.PropertyLink, error) {
	var out []repository.PropertyLink
	for _, l := range f.links {
		if l.PropertyScenarioID == scenarioID {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakePropertyLinkStore) ListPropertyLinksByAsset(_ context.Context, assetID string) ([]repository.PropertyLink, error) {
	var out []repository.PropertyLink
	for _, l := range f.links {
		if l.AssetID == assetID {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakePropertyLinkStore) ListPropertyLinksByLiability(_ context.Context, liabilityID string) ([]repository.PropertyLink, error) {
	var out []repository.PropertyLink
	for _, l := range f.links {
		if l.LiabilityID == liabilityID {
			out = append(out, l)
		}
	}
	return out, nil
}

func TestPropertyLinkCreateCreatesScenarioAndConverts(t *testing.T) {
	store := newFakePropertyLinkStore()
	store.assets["a1"] = repository.Asset{ID: "a1", Category: "other"}
	store.liabilities["l1"] = repository.Liability{ID: "l1", Category: "other"}

	handler := NewPropertyLinkHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	body := bytes.NewBufferString(`{"asset_id":"a1","liability_id":"l1"}`)
	req := httptest.NewRequest(http.MethodPost, "/property-links", body)
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Link     repository.PropertyLink     `json:"property_link"`
		Scenario repository.PropertyScenario `json:"property_scenario"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Scenario.ID == "" {
		t.Fatalf("expected scenario to be created")
	}
	if resp.Link.PropertyScenarioID != resp.Scenario.ID {
		t.Fatalf("expected link to reference created scenario")
	}
	if store.assets["a1"].Category != "property" {
		t.Fatalf("asset not converted to property")
	}
	if store.liabilities["l1"].Category != "property" {
		t.Fatalf("liability not converted to property")
	}
}

func TestPropertyLinkUpdate(t *testing.T) {
	store := newFakePropertyLinkStore()
	store.assets["a1"] = repository.Asset{ID: "a1", Category: "property"}
	store.liabilities["l1"] = repository.Liability{ID: "l1", Category: "property"}
	store.liabilities["l2"] = repository.Liability{ID: "l2", Category: "property"}
	store.scenarios["s1"] = repository.PropertyScenario{ID: "s1"}
	store.links["link-1"] = repository.PropertyLink{
		ID:                 "link-1",
		PropertyScenarioID: "s1",
		AssetID:            "a1",
		LiabilityID:        "l1",
	}

	handler := NewPropertyLinkHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	body := bytes.NewBufferString(`{"property_scenario_id":"s1","asset_id":"a1","liability_id":"l2"}`)
	req := httptest.NewRequest(http.MethodPut, "/property-links/link-1", body)
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
	var resp repository.PropertyLink
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.LiabilityID != "l2" {
		t.Fatalf("expected liability updated to l2, got %s", resp.LiabilityID)
	}
}

func TestPropertyLinkList(t *testing.T) {
	store := newFakePropertyLinkStore()
	store.links["link-1"] = repository.PropertyLink{ID: "link-1", PropertyScenarioID: "s1"}
	store.links["link-2"] = repository.PropertyLink{ID: "link-2", PropertyScenarioID: "s2"}

	handler := NewPropertyLinkHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/property-links?property_scenario_id=s1", nil)
	rr := httptest.NewRecorder()

	mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}
	var links []repository.PropertyLink
	if err := json.Unmarshal(rr.Body.Bytes(), &links); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(links) != 1 || links[0].ID != "link-1" {
		t.Fatalf("expected one link (link-1), got %+v", links)
	}
}

func TestPropertyLinkCreateOverwrites(t *testing.T) {
	store := newFakePropertyLinkStore()
	store.assets["a1"] = repository.Asset{ID: "a1", Category: "property"}
	store.liabilities["l1"] = repository.Liability{ID: "l1", Category: "property"}
	store.liabilities["l2"] = repository.Liability{ID: "l2", Category: "property"}
	store.scenarios["s1"] = repository.PropertyScenario{ID: "s1"}

	handler := NewPropertyLinkHandler(store)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	// First create
	body1 := bytes.NewBufferString(`{"property_scenario_id":"s1","asset_id":"a1","liability_id":"l1"}`)
	req1 := httptest.NewRequest(http.MethodPost, "/property-links", body1)
	rr1 := httptest.NewRecorder()
	mux.ServeHTTP(rr1, req1)
	if rr1.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr1.Code)
	}

	// Overwrite with new liability; expect 200 and liability updated
	body2 := bytes.NewBufferString(`{"property_scenario_id":"s1","asset_id":"a1","liability_id":"l2"}`)
	req2 := httptest.NewRequest(http.MethodPost, "/property-links", body2)
	rr2 := httptest.NewRecorder()
	mux.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("expected status 200 on overwrite, got %d", rr2.Code)
	}
	var resp struct {
		Link repository.PropertyLink `json:"property_link"`
	}
	if err := json.Unmarshal(rr2.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Link.LiabilityID != "l2" {
		t.Fatalf("expected liability overwritten to l2, got %s", resp.Link.LiabilityID)
	}
}
