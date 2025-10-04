## TODO Progress

### Database Setup
- [x] Create `folders` table in Supabase: id (uuid primary), name (text), user_id (uuid), created_at (timestamptz default now()) - SQL provided in database_setup.sql
- [x] Create `files` table in Supabase: id (uuid primary), name (text), folder_id (uuid FK to folders.id), path (text), size (bigint), type (text), uploaded_at (timestamptz default now()), status (text default 'processing') - SQL provided in database_setup.sql
- [x] Enable Row Level Security (RLS) and create policies for user-specific access if needed - SQL provided in database_setup.sql

### API Development
- [x] Create `app/api/folders/route.tsx` for folder CRUD operations (GET, POST, DELETE exist, with user auth)
- [x] Create `app/api/files/route.tsx` to fetch files by folder_id (exists, with user auth via folder)
- [x] Modify `app/api/upload/route.tsx` to accept folder_id and insert file metadata into DB (exists, with user auth via folder)

### Component Updates
- [x] Update `components/FolderList.tsx` to fetch folders from API and calculate docCount (exists, added delete)
- [x] Update `components/DocumentList.tsx` to fetch files for selected folder (exists)
- [x] Update `app/home/page.tsx` to pass selectedFolderId to DocumentList (fixed)

### Testing
- [ ] Test folder creation, file upload with folder association
- [ ] Test fetching files segregated by folder
- [ ] Verify UI updates correctly on folder selection

### Implementation Steps
- [x] Update APIs to include user authentication and user_id
- [x] Add DELETE method to folders API
- [x] Update FolderList to call delete API
- [x] Fix home/page.tsx to pass folderId and folderName to DocumentList
- [x] Update FileUploadModal to accept and send folderId
