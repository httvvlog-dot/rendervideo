-- Cập nhật trigger để tự động tạo ví (wallet) khi user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Tạo profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');

  -- 2. Tạo wallet mặc định
  INSERT INTO public.wallets (user_id)
  VALUES (new.id)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Script này sẽ quét toàn bộ user hiện có và tự động tạo ví (wallet) cho những ai chưa có
-- Điều này giải quyết tình trạng cấp credit báo thành công nhưng không thấy credit đâu
INSERT INTO public.wallets (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT DO NOTHING;
