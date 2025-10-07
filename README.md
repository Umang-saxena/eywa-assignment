# Eywa - AI-Powered Document Q&A System

![Eywa Logo](https://img.shields.io/badge/Eywa-Document%20AI-blue?style=for-the-badge&logo=next.js)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)
![Google AI](https://img.shields.io/badge/Google%20AI-Gemini-orange?style=flat-square&logo=google)
![Redis](https://img.shields.io/badge/Redis-Upstash-red?style=flat-square&logo=redis)

Eywa is a sophisticated document management and AI-powered question-answering system that allows users to upload, organize, and query their documents using advanced natural language processing and vector similarity search.

## 🌟 Features

### Core Functionality
- **Document Upload & Processing**: Support for PDF and TXT files with automatic text extraction
- **AI-Powered Q&A**: Ask questions about your documents and get accurate answers with citations
- **Folder Organization**: Keep documents organized in hierarchical folders
- **Vector Search**: Fast semantic search using embeddings and vector similarity
- **Real-time Processing**: Live progress updates during document processing
- **Citation Tracking**: Every answer includes precise document and page references

### Technical Features
- **Authentication**: Secure user authentication with Supabase Auth
- **Caching**: Redis-based caching for improved performance
- **Embeddings**: Google Gemini text-embedding-004 for high-quality vector representations
- **Database**: PostgreSQL with pgvector extension for vector operations
- **Responsive UI**: Modern, responsive interface built with Tailwind CSS and Radix UI

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/ML**: Google Generative AI (Gemini 2.5 Flash, text-embedding-004)
- **Caching**: Upstash Redis
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth

### Database Schema
- **Users**: Managed by Supabase Auth
- **Folders**: Hierarchical document organization
- **Documents**: File metadata and content storage
- **Embeddings**: Vector representations for semantic search

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Google AI API key
- Upstash Redis account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/eywa.git
   cd eywa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google AI Configuration
   GOOGLE_API_KEY=your_google_ai_api_key

   # Redis Configuration (Upstash)
   UPSTASH_REDIS_REST_URL=your_upstash_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
   ```

4. **Set up the database**
   Run the SQL scripts in order:
   ```sql
   -- Run these in your Supabase SQL editor
   -- 1. database_setup.sql
   -- 2. migration_add_content.sql
   -- 3. migration_add_search_function.sql
   -- 4. migration_alter_embedding_dimension.sql
   ```

5. **Configure Supabase Storage**
   - Create a bucket named `FileUpload`
   - Set appropriate RLS policies for file access

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
eywa/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── chat/                 # AI chat functionality
│   │   ├── files/                # File management
│   │   ├── folders/              # Folder management
│   │   ├── process-embeddings/   # Document processing
│   │   └── upload/               # File upload handling
│   ├── auth/                     # Authentication page
│   ├── home/                     # Main application page
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── ui/                       # Reusable UI components (Radix)
│   ├── AuthForm.tsx              # Login/signup form
│   ├── ChatPanel.tsx             # AI chat interface
│   ├── DocumentList.tsx          # Document display
│   ├── FileUploadModal.tsx       # File upload dialog
│   ├── FolderList.tsx            # Folder management
│   └── LandingPage.tsx           # Landing page
├── lib/                          # Utility libraries
│   ├── redis.ts                  # Redis client and caching
│   └── supabaseClient.ts         # Supabase client
├── database/                     # Database setup scripts
│   ├── database_setup.sql
│   ├── migration_*.sql
├── public/                       # Static assets
└── package.json                  # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `GOOGLE_API_KEY` | Google AI API key | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Yes |

### Database Setup
The application uses PostgreSQL with the pgvector extension for vector similarity search. Run the provided SQL scripts to set up the database schema and functions.

## 🎯 Usage

### User Workflow
1. **Sign Up/Login**: Create an account or sign in
2. **Create Folders**: Organize your documents in folders
3. **Upload Documents**: Upload PDF or TXT files
4. **Ask Questions**: Use the chat interface to query your documents
5. **View Citations**: See exact sources for each answer

### Document Processing
- PDFs are parsed page-by-page for accurate citation tracking
- Text is chunked with overlap for comprehensive coverage
- Embeddings are generated using Google's text-embedding-004 model
- Vector similarity search enables semantic matching

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/session` - Session verification

### Document Management
- `GET /api/folders` - List user folders
- `POST /api/folders` - Create folder
- `PUT /api/folders?id={id}` - Update folder
- `DELETE /api/folders?id={id}` - Delete folder

- `GET /api/files?folder_id={id}` - List folder documents
- `DELETE /api/files?id={id}` - Delete document

### AI Features
- `POST /api/chat` - Query documents with AI
- `POST /api/upload` - Upload and process documents
- `POST /api/process-embeddings` - Generate embeddings

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Supabase** - Open source Firebase alternative
- **Google AI** - Powerful AI models and embeddings
- **Vercel** - Deployment platform
- **Upstash** - Serverless Redis
- **Radix UI** - Accessible component library

