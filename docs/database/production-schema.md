# Production Database Schema & Migration Status

## Tình trạng hiện tại (26/07/2026)
Môi trường Production (Supabase) đang có sự sai lệch (mismatch) giữa `schema_migrations` và Database Schema thực tế. Nguyên nhân chính là do một số bảng và dữ liệu đã được tạo hoặc chỉnh sửa trực tiếp qua SQL Editor thay vì chạy lệnh `supabase db push`.

### 1. Bảng `ai_models`
- **Tình trạng:** Bảng đã tồn tại và có dữ liệu trên Production.
- **Migration History:** Migration `20260726105051_add_ai_models.sql` **KHÔNG** tồn tại trong lịch sử `schema_migrations` của Production.
- **Cách xử lý an toàn đã áp dụng:** Chạy câu lệnh `ADD COLUMN` thủ công trên Production để khôi phục giao diện Vercel mà không phá vỡ schema cũ:
  ```sql
  ALTER TABLE public.ai_models ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.ai_models ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
  ```

### 2. Bảng `provider_credentials` (Legacy Fields)
- **Tình trạng:** Đang chứa các cột legacy như `image_model`. Các module cũ (Voice, Text, Billing) vẫn đang phụ thuộc vào cột này.
- **Quyết định:** CỐ TÌNH **KHÔNG CHẠY** migration `20260726045709_drop_image_model_from_credentials.sql` trên Production để tránh sập hệ thống.

### 3. Bảng `ai_plan_profiles` (Legacy Fields)
- **Tình trạng:** Đang chứa cột legacy `model_id`.
- **Quyết định:** CỐ TÌNH **KHÔNG CHẠY** thao tác `DROP COLUMN model_id` để tránh lỗi các tiến trình chưa được cập nhật code.

### 4. Bảng `providers` & `provider_credentials` (Schema Compatibility)
- **Tình trạng:** Đang chờ xác minh chính xác các cột trên Production (ví dụ: `last_success_at`, `last_failure_at`) thông qua `information_schema.columns` trước khi áp dụng script tạo `provider_health_view`.
- Lịch sử ghi nhận file `20260725000110_add_health_monitoring_fields.sql` ĐÃ chạy trên Production.

---
*Tài liệu này dùng để theo dõi sự cố lệch Schema giữa Code và Production Database nhằm phục vụ việc Audit và Đồng bộ trong tương lai.*
