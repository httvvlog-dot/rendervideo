-- Harden timeline RPC by executing as SECURITY DEFINER to bypass finicky RLS issues during INSERT.
-- The RPC already strictly validates that auth.uid() is NOT NULL and owns the project.

CREATE OR REPLACE FUNCTION public.replace_project_timeline(
  p_project_id UUID,
  p_script_id UUID,
  p_scenes JSONB,
  p_replace_existing BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_project RECORD;
  v_script RECORD;
  v_scene_count INT;
  v_scene JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  IF v_project.user_id != v_uid THEN
    RAISE EXCEPTION 'Unauthorized: Project does not belong to user';
  END IF;

  SELECT * INTO v_script FROM public.scripts WHERE id = p_script_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Script not found';
  END IF;

  IF v_script.project_id != p_project_id THEN
    RAISE EXCEPTION 'Script does not belong to project';
  END IF;

  IF v_project.active_script_id != p_script_id THEN
    RAISE EXCEPTION 'Script is not the active script for this project';
  END IF;

  SELECT COUNT(*) INTO v_scene_count FROM public.project_scenes WHERE project_id = p_project_id;
  
  IF v_scene_count > 0 AND p_replace_existing = FALSE THEN
    RAISE EXCEPTION 'TIMELINE_ALREADY_EXISTS';
  END IF;

  IF p_replace_existing = TRUE THEN
    DELETE FROM public.project_scenes WHERE project_id = p_project_id;
  END IF;

  -- Insert new scenes from JSON array
  FOR v_scene IN SELECT * FROM jsonb_array_elements(p_scenes)
  LOOP
    INSERT INTO public.project_scenes (
      project_id,
      media_id,
      section_id,
      duration,
      start_time,
      end_time,
      sort_order,
      easing,
      start_scale,
      end_scale,
      start_x,
      end_x,
      start_y,
      end_y,
      transition_parameters
    ) VALUES (
      p_project_id,
      (v_scene->>'media_id')::UUID,
      (v_scene->>'section_id')::UUID,
      (v_scene->>'duration')::NUMERIC,
      (v_scene->>'start_time')::NUMERIC,
      (v_scene->>'end_time')::NUMERIC,
      (v_scene->>'sort_order')::INT,
      'linear',
      1.0,
      1.0,
      0,
      0,
      0,
      0,
      '{}'::JSONB
    );
  END LOOP;
END;
$$;
