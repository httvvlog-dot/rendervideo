const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    for (const [search, replace] of replacements) {
      // Handle global replacement carefully, using split/join is safer than regex to avoid escaping issues
      content = content.split(search).join(replace);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(\`[OK] Translated \${filePath}\`);
  } else {
    console.log(\`[WARN] File not found: \${filePath}\`);
  }
}

// 1. Admin Sidebar
replaceInFile('src/components/admin-sidebar.tsx', [
  ['"Dashboard"', '"Bảng điều khiển"'],
  ['"Providers"', '"Nhà Cung Cấp AI"'],
  ['"Templates"', '"Mẫu & Cấu hình"'],
  ['"Users"', '"Người dùng"'],
  ['"Settings"', '"Cài đặt hệ thống"'],
  ['"Logs"', '"Nhật ký hệ thống"'],
  ['"System Validation"', '"Kiểm tra hệ thống"'],
  ['href="/admin"', 'href="/admin/dashboard"'] // Fix potential route link issue just in case
]);

// 2. User Sidebar
replaceInFile('src/components/app-sidebar.tsx', [
  ['"Dashboard"', '"Tổng quan"'],
  ['"My Projects"', '"Dự án của tôi"'],
  ['"Create New"', '"Tạo Mới"'],
  ['"Downloads"', '"Video đã xuất"'],
  ['"Settings"', '"Tùy chỉnh"']
]);

// 3. Topbars
const topbarReplacements = [
  ['Search...', 'Tìm kiếm...'],
  ['Logout', 'Đăng xuất'],
  ['Profile', 'Hồ sơ cá nhân']
];
replaceInFile('src/components/topbar.tsx', topbarReplacements);
replaceInFile('src/components/admin-topbar.tsx', topbarReplacements);

// 4. User Dashboard
replaceInFile('src/app/(user)/dashboard/page.tsx', [
  ['>Dashboard<', '>Tổng Quan<'],
  ['Welcome back,', 'Chào mừng trở lại,'],
  ['Create Project', 'Tạo Dự Án Mới'],
  ['Total Projects', 'Tổng Dự Án'],
  ['Recent Projects', 'Dự án gần đây'],
  ['Active Drafts', 'Bản Nháp'],
  ['Completed Videos', 'Video Hoàn Thành'],
  ['Estimated Cost', 'Chi phí ước tính'],
  ['View all projects', 'Xem tất cả dự án']
]);

// 5. Projects Page
replaceInFile('src/app/(user)/projects/page.tsx', [
  ['>My Projects<', '>Dự án của tôi<'],
  ['Manage your video generation pipeline.', 'Quản lý luồng sản xuất video của bạn.'],
  ['New Project', 'Dự án Mới'],
  ['No projects yet', 'Chưa có dự án nào'],
  ["You haven't created any video projects. Start your first AI video creation journey now.", "Bạn chưa tạo dự án nào. Bắt đầu hành trình sáng tạo video AI ngay thôi."],
  ['Create your first video', 'Tạo video đầu tiên'],
  ['Duplicate', 'Nhân bản'],
  ['Delete', 'Xóa'],
  ['minutes', 'phút'],
  ['Open Workspace', 'Mở Không Gian'],
  ['>Completed<', '>Hoàn thành<'],
  ['>Draft<', '>Bản nháp<'],
  ['>Failed<', '>Lỗi<'],
  ['>Processing<', '>Đang xử lý<']
]);

// 6. Project Detail Page
replaceInFile('src/app/(user)/projects/[id]/page.tsx', [
  ['>Settings<', '>Cài đặt<'],
  ['>Pipeline Menu<', '>Menu Quy Trình<'],
  ['Generation Pipeline', 'Quy Trình Tạo Tự Động'],
  ['Waiting to start...', 'Đang chờ...'],
  ['Working on it...', 'Đang xử lý...'],
  ['Completed successfully', 'Hoàn thành xuất sắc'],
  ['Error occurred', 'Đã xảy ra lỗi'],
  ['Project Info', 'Thông tin Dự án'],
  ['Language', 'Ngôn ngữ'],
  ['Duration', 'Thời lượng'],
  ['mins', 'phút'],
  ['Status', 'Trạng thái'],
  ['Danger Zone', 'Khu vực Nguy hiểm'],
  ['Once deleted, you cannot restore this project.', 'Một khi đã xóa, bạn sẽ không thể khôi phục dự án này.'],
  ['Delete Project', 'Xóa Dự Án'],
  ['label: "Research"', 'label: "Nghiên cứu"'],
  ['label: "Script"', 'label: "Kịch bản"'],
  ['label: "Voice"', 'label: "Giọng đọc"'],
  ['label: "Subtitle"', 'label: "Phụ đề"'],
  ['label: "Render"', 'label: "Kết xuất"']
]);

// 7. Script Manager
replaceInFile('src/app/(user)/projects/[id]/components/script-manager.tsx', [
  ['No Script Generated', 'Chưa có Kịch Bản'],
  ['Start the AI pipeline by generating the initial video script.', 'Bắt đầu quy trình AI bằng cách tự động sinh kịch bản đầu tiên.'],
  ['> Processing...<', '> Đang xử lý...<'],
  ['> Generate Script<', '> Tạo Kịch Bản<'],
  ['Script Manager', 'Quản lý Kịch Bản'],
  ['Regenerate', 'Tạo Lại'],
  ['words', 'từ'],
  ['Version', 'Phiên bản'],
  ['Generating script via OpenRouter...', 'Đang gọi OpenRouter tạo kịch bản...'],
  ['Script generated successfully!', 'Tạo kịch bản thành công!'],
  ['Deleting...', 'Đang xóa...'],
  ['Deleted', 'Đã xóa'],
  ['Are you sure you want to delete Version', 'Bạn có chắc chắn muốn xóa Phiên bản']
]);

// 8. Admin Providers
replaceInFile('src/app/admin/providers/components/provider-table.tsx', [
  ['Add Provider', 'Thêm Nhà Cung Cấp'],
  ['Provider List', 'Danh sách Nhà Cung Cấp'],
  ['Active', 'Hoạt động'],
  ['Default', 'Mặc định'],
  ['Edit', 'Sửa'],
  ['Test Connection', 'Thử API'],
  ['Provider Name', 'Tên Nhà Cung Cấp'],
  ['API Key', 'Mã API Key'],
  ['Enable Provider', 'Bật Nhà Cung Cấp']
]);

// 9. Login Page (if exists)
replaceInFile('src/app/login/page.tsx', [
  ['Sign in to your account', 'Đăng nhập vào hệ thống'],
  ['Sign in with Google', 'Đăng nhập bằng Google'],
  ['Sign in with GitHub', 'Đăng nhập bằng GitHub'],
  ['Welcome back', 'Chào mừng quay lại']
]);

// 10. Project New Page Wizard
replaceInFile('src/app/(user)/projects/new/page.tsx', [
  ['Create New Project', 'Tạo Dự Án Mới'],
  ['Design your AI video step-by-step.', 'Thiết kế video AI của bạn từng bước một.'],
  ['Saving...', 'Đang lưu...'],
  ['Draft saved locally', 'Đã lưu bản nháp'],
  ['Topic', 'Chủ đề'],
  ['Language', 'Ngôn ngữ'],
  ['Duration', 'Thời lượng'],
  ['Voice', 'Giọng đọc'],
  ['Prompt', 'Câu lệnh AI'],
  ['Render', 'Kết xuất'],
  ['Review', 'Xem lại'],
  ['What is your video about?', 'Video của bạn nói về chủ đề gì?'],
  ['e.g. A documentary about black holes', 'VD: Phim tài liệu về hố đen vũ trụ...'],
  ['Next Step', 'Bước tiếp theo'],
  ['Previous', 'Quay lại'],
  ['Create AI Video', 'Tạo Video AI'],
  ['Generating...', 'Đang khởi tạo...']
]);
