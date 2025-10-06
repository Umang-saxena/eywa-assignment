import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Validate environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

interface ChatRequest {
  message: string;
  fileId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface Citation {
  docName: string;
  page?: number;
  section?: string;
  similarity?: number;
}

interface ChatResponse {
  content: string;
  citations: Citation[];
  chunks: string[];
  error?: string;
}

interface EmbeddingChunk {
  content: string;
  page_number?: number;
  chunk_index: number;
  similarity: number;
  document_name?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { message, fileId, conversationHistory = [] }: ChatRequest = body;

    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid message is required' },
        { status: 400 }
      );
    }

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json(
        { error: 'Valid fileId is required' },
        { status: 400 }
      );
    }

    // Trim message to reasonable length
    const trimmedMessage = message.trim().slice(0, 2000);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch file details from database
    const { data: fileData, error: fileError } = await supabase
      .from('documents')
      .select('id, name, folder_id, type')
      .eq('id', fileId)
      .single();

    if (fileError) {
      console.error('Database error:', fileError);
      return NextResponse.json(
        { error: 'Failed to fetch file details' },
        { status: 500 }
      );
    }

    if (!fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (!fileData.folder_id) {
      return NextResponse.json(
        { error: 'File folder not found' },
        { status: 500 }
      );
    }

    // Generate embedding for the user's query
    let queryEmbedding: number[];
    try {
      console.log('Generating embedding for query:', trimmedMessage);
      const embeddingModel = genAI.getGenerativeModel({
        model: 'text-embedding-004'
      });
      const queryEmbeddingResult = await embeddingModel.embedContent(trimmedMessage);
      queryEmbedding = queryEmbeddingResult.embedding.values;
      console.log('Query embedding generated, length:', queryEmbedding.length);

      // Validate embedding
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error('Invalid embedding generated');
      }
    } catch (embeddingError) {
      console.error('Embedding generation error:', embeddingError);
      return NextResponse.json(
        { error: 'Failed to generate query embedding' },
        { status: 500 }
      );
    }

    // Search for similar document chunks using vector similarity
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'search_embeddings',
      {
        query_embedding: queryEmbedding,
        input_folder_id: fileData.folder_id,
        match_threshold: 0.1,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
      return NextResponse.json(
        { error: 'Failed to search document embeddings' },
        { status: 500 }
      );
    }

    // Debug logging
    console.log(`Folder ID: ${fileData.folder_id}`);
    const { data: embeddingData, error: countError } = await supabase
      .from('embeddings')
      .select('id')
      .eq('folder_id', fileData.folder_id);
    if (countError) {
      console.error('Count error:', countError);
    }
    console.log(`Total embeddings in folder: ${embeddingData?.length || 0}`);
    console.log(`Search results for query "${trimmedMessage}": found ${similarChunks?.length || 0} chunks`);
    if (similarChunks && similarChunks.length > 0) {
      console.log('Similarities:', similarChunks.map((c: any) => c.similarity));
      console.log('Chunk contents preview:', similarChunks.slice(0, 2).map((c: any) => c.content.substring(0, 100) + '...'));
    } else {
      // Log some stored embeddings to check content
      const { data: sampleEmbeddings, error: sampleError } = await supabase
        .from('embeddings')
        .select('content')
        .eq('folder_id', fileData.folder_id)
        .limit(2);
      if (!sampleError && sampleEmbeddings) {
        console.log('Sample stored content:', sampleEmbeddings.map(e => e.content.substring(0, 100) + '...'));
      }
    }

    // Handle case where no relevant chunks are found
    if (!similarChunks || similarChunks.length === 0) {
      return NextResponse.json({
        content: "I couldn't find relevant information in the document to answer your question. Could you please rephrase or ask something else?",
        citations: [],
        chunks: [],
      });
    }

    // Extract and prepare context from retrieved chunks
    const typedChunks = similarChunks as EmbeddingChunk[];
    const contextChunks = typedChunks.map((chunk) => chunk.content);
    const context = contextChunks.join('\n\n---\n\n');

    // Build conversation context if history exists
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .slice(-5) // Keep last 5 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');
    }

    // Generate response using Gemini with improved prompt
    let generatedContent: string;
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      const prompt = `You are a knowledgeable assistant helping users understand documents. Answer questions based strictly on the provided context.

Rules:
- Only use information from the context below
- If the context doesn't contain the answer, politely say you don't have that information
- Be concise but thorough
- Use natural, conversational language
- Cite specific parts of the context when relevant

${conversationContext ? `Previous Conversation:\n${conversationContext}\n\n` : ''}Document Context:
${context}

Current Question: ${trimmedMessage}

Answer:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      generatedContent = response.text() || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (generationError) {
      console.error('Content generation error:', generationError);
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Prepare citations with similarity scores
    const citations: Citation[] = typedChunks.map((chunk) => ({
      docName: fileData.name,
      page: chunk.page_number,
      section: `Chunk ${chunk.chunk_index}`,
      similarity: Math.round(chunk.similarity * 100) / 100,
    }));

    // Build response
    const response: ChatResponse = {
      content: generatedContent,
      citations: citations,
      chunks: contextChunks,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Return user-friendly error message
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}