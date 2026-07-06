package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	address      = ":8080"
	flowID       = "ops-profile-flow"
	loopID       = "loop-ops-profile-001"
	taskID       = "task-ops-profile-dashboard"
	schedulerID  = "c360.ops.source.opsprofile.function.scheduler"
	indexerID    = "c360.ops.source.opsprofile.service.indexer"
	graphID      = "c360.ops.graph.opsprofile.dataset.demo"
	trajectoryID = "c360.ops.trajectory.opsprofile.loop.latest"
)

type triple struct {
	Subject   string `json:"subject"`
	Predicate string `json:"predicate"`
	Object    any    `json:"object"`
}

type entity struct {
	ID      string   `json:"id"`
	Triples []triple `json:"triples"`
}

type edge struct {
	Subject   string `json:"subject"`
	Predicate string `json:"predicate"`
	Object    string `json:"object"`
}

type graphQLRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

var fixtureEntities = []entity{
	{
		ID: schedulerID,
		Triples: []triple{
			{Subject: schedulerID, Predicate: "ops.label", Object: "Ops profile scheduler"},
			{Subject: schedulerID, Predicate: "ops.status", Object: "running"},
			{Subject: schedulerID, Predicate: "ops.depends_on", Object: indexerID},
		},
	},
	{
		ID: indexerID,
		Triples: []triple{
			{Subject: indexerID, Predicate: "ops.label", Object: "Fixture graph indexer"},
			{Subject: indexerID, Predicate: "ops.status", Object: "healthy"},
			{Subject: indexerID, Predicate: "ops.produces", Object: graphID},
		},
	},
	{
		ID: graphID,
		Triples: []triple{
			{Subject: graphID, Predicate: "ops.label", Object: "Demo graph dataset"},
			{Subject: graphID, Predicate: "ops.entity_count", Object: "4"},
		},
	},
	{
		ID: trajectoryID,
		Triples: []triple{
			{Subject: trajectoryID, Predicate: "ops.label", Object: "Latest trajectory loop"},
			{Subject: trajectoryID, Predicate: "ops.observes", Object: schedulerID},
		},
	},
}

var fixtureEdges = []edge{
	{Subject: schedulerID, Predicate: "ops.depends_on", Object: indexerID},
	{Subject: indexerID, Predicate: "ops.produces", Object: graphID},
	{Subject: trajectoryID, Predicate: "ops.observes", Object: schedulerID},
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/components/types", handleComponentTypes)
	mux.HandleFunc("/flowbuilder/flows", handleFlows)
	mux.HandleFunc("/flowbuilder/flows/", handleFlowRuntime)
	mux.HandleFunc("/graphql", handleGraphQL)
	mux.HandleFunc("/graph-gateway/graphql", handleGraphQL)
	mux.HandleFunc("/trajectories", handleTrajectories)
	mux.HandleFunc("/trajectories/", handleTrajectoryDetail)

	server := &http.Server{
		Addr:              address,
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("ops-profile fixture listening on %s", address)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Printf("server failed: %v", err)
		os.Exit(1)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "healthy",
		"service":   "ops-profile-fixture",
		"timestamp": "2026-07-06T12:00:00Z",
	})
}

func handleComponentTypes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, []map[string]any{
		{
			"id":          "ops-profile-source",
			"name":        "Ops Profile Source",
			"type":        "input",
			"protocol":    "fixture",
			"category":    "input",
			"description": "Static source for UI-owned E2E gates",
			"schema":      map[string]any{},
		},
	})
}

func handleFlows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"flows": []map[string]any{
			{
				"id":            flowID,
				"name":          "Ops profile fixture flow",
				"runtime_state": "running",
			},
		},
	})
}

func handleFlowRuntime(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/flowbuilder/flows/")
	parts := strings.Split(path, "/")
	if len(parts) < 3 || parts[0] != flowID || parts[1] != "runtime" {
		http.NotFound(w, r)
		return
	}

	switch parts[2] {
	case "health":
		writeJSON(w, http.StatusOK, map[string]any{
			"summary": map[string]any{
				"running":  3,
				"degraded": 0,
				"error":    0,
			},
			"components": []map[string]any{
				{"id": "source", "status": "running"},
				{"id": "indexer", "status": "running"},
				{"id": "graph", "status": "running"},
			},
		})
	case "metrics":
		writeJSON(w, http.StatusOK, map[string]any{
			"components": []map[string]any{
				{"id": "source", "throughput": 12},
				{"id": "indexer", "throughput": 8},
				{"id": "graph", "throughput": 4},
			},
		})
	case "messages":
		writeJSON(w, http.StatusOK, map[string]any{
			"total": 2,
			"messages": []map[string]any{
				{"id": "msg-1", "level": "info", "message": "fixture graph loaded"},
			},
		})
	default:
		http.NotFound(w, r)
	}
}

