# RAG Document Intelligence System

## Vision

Transform Assetra from a financial tracking tool into an AI-powered intelligence platform by enabling natural language queries over ingested financial documents (K-1s, fund reports, account statements, tax documents, legal agreements).

**Goal:** "What's our total committed capital to PE funds?" → instant answer from ingested documents.

---

## Architecture Decision: Separate AI Microservice

### Why a Separate Service?

| Factor | Benefit |
|--------|---------|
| **Python Ecosystem** | LangChain, Unstructured.io, HuggingFace — far richer than Go for AI/ML |
| **Independent Scaling** | Scale AI processing without affecting CRUD operations |
| **Resource Isolation** | Long-running LLM calls don't block financial API requests |
| **Future-Proofing** | Easy to add local LLMs (vLLM), fine-tuned models, GPU inference |
| **Team Structure** | Enables dedicated AI/ML engineering focus |

### Communication: gRPC

- **Binary protocol** — Efficient for embedding vectors (1536 floats)
- **Streaming** — Server-side streaming for LLM token output
- **Strong typing** — Protobuf contracts prevent integration bugs
- **Bi-directional** — Real-time progress updates during document processing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ Document     │  │ Document     │  │ RAG Chat Interface           │  │
│  │ Upload UI    │  │ Library      │  │ (Streaming Responses)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Go Backend (Existing)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ • Financial CRUD (assets, liabilities, income, expenses)         │  │
│  │ • Timeline projections & CPF calculations                        │  │
│  │ • Auth/session management                                        │  │
│  │ • Proxies RAG requests to AI Service via gRPC                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                              gRPC Client                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                               gRPC (TLS)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Service (Python/FastAPI + gRPC)                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         gRPC Server                               │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ DocumentService    │ EmbeddingService │ RAGService          │ │  │
│  │  │ • Ingest           │ • Embed          │ • Query (streaming) │ │  │
│  │  │ • GetStatus        │ • EmbedBatch     │ • Search            │ │  │
│  │  │ • Delete           │                  │ • Classify          │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Processing Pipeline                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Unstructured│  │ Chunking    │  │ LLM Orchestration       │   │  │
│  │  │ (PDF/DOCX)  │  │ Engine      │  │ (LangChain/Direct)      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                    │
│  ┌─────────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL          │  │ PostgreSQL        │  │ Object Storage   │  │
│  │ (Financial Data)    │  │ + pgvector        │  │ (S3/MinIO)       │  │
│  │ • Assets/Liabilities│  │ • Documents       │  │ • Original files │  │
│  │ • Income/Expenses   │  │ • Chunks          │  │ • Extracted text │  │
│  │ • CPF accounts      │  │ • Embeddings      │  │                  │  │
│  └─────────────────────┘  └───────────────────┘  └──────────────────┘  │
│         Go Backend               AI Service            Shared          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Project Structure

### 0.1 New AI Service Directory

```
assetra3/
├── backend/                    # Existing Go backend
├── frontend/                   # Existing Next.js frontend
├── ai-service/                 # NEW: Python AI microservice
│   ├── pyproject.toml          # Dependencies (Poetry/uv)
│   ├── Dockerfile
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI + gRPC server startup
│   │   ├── config.py           # Environment configuration
│   │   ├── grpc_server.py      # gRPC service implementation
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── document.py     # Document ingestion service
│   │   │   ├── embedding.py    # Embedding generation service
│   │   │   ├── retrieval.py    # Vector search service
│   │   │   ├── rag.py          # RAG query orchestration
│   │   │   └── extraction.py   # Text extraction (PDF, DOCX, etc.)
│   │   ├── chunking/
│   │   │   ├── __init__.py
│   │   │   ├── base.py         # Chunking strategy interface
│   │   │   ├── financial.py    # Financial document chunker
│   │   │   └── semantic.py     # Semantic chunking
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── document.py     # Document & Chunk models
│   │   │   └── rag.py          # RAG request/response models
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── connection.py   # AsyncPG connection pool
│   │       └── repository.py   # Document & chunk repository
│   ├── proto/                  # Shared with Go backend
│   │   └── ai_service.proto
│   └── tests/
│       ├── __init__.py
│       ├── test_chunking.py
│       ├── test_embedding.py
│       └── test_retrieval.py
├── proto/                      # Shared proto definitions
│   └── ai_service.proto
└── docker-compose.yml          # Updated with AI service
```

### 0.2 gRPC Service Definitions

**File:** `proto/ai_service.proto`

