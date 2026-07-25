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
- No module may call an AI provider directly. All AI usage must be routed through BillingEngine.executeAndCharge().
- Không được thêm dữ liệu người dùng (ví dụ: `auth.users`, `profiles`) vào `seed.sql`. `seed.sql` chỉ được chứa dữ liệu hệ thống (System Data). Mọi thao tác gán quyền / thêm user mẫu phải thông qua Bootstrap Script (ví dụ: `npm run admin role`).
- KHÔNG ĐƯỢC sửa trực tiếp các migration cũ đã được áp dụng. Mọi thay đổi schema phải tạo file migration mới. Không được rewrite/chỉnh sửa các migration đã deploy để tránh làm hỏng trạng thái Database giữa các môi trường Local/Staging/Production.
