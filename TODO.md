# TODO: Segregate and Fetch Files by Folder from Supabase

## Database Setup
- [x] Create `folders` table in Supabase: id (uuid primary), name (text), user_id (uuid), created_at (timestamptz default now()) - SQL in database_setup.sql
- [x] Create `files` table in Supabase: id (uuid primary), name (text), folder_id (uuid FK to folders.id), path (text), size (bigint), type (text), uploaded_at (timestamptz default now()), status (text default 'processing') - SQL in database_setup.sql
- [x] Enable Row Level Security (RLS) and create policies for user-specific access if needed - SQL in database_setup.sql

## API Development
- [x] Create `app/api/folders/route.tsx` for folder CRUD operations
- [x] Create `app/api/files/route.tsx` to fetch files by folder_id
- [x] Modify `app/api/upload/route.tsx` to accept folder_id and insert file metadata into DB

## Component Updates
- [x] Update `components/FolderList.tsx` to fetch folders from API and calculate docCount
- [x] Update `components/DocumentList.tsx` to fetch files for selected folder
- [x] Update `app/home/page.tsx` to pass selectedFolderId to DocumentList

## Testing
- [ ] Test folder creation, file upload with folder association
- [ ] Test fetching files segregated by folder
- [ ] Verify UI updates correctly on folder selection