```protobuf
syntax = "proto3";

package assetra.ai.v1;

option go_package = "github.com/assetra/backend/proto/ai";

import "google/protobuf/timestamp.proto";

// ============================================================================
// Document Service - Ingestion & Management
// ============================================================================

service DocumentService {
  // Upload and process a document (returns immediately, processing is async)
  rpc IngestDocument(IngestDocumentRequest) returns (IngestDocumentResponse);

  // Get document processing status
  rpc GetDocumentStatus(GetDocumentStatusRequest) returns (GetDocumentStatusResponse);

  // Stream document processing progress (server streaming)
  rpc WatchDocumentProgress(WatchDocumentProgressRequest) returns (stream DocumentProgressEvent);

  // List user's documents
  rpc ListDocuments(ListDocumentsRequest) returns (ListDocumentsResponse);

  // Delete a document and its chunks
  rpc DeleteDocument(DeleteDocumentRequest) returns (DeleteDocumentResponse);
}

message IngestDocumentRequest {
  string user_id = 1;
  string filename = 2;
  bytes content = 3;  // File content (for small files) or...
  string storage_path = 4;  // ...pre-uploaded storage path (for large files)
  string document_type = 5;  // Optional: 'k1', 'fund_report', etc. (auto-detected if empty)
}

message IngestDocumentResponse {
  string document_id = 1;
  string status = 2;  // 'processing', 'queued'
}

message GetDocumentStatusRequest {
  string document_id = 1;
}

message GetDocumentStatusResponse {
  string document_id = 1;
  string status = 2;  // 'pending', 'processing', 'completed', 'failed'
  string error_message = 3;
  int32 chunk_count = 4;
  google.protobuf.Timestamp created_at = 5;
  google.protobuf.Timestamp processed_at = 6;
}

message WatchDocumentProgressRequest {
  string document_id = 1;
}

message DocumentProgressEvent {
  string document_id = 1;
  string stage = 2;  // 'extracting', 'chunking', 'embedding', 'storing', 'completed', 'failed'
  float progress = 3;  // 0.0 to 1.0
  string message = 4;
  string error = 5;
}

message ListDocumentsRequest {
  string user_id = 1;
  int32 limit = 2;
  int32 offset = 3;
  string document_type = 4;  // Optional filter
}

message ListDocumentsResponse {
  repeated DocumentInfo documents = 1;
  int32 total = 2;
}

message DocumentInfo {
  string id = 1;
  string filename = 2;
  string document_type = 3;
  string status = 4;
  int64 file_size_bytes = 5;
  int32 chunk_count = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp processed_at = 8;
}

message DeleteDocumentRequest {
  string document_id = 1;
}

message DeleteDocumentResponse {
  bool success = 1;
}

// ============================================================================
// RAG Service - Query & Retrieval
// ============================================================================

service RAGService {
  // Query documents with RAG (streaming response for LLM output)
  rpc Query(QueryRequest) returns (stream QueryResponseChunk);

  // Semantic search without LLM generation
  rpc Search(SearchRequest) returns (SearchResponse);

  // Classify a document
  rpc ClassifyDocument(ClassifyDocumentRequest) returns (ClassifyDocumentResponse);
}

message QueryRequest {
  string user_id = 1;
  string query = 2;
  QueryConfig config = 3;
}

message QueryConfig {
  int32 top_k = 1;  // Number of chunks to retrieve (default: 10)
  float similarity_threshold = 2;  // Minimum similarity (default: 0.7)
  repeated string document_types = 3;  // Filter by document types
  repeated string document_ids = 4;  // Filter by specific documents
  bool include_sources = 5;  // Include source citations (default: true)
}

message QueryResponseChunk {
  oneof content {
    string text = 1;  // Streaming text token
    QuerySources sources = 2;  // Final sources (sent at end)
    QueryMetadata metadata = 3;  // Final metadata (sent at end)
  }
}

message QuerySources {
  repeated SourceInfo sources = 1;
}

message SourceInfo {
  string document_id = 1;
  string filename = 2;
  string document_type = 3;
  int32 page_number = 4;
  string section_title = 5;
  string excerpt = 6;
  float relevance_score = 7;
}

message QueryMetadata {
  int32 chunks_retrieved = 1;
  int32 tokens_used = 2;
  float processing_time_ms = 3;
}

message SearchRequest {
  string user_id = 1;
  string query = 2;
  int32 top_k = 3;
  float similarity_threshold = 4;
  repeated string document_types = 5;
}

message SearchResponse {
  repeated SearchResult results = 1;
}

message SearchResult {
  string chunk_id = 1;
  string document_id = 2;
  string filename = 3;
  string content = 4;
  int32 page_number = 5;
  string section_title = 6;
  float score = 7;
}

message ClassifyDocumentRequest {
  string document_id = 1;
  string text_sample = 2;  // First N characters of document
}

message ClassifyDocumentResponse {
  string document_type = 1;
  float confidence = 2;
  map<string, float> all_scores = 3;
}

// ============================================================================
// Embedding Service - Direct embedding access (for advanced use cases)
// ============================================================================

service EmbeddingService {
  // Generate embedding for a single text
  rpc Embed(EmbedRequest) returns (EmbedResponse);

  // Generate embeddings for multiple texts
  rpc EmbedBatch(EmbedBatchRequest) returns (EmbedBatchResponse);
}

message EmbedRequest {
  string text = 1;
}

message EmbedResponse {
  repeated float embedding = 1;
  int32 dimensions = 2;
  string model = 3;
}

message EmbedBatchRequest {
  repeated string texts = 1;
}

message EmbedBatchResponse {
  repeated Embedding embeddings = 1;
  string model = 2;
}

message Embedding {
  repeated float values = 1;
}
```

### 0.3 Go gRPC Client

**File:** `backend/internal/ai/client.go`

```go
package ai

import (
    "context"
    "io"
    "time"

    pb "financial-chat-system/backend/proto/ai"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// Client wraps the gRPC connection to the AI service
type Client struct {
    conn       *grpc.ClientConn
    documents  pb.DocumentServiceClient
    rag        pb.RAGServiceClient
    embeddings pb.EmbeddingServiceClient
}

// NewClient creates a new AI service client
func NewClient(address string) (*Client, error) {
    // TODO: Add TLS credentials for production
    conn, err := grpc.Dial(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        return nil, err
    }

    return &Client{
        conn:       conn,
        documents:  pb.NewDocumentServiceClient(conn),
        rag:        pb.NewRAGServiceClient(conn),
        embeddings: pb.NewEmbeddingServiceClient(conn),
    }, nil
}

// IngestDocument uploads a document for processing
func (c *Client) IngestDocument(ctx context.Context, userID, filename string, content []byte) (string, error) {
    resp, err := c.documents.IngestDocument(ctx, &pb.IngestDocumentRequest{
        UserId:   userID,
        Filename: filename,
        Content:  content,
    })
    if err != nil {
        return "", err
    }
    return resp.DocumentId, nil
}

// QueryRAG performs a RAG query with streaming response
func (c *Client) QueryRAG(ctx context.Context, userID, query string, config *pb.QueryConfig) (<-chan string, <-chan *pb.QuerySources, error) {
    stream, err := c.rag.Query(ctx, &pb.QueryRequest{
        UserId: userID,
        Query:  query,
        Config: config,
    })
    if err != nil {
        return nil, nil, err
    }

    textChan := make(chan string, 100)
    sourcesChan := make(chan *pb.QuerySources, 1)

    go func() {
        defer close(textChan)
        defer close(sourcesChan)

        for {
            chunk, err := stream.Recv()
            if err == io.EOF {
                return
            }
            if err != nil {
                return
            }

            switch content := chunk.Content.(type) {
            case *pb.QueryResponseChunk_Text:
                textChan <- content.Text
            case *pb.QueryResponseChunk_Sources:
                sourcesChan <- content.Sources
            }
        }
    }()

    return textChan, sourcesChan, nil
}

// Close closes the gRPC connection
func (c *Client) Close() error {
    return c.conn.Close()
}
```

### 0.4 Python Dependencies

**File:** `ai-service/pyproject.toml`

```toml
[project]
name = "assetra-ai-service"
version = "0.1.0"
description = "AI/RAG microservice for Assetra"
requires-python = ">=3.11"

dependencies = [
    # gRPC
    "grpcio>=1.60.0",
    "grpcio-tools>=1.60.0",
    "protobuf>=4.25.0",

    # Web framework (for health checks, metrics)
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",

    # Database
    "asyncpg>=0.29.0",
    "pgvector>=0.2.4",

    # LLM & Embeddings
    "openai>=1.10.0",
    "anthropic>=0.18.0",
    "tiktoken>=0.5.2",

    # Document processing
    "unstructured[all-docs]>=0.12.0",  # PDF, DOCX, etc.
    "pypdf>=3.17.0",
    "python-docx>=1.1.0",

    # RAG utilities (optional - can use direct API calls)
    # "langchain>=0.1.0",
    # "langchain-openai>=0.0.5",

    # Storage
    "boto3>=1.34.0",  # S3/MinIO

    # Utilities
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "structlog>=24.1.0",
    "tenacity>=8.2.0",  # Retries
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.mypy]
python_version = "3.11"
strict = true
```

---

## Phase 1: Infrastructure Setup

### 1.1 Enable pgvector Extension

