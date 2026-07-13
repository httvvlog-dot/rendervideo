-- Sprint 4B.3: Section-Based Media Assignment

-- 1. Add section_id to project_media
ALTER TABLE public.project_media
ADD COLUMN section_id UUID NULL
REFERENCES public.script_sections(id)
ON DELETE SET NULL;

CREATE INDEX idx_project_media_section_id ON public.project_media(section_id);

-- 2. Add section_sort_order to project_media
ALTER TABLE public.project_media
ADD COLUMN section_sort_order INTEGER NULL;

-- 3. Add section_id to project_scenes (User Feedback #2)
ALTER TABLE public.project_scenes
ADD COLUMN section_id UUID NULL
REFERENCES public.script_sections(id)
ON DELETE SET NULL;

CREATE INDEX idx_project_scenes_section_id ON public.project_scenes(section_id);

-- 4. Add active_script_id to projects
ALTER TABLE public.projects
ADD COLUMN active_script_id UUID NULL
REFERENCES public.scripts(id)
ON DELETE SET NULL;

CREATE INDEX idx_projects_active_script_id ON public.projects(active_script_id);
