-- Enable pgcrypto for UUIDs and pgvector for embeddings later
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============= USERS =============
-- Supabase provides auth.users by default
-- Only add this if you want a custom user table
-- Otherwise, use auth.uid() as you already did

-- ============= FOLDERS =============
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL,  -- references auth.users
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============= DOCUMENTS (FILES) =============
CREATE TYPE file_status AS ENUM ('processing', 'ready', 'failed');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL,                 -- storage path in Supabase bucket
    size BIGINT NOT NULL,               -- file size in bytes
    type TEXT NOT NULL,                 -- MIME type (e.g. application/pdf, text/plain)
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status file_status DEFAULT 'processing'
);

-- ============= EMBEDDINGS (CHUNKS) =============
-- Store text chunks + vectors for retrieval
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT,
    chunk_index INT,
    content TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL    -- adjust dim to match model (e.g. 768 for Google text-embedding-004)
);

-- Vector index for semantic search
CREATE INDEX idx_embeddings_folder ON embeddings(folder_id);
CREATE INDEX idx_embeddings_doc ON embeddings(doc_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Helpful indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_docs_folder_id ON documents(folder_id);

-- ============= RLS ENABLE =============
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============= POLICIES =============
-- Folders
CREATE POLICY "Users can view their own folders" ON folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON folders
    FOR DELETE USING (auth.uid() = user_id);

-- Documents
CREATE POLICY "Users can view documents in their folders" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = documents.folder_id
            AND folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert documents in their folders" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = documents.folder_id
            AND folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents in their folders" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = documents.folder_id
            AND folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete documents in their folders" ON documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = documents.folder_id
            AND folders.user_id = auth.uid()
        )
    );

-- Embeddings (follow folder ownership)
CREATE POLICY "Users can view embeddings in their folders" ON embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = embeddings.folder_id
            AND folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert embeddings in their folders" ON embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = embeddings.folder_id
            AND folders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete embeddings in their folders" ON embeddings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM folders
            WHERE folders.id = embeddings.folder_id
            AND folders.user_id = auth.uid()
        )
    );
