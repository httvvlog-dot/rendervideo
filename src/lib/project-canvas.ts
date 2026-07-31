import { VIDEO_FORMATS } from "@/config/video-formats";

export function getProjectCanvas(project?: { aspect_ratio?: string | null, canvas_width?: number | null, canvas_height?: number | null }) {
  // Phase 0: Compatibility Layer (Fallback cho các project cũ không có cột)
  const fallback = { aspectRatio: "9:16", width: 1080, height: 1920, orientation: "portrait" };
  
  if (!project || !project.aspect_ratio) return fallback;

  // Lấy từ Mapping chuẩn thay vì tự if/else tính toán
  const format = VIDEO_FORMATS.find(f => f.aspectRatio === project.aspect_ratio);
  
  return {
    aspectRatio: project.aspect_ratio,
    width: project.canvas_width || (format?.width ?? fallback.width),
    height: project.canvas_height || (format?.height ?? fallback.height),
    // Fallback orientation based on format config
    orientation: format?.orientation || fallback.orientation
  };
}
