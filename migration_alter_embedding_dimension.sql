-- Migration to fix embedding vector dimension mismatch
-- Change from VECTOR(1536) to VECTOR(768) to match Google text-embedding-004 model

-- First, drop the existing vector index
DROP INDEX IF EXISTS idx_embeddings_vector;

-- Alter the embedding column to the correct dimension
ALTER TABLE embeddings ALTER COLUMN embedding TYPE VECTOR(768);

-- Recreate the vector index with the correct dimension
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