**Migration:** `backend/internal/database/migrations/YYYYMMDDHHMMSS_add_pgvector.up.sql`

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (metadata)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Document metadata
    filename VARCHAR(512) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'xlsx', 'csv', 'txt', 'docx'
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(128),

    -- Document classification
    document_type VARCHAR(100), -- 'k1', 'fund_report', 'account_statement', 'tax_document', 'legal', 'other'
    document_date DATE,

    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,

    -- Storage references
    storage_path VARCHAR(1024) NOT NULL, -- S3/MinIO path to original file
    extracted_text_path VARCHAR(1024), -- Path to extracted text file

    -- Extracted metadata (JSON for flexibility)
    extracted_metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document chunks with embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Denormalized for faster filtering

    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Chunk metadata
    page_number INTEGER,
    section_title VARCHAR(512),
    chunk_type VARCHAR(50), -- 'text', 'table', 'header', 'footnote'

    -- Embedding (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding vector(1536) NOT NULL,

    -- Token count for context budgeting
    token_count INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for efficient retrieval
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_user_id ON document_chunks(user_id);

-- Vector similarity search index (IVFFlat for large datasets)
-- Note: Create after initial data load for optimal performance
CREATE INDEX idx_document_chunks_embedding ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 1.2 Docker Compose Update

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL with pgvector extension
  database:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-financial_chat}
      POSTGRES_USER: ${POSTGRES_USER:-financial_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U financial_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Go Backend (existing)
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - PORT=${PORT:-8080}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PRIMARY_LLM=${PRIMARY_LLM:-openai}
      # AI Service connection
      - AI_SERVICE_ADDR=ai-service:50051
    depends_on:
      database:
        condition: service_healthy
      ai-service:
        condition: service_healthy
    restart: unless-stopped

  # NEW: Python AI Microservice
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "50051:50051"  # gRPC
      - "8081:8081"    # HTTP (health checks, metrics)
    environment:
      - DATABASE_URL=${AI_DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
      - MINIO_BUCKET=${MINIO_BUCKET:-assetra-documents}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    depends_on:
      database:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # MinIO for document storage
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8080}
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  minio_data:
```

### 1.3 AI Service Dockerfile

**File:** `ai-service/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for document processing
RUN apt-get update && apt-get install -y \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy source code
COPY src/ src/
COPY proto/ proto/

# Generate protobuf files
RUN python -m grpc_tools.protoc \
    -I./proto \
    --python_out=./src/proto \
    --grpc_python_out=./src/proto \
    ./proto/ai_service.proto

# Health check endpoint
EXPOSE 8081
# gRPC server
EXPOSE 50051

CMD ["python", "-m", "src.main"]
```

---

## Phase 2: Embedding Service (Python)

### 2.1 Embedding Provider Interface

**File:** `ai-service/src/services/embedding.py`

```python
from abc import ABC, abstractmethod
from typing import Protocol
import openai
import tiktoken
from tenacity import retry, stop_after_attempt, wait_exponential


class EmbeddingProvider(Protocol):
    """Protocol for embedding providers"""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text"""
        ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts"""
        ...

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Return embedding dimension size"""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return model identifier"""
        ...


class OpenAIEmbedding:
    """OpenAI embedding provider using text-embedding-3-small"""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self._dimensions = 1536  # text-embedding-3-small
        self.tokenizer = tiktoken.encoding_for_model(model)
        self.max_tokens = 8191  # Model limit

    @property
    def dimensions(self) -> int:
        return self._dimensions

    @property
    def model_name(self) -> str:
        return self.model

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))

    def truncate_to_max_tokens(self, text: str) -> str:
        """Truncate text to fit within token limit"""
        tokens = self.tokenizer.encode(text)
        if len(tokens) <= self.max_tokens:
            return text
        return self.tokenizer.decode(tokens[: self.max_tokens])

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text"""
        text = self.truncate_to_max_tokens(text)
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_batch(self, texts: list[str], batch_size: int = 100) -> list[list[float]]:
        """Generate embeddings for multiple texts with batching"""
        all_embeddings: list[list[float]] = []

        # Truncate all texts
        texts = [self.truncate_to_max_tokens(t) for t in texts]

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch,
            )
            # Sort by index to maintain order
            sorted_data = sorted(response.data, key=lambda x: x.index)
            all_embeddings.extend([d.embedding for d in sorted_data])

        return all_embeddings
```

---

## Phase 3: Document Processing Pipeline (Python)

### 3.1 Document Ingestion Service

**File:** `ai-service/src/services/document.py`

```python
import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import AsyncIterator
from uuid import UUID, uuid4
import structlog

from .embedding import EmbeddingProvider
from .extraction import TextExtractor, DocumentMetadata
from ..chunking.financial import FinancialDocumentChunker
from ..db.repository import DocumentRepository
from ..models.document import Document, Chunk, ProcessingStatus


logger = structlog.get_logger()


class ProcessingStage(str, Enum):
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    STORING = "storing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProgressEvent:
    document_id: str
    stage: ProcessingStage
    progress: float  # 0.0 to 1.0
    message: str
    error: str | None = None


class DocumentService:
    """Handles document ingestion pipeline"""

    def __init__(
        self,
        storage: "StorageProvider",
        extractor: TextExtractor,
        chunker: FinancialDocumentChunker,
        embedder: EmbeddingProvider,
        repository: DocumentRepository,
    ):
        self.storage = storage
        self.extractor = extractor
        self.chunker = chunker
        self.embedder = embedder
        self.repository = repository
        self._progress_callbacks: dict[str, asyncio.Queue[ProgressEvent]] = {}

    async def ingest_document(
        self,
        user_id: str,
        filename: str,
        content: bytes | None = None,
        storage_path: str | None = None,
    ) -> Document:
        """
        Ingest a document: upload, extract, chunk, embed, store.
        Returns immediately with document ID; processing happens async.
        """
        document_id = str(uuid4())

        # Upload to storage if content provided
        if content:
            storage_path = await self.storage.upload(user_id, filename, content)

        # Create document record
        document = Document(
            id=document_id,
            user_id=user_id,
            filename=filename,
            storage_path=storage_path,
            status=ProcessingStatus.PROCESSING,
        )
        await self.repository.create_document(document)

        # Start async processing
        asyncio.create_task(self._process_document(document))

        return document

    async def watch_progress(self, document_id: str) -> AsyncIterator[ProgressEvent]:
        """Stream progress events for a document"""
        queue: asyncio.Queue[ProgressEvent] = asyncio.Queue()
        self._progress_callbacks[document_id] = queue

        try:
            while True:
                event = await queue.get()
                yield event
                if event.stage in (ProcessingStage.COMPLETED, ProcessingStage.FAILED):
                    break
        finally:
            del self._progress_callbacks[document_id]

    async def _emit_progress(self, event: ProgressEvent) -> None:
        """Emit progress event to watchers"""
        if event.document_id in self._progress_callbacks:
            await self._progress_callbacks[event.document_id].put(event)

    async def _process_document(self, document: Document) -> None:
        """Process document: extract → chunk → embed → store"""
        log = logger.bind(document_id=document.id, filename=document.filename)

        try:
            # Stage 1: Extract text
            log.info("Extracting text from document")
            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.EXTRACTING,
                progress=0.0,
                message="Extracting text from document...",
            ))

            text, metadata = await self.extractor.extract(document.storage_path)
            document.extracted_metadata = metadata.model_dump()

            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.EXTRACTING,
                progress=1.0,
                message=f"Extracted {len(text)} characters",
            ))

            # Stage 2: Chunk text
            log.info("Chunking document", text_length=len(text))
            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.CHUNKING,
                progress=0.0,
                message="Splitting document into chunks...",
            ))

            chunks = self.chunker.chunk(text, metadata)
            log.info("Created chunks", chunk_count=len(chunks))

            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.CHUNKING,
                progress=1.0,
                message=f"Created {len(chunks)} chunks",
            ))

            # Stage 3: Generate embeddings (batched)
            log.info("Generating embeddings")
            batch_size = 100
            total_batches = (len(chunks) + batch_size - 1) // batch_size

            for batch_idx in range(0, len(chunks), batch_size):
                batch = chunks[batch_idx : batch_idx + batch_size]
                texts = [c.content for c in batch]

                embeddings = await self.embedder.embed_batch(texts)

                for chunk, embedding in zip(batch, embeddings):
                    chunk.embedding = embedding

                progress = min(1.0, (batch_idx + batch_size) / len(chunks))
                await self._emit_progress(ProgressEvent(
                    document_id=document.id,
                    stage=ProcessingStage.EMBEDDING,
                    progress=progress,
                    message=f"Embedded {min(batch_idx + batch_size, len(chunks))}/{len(chunks)} chunks",
                ))

            # Stage 4: Store chunks
            log.info("Storing chunks in database")
            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.STORING,
                progress=0.0,
                message="Saving to database...",
            ))

            await self.repository.create_chunks(document.id, document.user_id, chunks)

            # Mark complete
            document.status = ProcessingStatus.COMPLETED
            document.chunk_count = len(chunks)
            await self.repository.update_document_status(
                document.id, ProcessingStatus.COMPLETED
            )

            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.COMPLETED,
                progress=1.0,
                message=f"Document processed: {len(chunks)} chunks indexed",
            ))

            log.info("Document processing complete", chunk_count=len(chunks))

        except Exception as e:
            log.error("Document processing failed", error=str(e))
            await self.repository.update_document_status(
                document.id, ProcessingStatus.FAILED, error_message=str(e)
            )
            await self._emit_progress(ProgressEvent(
                document_id=document.id,
                stage=ProcessingStage.FAILED,
                progress=0.0,
                message="Processing failed",
                error=str(e),
            ))
```

### 3.2 Chunking Strategies

**File:** `ai-service/src/chunking/financial.py`

```python
import re
from dataclasses import dataclass, field
from typing import Protocol
import tiktoken

from ..services.extraction import DocumentMetadata


@dataclass
class Chunk:
    """Represents a piece of a document"""
    content: str
    chunk_index: int
    page_number: int | None = None
    section_title: str | None = None
    chunk_type: str = "text"  # 'text', 'table', 'header'
    token_count: int = 0
    embedding: list[float] = field(default_factory=list)


class ChunkingStrategy(Protocol):
    """Protocol for chunking strategies"""

    def chunk(self, text: str, metadata: DocumentMetadata | None) -> list[Chunk]:
        """Split text into chunks"""
        ...


class FinancialDocumentChunker:
    """
    Specialized chunker for financial documents.

    Key features:
    - Respects semantic boundaries (sections, paragraphs)
    - Keeps tables intact
    - Preserves financial entities (don't split mid-amount)
    - Enriches chunks with metadata
    """

    def __init__(
        self,
        chunk_size: int = 512,      # Target tokens per chunk
        chunk_overlap: int = 50,     # Overlap tokens
        model: str = "text-embedding-3-small",
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer = tiktoken.encoding_for_model(model)

        # Patterns for detecting structure
        self.section_header_pattern = re.compile(
            r'^(?:SCHEDULE\s+[A-Z]-?\d*|PART\s+[IVX]+|SECTION\s+\d+|'
            r'[A-Z][A-Z\s]+:$|^\d+\.\s+[A-Z])',
            re.MULTILINE
        )
        self.table_pattern = re.compile(
            r'(?:\|[^\n]+\|[\n])+|'  # Markdown tables
            r'(?:[\t]{2,}[^\n]+[\n])+',  # Tab-separated tables
            re.MULTILINE
        )
        # Financial amounts - don't split these
        self.financial_amount_pattern = re.compile(
            r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?'
        )

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))

    def chunk(self, text: str, metadata: DocumentMetadata | None = None) -> list[Chunk]:
        """
        Split document into chunks optimized for financial document retrieval.

        Strategy:
        1. First, split by major sections (headers)
        2. Within sections, split by paragraphs
        3. Merge small chunks, split large ones
        4. Preserve tables as single chunks when possible
        5. Add overlap between chunks for context continuity
        """
        chunks: list[Chunk] = []

        # TODO(human): Implement the chunking algorithm
        #
        # This is a key design decision that affects retrieval quality.
        # Consider:
        #
        # 1. SEMANTIC BOUNDARIES: Split at natural document boundaries
        #    - Section headers (e.g., "Schedule K-1", "Capital Account Analysis")
        #    - Page breaks (if metadata.pages available)
        #    - Paragraph boundaries (double newlines)
        #
        # 2. TABLE HANDLING: Keep tables intact
        #    - Detect table structures using self.table_pattern
        #    - If table > chunk_size, include header row with each chunk
        #    - Mark chunk_type = "table"
        #
        # 3. FINANCIAL ENTITY PRESERVATION: Don't split mid-entity
        #    - Dollar amounts with context (self.financial_amount_pattern)
        #    - Date ranges ("January 1, 2024 through December 31, 2024")
        #    - Account numbers
        #
        # 4. CONTEXT ENRICHMENT: Prepend metadata to each chunk
        #    - Document title (from metadata.title or filename)
        #    - Section header (most recent header found)
        #    - Page number (if available)
        #
        # Example chunk content format:
        # "[Document: 2024_K1_Fund_ABC.pdf | Section: Capital Account | Page: 3]\n{actual content}"
        #
        # 5. OVERLAP: Include chunk_overlap tokens from previous chunk
        #    - Helps with queries that span chunk boundaries

        return chunks
```

### 3.3 Text Extraction

**File:** `ai-service/src/services/extraction.py`

Financial documents require specialized extraction. We use **Unstructured.io** which handles multiple formats elegantly.

| Document Type | Extraction Method | Library |
|--------------|-------------------|---------|
| PDF | Text layer + OCR fallback | `unstructured[pdf]` |
| XLSX/CSV | Structured table extraction | `unstructured[xlsx]` |
| DOCX | XML parsing | `unstructured[docx]` |
| Images | OCR | `unstructured` + `tesseract` |

```python
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Protocol
import structlog

from unstructured.partition.auto import partition
from unstructured.documents.elements import (
    Element,
    Table,
    Title,
    NarrativeText,
    ListItem,
)


logger = structlog.get_logger()


@dataclass
class TableInfo:
    """Information about a detected table"""
    content: str
    page_number: int | None
    headers: list[str]


@dataclass
class SectionInfo:
    """Information about a document section"""
    title: str
    page_number: int | None
    start_index: int


@dataclass
class DocumentMetadata:
    """Metadata extracted from document"""
    page_count: int | None = None
    document_date: date | None = None
    document_type: str | None = None  # Detected: 'k1', 'fund_report', etc.
    tables: list[TableInfo] | None = None
    sections: list[SectionInfo] | None = None
    title: str | None = None

    def model_dump(self) -> dict:
        """Convert to dict for JSON storage"""
        return {
            "page_count": self.page_count,
            "document_date": self.document_date.isoformat() if self.document_date else None,
            "document_type": self.document_type,
            "title": self.title,
        }


class TextExtractor(Protocol):
    """Protocol for text extractors"""

    async def extract(self, file_path: str) -> tuple[str, DocumentMetadata]:
        """Extract text and metadata from document"""
        ...


class UnstructuredExtractor:
    """
    Text extractor using Unstructured.io

    Benefits:
    - Handles PDF, DOCX, XLSX, images automatically
    - Preserves document structure (tables, sections)
    - OCR fallback for scanned documents
    """

    def __init__(self, storage: "StorageProvider"):
        self.storage = storage

    async def extract(self, storage_path: str) -> tuple[str, DocumentMetadata]:
        """
        Extract text and metadata from a document.

        Args:
            storage_path: Path to document in object storage

        Returns:
            Tuple of (extracted_text, metadata)
        """
        log = logger.bind(storage_path=storage_path)

        # Download to temp file
        local_path = await self.storage.download_to_temp(storage_path)

        try:
            log.info("Partitioning document with Unstructured")

            # Partition document into elements
            elements: list[Element] = partition(
                filename=local_path,
                strategy="hi_res",  # High quality extraction
                include_page_breaks=True,
            )

            log.info("Extracted elements", count=len(elements))

            # Build text and collect metadata
            text_parts: list[str] = []
            tables: list[TableInfo] = []
            sections: list[SectionInfo] = []
            page_count = 0

            for i, element in enumerate(elements):
                # Track page numbers
                page_num = getattr(element.metadata, "page_number", None)
                if page_num and page_num > page_count:
                    page_count = page_num

                # Collect tables
                if isinstance(element, Table):
                    tables.append(TableInfo(
                        content=str(element),
                        page_number=page_num,
                        headers=[],  # Could parse from table structure
                    ))
                    text_parts.append(f"\n[TABLE]\n{element}\n[/TABLE]\n")

                # Collect section titles
                elif isinstance(element, Title):
                    sections.append(SectionInfo(
                        title=str(element),
                        page_number=page_num,
                        start_index=len("".join(text_parts)),
                    ))
                    text_parts.append(f"\n## {element}\n")

                # Regular text
                else:
                    text_parts.append(str(element) + "\n")

            text = "".join(text_parts)

            metadata = DocumentMetadata(
                page_count=page_count or None,
                tables=tables if tables else None,
                sections=sections if sections else None,
            )

            log.info(
                "Extraction complete",
                text_length=len(text),
                page_count=page_count,
                table_count=len(tables),
                section_count=len(sections),
            )

            return text, metadata

        finally:
            # Cleanup temp file
            Path(local_path).unlink(missing_ok=True)
```

---

## Phase 4: Retrieval Engine (Python)

### 4.1 Vector Search Service

**File:** `ai-service/src/services/retrieval.py`

```python
from dataclasses import dataclass
from datetime import date
import structlog

from .embedding import EmbeddingProvider
from ..db.repository import ChunkRepository
from ..models.document import Chunk, Document


logger = structlog.get_logger()


@dataclass
class SearchConfig:
    """Configuration for retrieval"""
    top_k: int = 10
    similarity_threshold: float = 0.7
    document_types: list[str] | None = None
    document_ids: list[str] | None = None
    date_from: date | None = None
    date_to: date | None = None


@dataclass
class SearchResult:
    """A retrieved chunk with metadata"""
    chunk: Chunk
    document: Document
    score: float


class RetrievalService:
    """Semantic search over document chunks"""

    def __init__(
        self,
        embedder: EmbeddingProvider,
        repository: ChunkRepository,
    ):
        self.embedder = embedder
        self.repository = repository

    async def search(
        self,
        user_id: str,
        query: str,
        config: SearchConfig | None = None,
    ) -> list[SearchResult]:
        """
        Perform semantic search over user's documents.

        Args:
            user_id: User ID to scope search
            query: Natural language query
            config: Search configuration

        Returns:
            List of search results ordered by relevance
        """
        config = config or SearchConfig()
        log = logger.bind(user_id=user_id, query=query[:100])

        # 1. Embed the query
        log.debug("Embedding query")
        query_embedding = await self.embedder.embed(query)

        # 2. Search for similar chunks
        log.debug("Searching for similar chunks", top_k=config.top_k)
        results = await self.repository.search_similar(
            user_id=user_id,
            embedding=query_embedding,
            top_k=config.top_k,
            threshold=config.similarity_threshold,
            document_types=config.document_types,
            document_ids=config.document_ids,
        )

        log.info("Search complete", result_count=len(results))
        return results
```

### 4.2 Repository Implementation (pgvector)

**File:** `ai-service/src/db/repository.py`

```python
from dataclasses import dataclass
import asyncpg
from pgvector.asyncpg import register_vector
import structlog

from ..models.document import Document, Chunk, ProcessingStatus


logger = structlog.get_logger()


class DocumentRepository:
    """Repository for documents and chunks with pgvector support"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def init_vector_extension(self) -> None:
        """Initialize pgvector extension on connection"""
        async with self.pool.acquire() as conn:
            await register_vector(conn)

    async def search_similar(
        self,
        user_id: str,
        embedding: list[float],
        top_k: int = 10,
        threshold: float = 0.7,
        document_types: list[str] | None = None,
        document_ids: list[str] | None = None,
    ) -> list["SearchResult"]:
        """
        Find chunks similar to query embedding using cosine similarity.

        Uses pgvector's <=> operator for cosine distance.
        Similarity = 1 - distance
        """
        # Build query with optional filters
        query = """
            SELECT
                dc.id AS chunk_id,
                dc.content,
                dc.chunk_index,
                dc.page_number,
                dc.section_title,
                dc.chunk_type,
                dc.token_count,
                d.id AS document_id,
                d.filename,
                d.document_type,
                d.document_date,
                d.file_size_bytes,
                1 - (dc.embedding <=> $1::vector) AS similarity
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.user_id = $2
              AND 1 - (dc.embedding <=> $1::vector) > $3
        """
        params = [embedding, user_id, threshold]
        param_idx = 4

        # Add optional document type filter
        if document_types:
            query += f" AND d.document_type = ANY(${param_idx}::text[])"
            params.append(document_types)
            param_idx += 1

        # Add optional document ID filter
        if document_ids:
            query += f" AND d.id = ANY(${param_idx}::uuid[])"
            params.append(document_ids)
            param_idx += 1

        query += f"""
            ORDER BY dc.embedding <=> $1::vector
            LIMIT ${param_idx}
        """
        params.append(top_k)

        async with self.pool.acquire() as conn:
            await register_vector(conn)
            rows = await conn.fetch(query, *params)

        results = []
        for row in rows:
            chunk = Chunk(
                id=str(row["chunk_id"]),
                content=row["content"],
                chunk_index=row["chunk_index"],
                page_number=row["page_number"],
                section_title=row["section_title"],
                chunk_type=row["chunk_type"],
                token_count=row["token_count"],
            )
            document = Document(
                id=str(row["document_id"]),
                user_id=user_id,
                filename=row["filename"],
                document_type=row["document_type"],
                file_size_bytes=row["file_size_bytes"],
            )
            results.append(SearchResult(
                chunk=chunk,
                document=document,
                score=row["similarity"],
            ))

        return results

    async def create_document(self, document: Document) -> None:
        """Insert a new document record"""
        query = """
            INSERT INTO documents (
                id, user_id, filename, file_type, file_size_bytes,
                mime_type, document_type, status, storage_path, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                document.id,
                document.user_id,
                document.filename,
                document.file_type,
                document.file_size_bytes,
                document.mime_type,
                document.document_type,
                document.status.value,
                document.storage_path,
            )

    async def create_chunks(
        self,
        document_id: str,
        user_id: str,
        chunks: list[Chunk],
    ) -> None:
        """Batch insert chunks with embeddings"""
        query = """
            INSERT INTO document_chunks (
                id, document_id, user_id, content, chunk_index,
                page_number, section_title, chunk_type, embedding, token_count, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        """
        async with self.pool.acquire() as conn:
            await register_vector(conn)
            # Use executemany for batch insert
            await conn.executemany(
                query,
                [
                    (
                        chunk.id,
                        document_id,
                        user_id,
                        chunk.content,
                        chunk.chunk_index,
                        chunk.page_number,
                        chunk.section_title,
                        chunk.chunk_type,
                        chunk.embedding,
                        chunk.token_count,
                    )
                    for chunk in chunks
                ],
            )

    async def update_document_status(
        self,
        document_id: str,
        status: ProcessingStatus,
        error_message: str | None = None,
    ) -> None:
        """Update document processing status"""
        query = """
            UPDATE documents
            SET status = $2,
                error_message = $3,
                processed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE NULL END,
                updated_at = NOW()
            WHERE id = $1
        """
        async with self.pool.acquire() as conn:
            await conn.execute(query, document_id, status.value, error_message)
```

---

## Phase 5: RAG Query Service (Python + gRPC)

### 5.1 RAG Service Implementation

**File:** `ai-service/src/services/rag.py`

```python
from dataclasses import dataclass
from typing import AsyncIterator
import openai
import structlog

from .retrieval import RetrievalService, SearchConfig, SearchResult


logger = structlog.get_logger()


SYSTEM_PROMPT = """You are a financial analyst assistant helping users understand their financial documents.

IMPORTANT RULES:
1. Answer questions based ONLY on the provided document context
2. If the answer cannot be found in the context, say "I couldn't find this information in the uploaded documents."
3. Always cite which document and page number you found information in
4. For numerical data, quote the exact figures from the documents
5. If asked about calculations, show your work step by step

Format citations as: [Document: filename, Page: N]"""


@dataclass
class QueryConfig:
    """Configuration for RAG queries"""
    top_k: int = 10
    similarity_threshold: float = 0.7
    document_types: list[str] | None = None
    document_ids: list[str] | None = None
    include_sources: bool = True
    model: str = "gpt-4-turbo"
    temperature: float = 0.1  # Low temperature for factual responses


@dataclass
class SourceInfo:
    """Information about a source used in the answer"""
    document_id: str
    filename: str
    document_type: str | None
    page_number: int | None
    section_title: str | None
    excerpt: str
    relevance_score: float


@dataclass
class QueryMetadata:
    """Metadata about the query execution"""
    chunks_retrieved: int
    tokens_used: int
    processing_time_ms: float


class RAGService:
    """RAG query service with streaming LLM responses"""

    def __init__(
        self,
        retrieval: RetrievalService,
        openai_api_key: str,
    ):
        self.retrieval = retrieval
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)

    async def query(
        self,
        user_id: str,
        query: str,
        config: QueryConfig | None = None,
    ) -> AsyncIterator[str | list[SourceInfo] | QueryMetadata]:
        """
        Execute a RAG query with streaming response.

        Yields:
            - str: Streaming text tokens
            - list[SourceInfo]: Sources (sent at end)
            - QueryMetadata: Metadata (sent at end)
        """
        import time
        start_time = time.time()

        config = config or QueryConfig()
        log = logger.bind(user_id=user_id, query=query[:100])

        # 1. Retrieve relevant chunks
        log.info("Retrieving relevant chunks")
        search_config = SearchConfig(
            top_k=config.top_k,
            similarity_threshold=config.similarity_threshold,
            document_types=config.document_types,
            document_ids=config.document_ids,
        )
        results = await self.retrieval.search(user_id, query, search_config)

        if not results:
            yield "I couldn't find any relevant documents to answer your question. Please upload documents first."
            return

        log.info("Retrieved chunks", count=len(results))

        # 2. Build context from chunks
        context = self._build_context(results)

        # 3. Build user prompt
        user_prompt = f"""Context from documents:

{context}

---

Question: {query}

Please provide a detailed answer based on the document context above. Cite your sources."""

        # 4. Stream LLM response
        log.info("Generating response with LLM", model=config.model)
        total_tokens = 0

        stream = await self.openai_client.chat.completions.create(
            model=config.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=config.temperature,
            stream=True,
            stream_options={"include_usage": True},
        )

        async for chunk in stream:
            # Stream text tokens
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

            # Capture usage info
            if chunk.usage:
                total_tokens = chunk.usage.total_tokens

        # 5. Yield sources
        if config.include_sources:
            sources = [
                SourceInfo(
                    document_id=r.document.id,
                    filename=r.document.filename,
                    document_type=r.document.document_type,
                    page_number=r.chunk.page_number,
                    section_title=r.chunk.section_title,
                    excerpt=r.chunk.content[:200] + "..." if len(r.chunk.content) > 200 else r.chunk.content,
                    relevance_score=r.score,
                )
                for r in results
            ]
            yield sources

        # 6. Yield metadata
        processing_time_ms = (time.time() - start_time) * 1000
        yield QueryMetadata(
            chunks_retrieved=len(results),
            tokens_used=total_tokens,
            processing_time_ms=processing_time_ms,
        )

        log.info(
            "RAG query complete",
            chunks=len(results),
            tokens=total_tokens,
            time_ms=processing_time_ms,
        )

    def _build_context(self, results: list[SearchResult], max_tokens: int = 8000) -> str:
        """
        Build context string from search results.

        Formats each chunk with metadata for citation.
        Respects token budget.
        """
        import tiktoken
        tokenizer = tiktoken.encoding_for_model("gpt-4")

        context_parts = []
        total_tokens = 0

        for result in results:
            # Format chunk with metadata
            chunk_text = f"""[Document: {result.document.filename}"""
            if result.chunk.page_number:
                chunk_text += f", Page: {result.chunk.page_number}"
            if result.chunk.section_title:
                chunk_text += f", Section: {result.chunk.section_title}"
            chunk_text += f"]\n{result.chunk.content}\n"

            # Check token budget
            chunk_tokens = len(tokenizer.encode(chunk_text))
            if total_tokens + chunk_tokens > max_tokens:
                break

            context_parts.append(chunk_text)
            total_tokens += chunk_tokens

        return "\n---\n".join(context_parts)
```

### 5.2 gRPC Server Implementation

**File:** `ai-service/src/grpc_server.py`

```python
import asyncio
from concurrent import futures
import grpc
from grpc import aio

from .services.document import DocumentService, ProgressEvent, ProcessingStage
from .services.rag import RAGService, QueryConfig, SourceInfo, QueryMetadata
from .services.embedding import OpenAIEmbedding

# Generated protobuf imports
from .proto import ai_service_pb2 as pb
from .proto import ai_service_pb2_grpc as pb_grpc


class DocumentServicer(pb_grpc.DocumentServiceServicer):
    """gRPC servicer for document operations"""

    def __init__(self, document_service: DocumentService):
        self.service = document_service

    async def IngestDocument(
        self,
        request: pb.IngestDocumentRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb.IngestDocumentResponse:
        document = await self.service.ingest_document(
            user_id=request.user_id,
            filename=request.filename,
            content=request.content if request.content else None,
            storage_path=request.storage_path if request.storage_path else None,
        )
        return pb.IngestDocumentResponse(
            document_id=document.id,
            status="processing",
        )

    async def WatchDocumentProgress(
        self,
        request: pb.WatchDocumentProgressRequest,
        context: grpc.aio.ServicerContext,
    ):
        """Stream document processing progress"""
        async for event in self.service.watch_progress(request.document_id):
            yield pb.DocumentProgressEvent(
                document_id=event.document_id,
                stage=event.stage.value,
                progress=event.progress,
                message=event.message,
                error=event.error or "",
            )


class RAGServicer(pb_grpc.RAGServiceServicer):
    """gRPC servicer for RAG operations"""

    def __init__(self, rag_service: RAGService):
        self.service = rag_service

    async def Query(
        self,
        request: pb.QueryRequest,
        context: grpc.aio.ServicerContext,
    ):
        """Stream RAG query response"""
        config = QueryConfig(
            top_k=request.config.top_k or 10,
            similarity_threshold=request.config.similarity_threshold or 0.7,
            document_types=list(request.config.document_types) or None,
            document_ids=list(request.config.document_ids) or None,
            include_sources=request.config.include_sources,
        )

        async for item in self.service.query(
            user_id=request.user_id,
            query=request.query,
            config=config,
        ):
            if isinstance(item, str):
                # Stream text token
                yield pb.QueryResponseChunk(text=item)
            elif isinstance(item, list):
                # Sources
                sources = pb.QuerySources(
                    sources=[
                        pb.SourceInfo(
                            document_id=s.document_id,
                            filename=s.filename,
                            document_type=s.document_type or "",
                            page_number=s.page_number or 0,
                            section_title=s.section_title or "",
                            excerpt=s.excerpt,
                            relevance_score=s.relevance_score,
                        )
                        for s in item
                    ]
                )
                yield pb.QueryResponseChunk(sources=sources)
            elif isinstance(item, QueryMetadata):
                # Metadata
                yield pb.QueryResponseChunk(
                    metadata=pb.QueryMetadata(
                        chunks_retrieved=item.chunks_retrieved,
                        tokens_used=item.tokens_used,
                        processing_time_ms=item.processing_time_ms,
                    )
                )


async def serve(port: int = 50051) -> None:
    """Start the gRPC server"""
    server = aio.server(futures.ThreadPoolExecutor(max_workers=10))

    # Initialize services (dependency injection)
    # ... setup document_service, rag_service ...

    pb_grpc.add_DocumentServiceServicer_to_server(
        DocumentServicer(document_service), server
    )
    pb_grpc.add_RAGServiceServicer_to_server(
        RAGServicer(rag_service), server
    )

    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    await server.wait_for_termination()
```

### 5.3 Go Backend Proxy (HTTP → gRPC)

The Go backend exposes REST endpoints that proxy to the AI service:

**File:** `backend/internal/handlers/rag_proxy.go`

```go
package handlers

import (
    "encoding/json"
    "io"
    "net/http"

    "financial-chat-system/backend/internal/ai"
    "financial-chat-system/backend/internal/middleware"
    pb "financial-chat-system/backend/proto/ai"
)

type RAGProxyHandler struct {
    aiClient *ai.Client
}

func NewRAGProxyHandler(aiClient *ai.Client) *RAGProxyHandler {
    return &RAGProxyHandler{aiClient: aiClient}
}

// Query proxies RAG queries to the AI service with SSE streaming
func (h *RAGProxyHandler) Query(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    userID := middleware.GetUserID(ctx)

    var req struct {
        Query         string   `json:"query"`
        DocumentTypes []string `json:"document_types,omitempty"`
        DocumentIDs   []string `json:"document_ids,omitempty"`
        TopK          int32    `json:"top_k,omitempty"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }

    // Setup SSE
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "streaming not supported", http.StatusInternalServerError)
        return
    }

    // Call AI service with streaming
    config := &pb.QueryConfig{
        TopK:               req.TopK,
        DocumentTypes:      req.DocumentTypes,
        DocumentIds:        req.DocumentIDs,
        IncludeSources:     true,
    }

    textChan, sourcesChan, err := h.aiClient.QueryRAG(ctx, userID, req.Query, config)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Stream text tokens
    for text := range textChan {
        data, _ := json.Marshal(map[string]string{"type": "text", "content": text})
        fmt.Fprintf(w, "data: %s\n\n", data)
        flusher.Flush()
    }

    // Send sources
    if sources := <-sourcesChan; sources != nil {
        data, _ := json.Marshal(map[string]interface{}{
            "type":    "sources",
            "sources": sources.Sources,
        })
        fmt.Fprintf(w, "data: %s\n\n", data)
        flusher.Flush()
    }

    // Done
    fmt.Fprintf(w, "data: {\"type\": \"done\"}\n\n")
    flusher.Flush()
}
```

### 5.4 API Routes (Go Backend)

```go
// In router setup
r.HandleFunc("/api/v2/rag/query", ragProxyHandler.Query).Methods("POST")
r.HandleFunc("/api/v2/rag/documents", ragProxyHandler.ListDocuments).Methods("GET")
r.HandleFunc("/api/v2/rag/documents", ragProxyHandler.UploadDocument).Methods("POST")
r.HandleFunc("/api/v2/rag/documents/{id}", ragProxyHandler.GetDocument).Methods("GET")
r.HandleFunc("/api/v2/rag/documents/{id}", ragProxyHandler.DeleteDocument).Methods("DELETE")
```

---

## Phase 6: Frontend Integration

### 6.1 Document Upload Component

**File:** `frontend/src/components/rag/DocumentUpload.tsx`

```typescript
interface DocumentUploadProps {
  onUploadComplete: (document: Document) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v2/rag/documents', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Auth-Token': getAuthToken(),
        },
      });

      if (response.ok) {
        const document = await response.json();
        onUploadComplete(document);
      }
    }

    setUploading(false);
  }, [onUploadComplete]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <Dropzone onDrop={onDrop} accept={{
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'text/csv': ['.csv'],
      }}>
        {/* Dropzone UI */}
      </Dropzone>
    </div>
  );
}
```

### 6.2 RAG Chat Interface

**File:** `frontend/src/components/rag/RAGChat.tsx`

```typescript
interface RAGChatProps {
  // Optionally filter to specific document types
  documentTypes?: string[];
}

export function RAGChat({ documentTypes }: RAGChatProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const submitQuery = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: query }]);

    const response = await fetch('/api/v2/rag/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': getAuthToken(),
      },
      body: JSON.stringify({
        query,
        document_types: documentTypes,
        top_k: 10,
      }),
    });

    const result = await response.json();

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: result.answer,
      sources: result.sources,
    }]);

    setLoading(false);
    setQuery('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
      </div>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your documents..."
            className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3"
            onKeyDown={(e) => e.key === 'Enter' && submitQuery()}
          />
          <button onClick={submitQuery} disabled={loading}>
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 7: Advanced Features (Future)

### 7.1 Document Classification

Auto-classify uploaded documents using LLM:

```go
func (s *ClassificationService) Classify(ctx context.Context, text string) (string, float64, error) {
    prompt := `Classify this financial document into one of these categories:
- k1: Schedule K-1 partnership tax forms
- fund_report: Fund performance reports, quarterly/annual reports
- account_statement: Brokerage or bank account statements
- tax_document: Tax returns, 1099s, W-2s
- legal: Legal agreements, contracts, operating agreements
- other: Documents that don't fit above categories

Document excerpt:
%s

Respond with JSON: {"category": "...", "confidence": 0.0-1.0}`

    // Use LLM to classify
}
```

### 7.2 Structured Data Extraction

Extract specific fields from known document types:

```go
// For K-1 documents, extract:
type K1ExtractedData struct {
    PartnershipName      string
    PartnershipEIN       string
    TaxYear              int
    OrdinaryIncome       decimal.Decimal
    RentalIncome         decimal.Decimal
    InterestIncome       decimal.Decimal
    Dividends            decimal.Decimal
    ShortTermCapitalGain decimal.Decimal
    LongTermCapitalGain  decimal.Decimal
    Section199ADividends decimal.Decimal
}
```

### 7.3 Cross-Document Analysis

Enable queries that span multiple documents:

```
User: "What's our total distribution from all PE funds in 2024?"
→ Searches across all K-1s and fund reports
→ Aggregates distributions
→ Returns answer with breakdown by fund
```

### 7.4 Automatic Financial Integration

Link extracted data to Assetra's financial model:

```
1. User uploads K-1
2. System extracts income amounts
3. Prompts user: "Would you like to add this $50,000 partnership income to your 2024 projections?"
4. User confirms → income automatically added to timeline
```

---

## Implementation Order

| Week | Phase | Deliverables |
|------|-------|--------------|
| **1** | **Infrastructure** | pgvector migration, docker-compose with AI service + MinIO, proto definitions |
| **2** | **AI Service Scaffold** | Python project setup, gRPC server skeleton, health checks, logging |
| **3** | **Embedding Service** | OpenAI embedding provider, batch embedding, unit tests |
| **4** | **Document Ingestion** | Upload to MinIO, text extraction (Unstructured.io), async processing |
| **5** | **Chunking** | Financial document chunker implementation, table handling |
| **6** | **Retrieval** | pgvector search, similarity queries, filtering by doc type |
| **7** | **RAG Query** | LLM integration, streaming responses, context building |
| **8** | **Go Integration** | gRPC client in Go backend, REST proxy endpoints |
| **9** | **Frontend** | Upload UI, document library, RAG chat with streaming |
| **10** | **Polish** | Error handling, progress indicators, source citations, tests |
| **11** | **Advanced** | Classification, structured extraction (stretch goal) |

### Milestone Checkpoints

| Milestone | Criteria |
|-----------|----------|
| **M1: Service Running** | AI service starts, health check passes, can receive gRPC calls |
| **M2: Document Processed** | Upload PDF → extract text → chunk → embed → store in pgvector |
| **M3: Basic RAG** | Query → retrieve chunks → LLM generates answer with citations |
| **M4: Production Ready** | Streaming UI, error handling, monitoring, 90% test coverage |

---

## Cost Estimates

| Component | Cost Model | Estimated Monthly (1000 docs) |
|-----------|------------|------------------------------|
| OpenAI Embeddings | $0.00002/1K tokens | ~$5-10 |
| OpenAI GPT-4 Turbo | $0.01/1K input, $0.03/1K output | ~$50-100 (depends on usage) |
| Storage (S3/MinIO) | $0.023/GB | <$5 |
| **Total** | | **~$60-115/month** |

---

## Security Considerations

1. **Data Isolation**: All queries filtered by `user_id` at database level
2. **File Validation**: Validate file types, scan for malware before processing
3. **Storage Encryption**: Encrypt documents at rest in S3/MinIO
4. **Access Logging**: Log all document access for audit trail
5. **Rate Limiting**: Limit embedding/query requests per user

---

## Testing Strategy

1. **Unit Tests**: Chunking strategies, embedding formatting, search queries
2. **Integration Tests**: Full ingestion pipeline, retrieval accuracy
3. **E2E Tests**: Document upload → query → response flow
4. **Accuracy Evaluation**: Build test set of documents with known answers

---

## Open Questions for Design

1. **Chunking Strategy**: What's the optimal chunk size for financial documents? (See Phase 3.2 for TODO)
2. **Re-ranking**: Should we add a re-ranking step after initial retrieval?
3. **Hybrid Search**: Combine vector search with keyword search (BM25)?
4. **Caching**: Cache embeddings for common queries?
5. **Multi-modal**: Support for document images, charts, graphs?
