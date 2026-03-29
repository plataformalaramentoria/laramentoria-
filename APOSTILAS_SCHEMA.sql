-- APOSTILAS / WORKBOOKS SCHEMA

-- 1. FOLDERS TABLE
CREATE TABLE IF NOT EXISTS apostila_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. APOSTILAS (FILES) TABLE
CREATE TABLE IF NOT EXISTS apostilas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES apostila_folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Storage path
    file_url TEXT NOT NULL,  -- Public URL
    file_size TEXT,          -- Formatted size
    visibility_type TEXT DEFAULT 'ALL' CHECK (visibility_type IN ('ALL', 'SPECIFIC')),
    visible_students UUID[] DEFAULT '{}', -- Array of Student IDs
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. STORAGE BUCKET: 'apostilas'
-- (Ensure this bucket is created in the Supabase Dashboard)

-- 4. ROW LEVEL SECURITY (RLS)

ALTER TABLE apostila_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE apostilas ENABLE ROW LEVEL SECURITY;

-- Folders Policies
-- Students can see folders that contain at least one visible PDF
CREATE POLICY "Folders: Student view access" ON apostila_folders
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM apostilas 
        WHERE apostilas.folder_id = apostila_folders.id
        AND (
            apostilas.visibility_type = 'ALL' 
            OR auth.uid() = ANY(apostilas.visible_students)
        )
    )
);

CREATE POLICY "Folders: Admin manage everything" ON apostila_folders
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Apostilas (Files) Policies
-- Students: View if visibility is 'ALL' or they are in the 'visible_students' list
CREATE POLICY "Apostilas: Student view access" ON apostilas
FOR SELECT USING (
    visibility_type = 'ALL' 
    OR auth.uid() = ANY(visible_students)
);

CREATE POLICY "Apostilas: Admin manage everything" ON apostilas
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('PROFESSOR', 'ADMIN'))
);

-- Note: Ensure bucket 'apostilas' is created with:
-- 1. Authenticated users can read if metadata RLS allows.
-- 2. Admins can upload/delete.
