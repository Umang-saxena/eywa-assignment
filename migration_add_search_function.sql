-- Function to search embeddings using cosine similarity
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding VECTOR(768),
  input_folder_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  folder_id UUID,
  doc_id UUID,
  page_number INT,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.folder_id,
    e.doc_id,
    e.page_number,
    e.chunk_index,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.folder_id = input_folder_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