func handleGraphQL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	var request graphQLRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"errors": []map[string]any{{"message": "invalid GraphQL request"}},
		})
		return
	}

	query := request.Query
	switch {
	case strings.Contains(query, "entitiesByPrefix"):
		prefix := stringVariable(request.Variables, "prefix")
		limit := intVariable(request.Variables, "limit", 50)
		writeJSON(w, http.StatusOK, map[string]any{
			"data": map[string]any{
				"entitiesByPrefix": filterEntities(prefix, limit),
			},
		})
	case strings.Contains(query, "entity("):
		id := stringVariable(request.Variables, "id")
		writeJSON(w, http.StatusOK, map[string]any{
			"data": map[string]any{
				"entity": findEntity(id),
			},
		})
	case strings.Contains(query, "pathSearch"):
		writeJSON(w, http.StatusOK, map[string]any{
			"data": map[string]any{
				"pathSearch": map[string]any{
					"entities": fixtureEntities,
					"edges":    fixtureEdges,
				},
			},
		})
	case strings.Contains(query, "globalSearch"):
		writeJSON(w, http.StatusOK, map[string]any{
			"data": map[string]any{
				"globalSearch": map[string]any{
					"entities":            fixtureEntities,
					"community_summaries": []map[string]any{},
					"relationships":       []map[string]any{},
					"count":               len(fixtureEntities),
					"duration_ms":         1,
				},
			},
			"extensions": map[string]any{
				"classification": map[string]any{
					"tier":       1,
					"confidence": 0.99,
					"intent":     "fixture",
				},
			},
		})
	default:
		writeJSON(w, http.StatusOK, map[string]any{
			"errors": []map[string]any{{"message": "unsupported fixture query"}},
		})
	}
}

func handleTrajectories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"total": 1,
		"trajectories": []map[string]any{
			{
				"loop_id":       loopID,
				"task_id":       taskID,
				"role":          "operator",
				"outcome":       "succeeded",
				"workflow_slug": "ops-profile-dashboard",
				"start_time":    "2026-07-06T12:00:00Z",
				"duration":      1420,
				"iterations":    3,
			},
		},
	})
}

func handleTrajectoryDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/trajectories/")
	if id != loopID {
		http.NotFound(w, r)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"loop_id":          loopID,
		"task_id":          taskID,
		"outcome":          "succeeded",
		"start_time":       "2026-07-06T12:00:00Z",
		"end_time":         "2026-07-06T12:00:01Z",
		"duration":         1420,
		"total_tokens_in":  128,
		"total_tokens_out": 96,
		"steps": []map[string]any{
			{
				"step_type":   "plan",
				"timestamp":   "2026-07-06T12:00:00Z",
				"duration":    300,
				"provider":    "fixture",
				"model":       "ops-profile",
				"response":    "Plan dashboard read paths",
				"retry_count": 0,
				"tokens_in":   32,
				"tokens_out":  24,
			},
			{
				"step_type":   "tool",
				"timestamp":   "2026-07-06T12:00:00Z",
				"duration":    520,
				"tool_name":   "graph.search",
				"tool_status": "succeeded",
				"response":    "Loaded fixture graph entities",
				"retry_count": 0,
				"tokens_in":   48,
				"tokens_out":  36,
			},
			{
				"step_type":   "respond",
				"timestamp":   "2026-07-06T12:00:01Z",
				"duration":    600,
				"provider":    "fixture",
				"model":       "ops-profile",
				"response":    "Rendered operator trajectory summary",
				"retry_count": 0,
				"tokens_in":   48,
				"tokens_out":  36,
			},
		},
	})
}

func filterEntities(prefix string, limit int) []entity {
	prefix = strings.ToLower(strings.TrimSpace(prefix))
	if limit <= 0 {
		limit = len(fixtureEntities)
	}

	matches := make([]entity, 0, len(fixtureEntities))
	for _, item := range fixtureEntities {
		id := strings.ToLower(item.ID)
		if prefix == "" || strings.HasPrefix(id, prefix) || strings.Contains(id, prefix) {
			matches = append(matches, item)
			if len(matches) >= limit {
				break
			}
		}
	}
	return matches
}

func findEntity(id string) *entity {
	for _, item := range fixtureEntities {
		if item.ID == id {
			found := item
			return &found
		}
	}
	return nil
}

func stringVariable(variables map[string]any, key string) string {
	if variables == nil {
		return ""
	}
	value, ok := variables[key]
	if !ok {
		return ""
	}
	text, ok := value.(string)
	if ok {
		return text
	}
	return ""
}

func intVariable(variables map[string]any, key string, fallback int) int {
	if variables == nil {
		return fallback
	}
	value, ok := variables[key]
	if !ok {
		return fallback
	}

	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case string:
		parsed, err := strconv.Atoi(typed)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

func methodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
		"error": "method not allowed",
	})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.RequestURI())
		next.ServeHTTP(w, r)
	})
}
