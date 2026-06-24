# AI YOUTUBE VIDEO GENERATOR RULES

- Không được render trực tiếp trong Next.js.
- Mọi render phải đi qua Render Worker.
- Mọi AI Provider phải cấu hình từ Admin (lấy từ bảng `providers` hoặc `encrypted_secrets`).
- Mọi media phải lưu trên Cloudflare R2 (qua bảng `storage_files`).
- Tuyệt đối không hardcode bất kỳ API Key nào.
- Media Reuse Engine luôn chạy trước khi tạo media mới.
- Mọi job đều phải ghi log.
- Mọi lỗi đều phải ghi vào `error_logs`.
- Mọi prompt đều phải ghi vào `prompt_executions`.
- Ưu tiên hoàn thành toàn bộ luồng Generate Script → Generate Voice → Generate Subtitle → Render → Download MP4 trước khi xây dựng bất kỳ tính năng nâng cao nào.
