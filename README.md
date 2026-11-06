# Website bài học Tin học 12 - Bài 23

Trang học sinh có thể được đăng công khai. Điểm danh và câu trả lời được ghi vào Google Sheet của giáo viên; website không có chức năng đọc danh sách hoặc bài làm. Hãy giữ quyền chia sẻ của Google Sheet ở chế độ riêng tư.

## 1. Tạo bảng tính riêng của giáo viên

1. Tạo một Google Sheet mới bằng tài khoản của giáo viên.
2. Trong bảng tính, chọn **Tiện ích mở rộng → Apps Script**.
3. Thay nội dung `Code.gs` bằng mã trong [google-apps-script/Code.gs](google-apps-script/Code.gs), lưu dự án, rồi tải lại trang tính.
4. Chọn menu **Bài học Bài 23 → Khởi tạo bảng điểm danh** và cấp quyền cho tài khoản giáo viên. Mã sẽ tự tạo tab `DiemDanh_Bai23`; hai cột mã phiên nội bộ được ẩn.
5. Không bật chia sẻ công khai cho bảng tính. Chỉ chủ sở hữu và những người được giáo viên chủ động chia sẻ mới xem được dữ liệu.

Mỗi lượt điểm danh được ghi trước khi học sinh bắt đầu. Câu trả lời được ghi vào cùng dòng sau khi học sinh hoàn thành và nộp bài. Website không có API đọc dữ liệu từ bảng tính.

## 2. Cấu hình đầu nhận bài

1. Trong Apps Script, chọn **Triển khai → Lần triển khai mới → Ứng dụng web**.
2. Chọn **Thực thi với tư cách: Tôi** và đặt quyền truy cập là **Bất kỳ ai** để học sinh không cần đăng nhập Google. Nếu tài khoản trường không cho phép chế độ này, quản trị viên Google Workspace cần bật quyền truy cập phù hợp.
3. Triển khai, cấp quyền nếu được hỏi, rồi sao chép URL ứng dụng web kết thúc bằng `/exec`.
4. Mở `app.js`, thay giá trị `SCRIPT_URL` ở đầu file bằng URL vừa sao chép. URL này cho phép gửi điểm danh/bài làm, nhưng không cấp quyền xem bảng tính.

Khi cập nhật `google-apps-script/Code.gs`, hãy lưu mã, chọn **Triển khai → Quản lý các lần triển khai → Chỉnh sửa → Phiên bản mới → Triển khai** để URL hiện tại chạy mã mới. Nếu Sheet đã nhận lượt điểm danh nhưng website báo hết thời gian chờ, hãy kiểm tra Sheet trước khi thử lại để tránh tạo thêm lượt trùng.

## 3. Đưa website học sinh lên mạng

Đưa các mục sau lên dịch vụ hosting trang tĩnh có HTTPS (ví dụ GitHub Pages hoặc Netlify):

- `index.html`
- `style.css`
- `app.js`
- thư mục `assets`

Sau đó mở link HTTPS của hosting bằng cửa sổ riêng tư/thiết bị khác để kiểm tra: học sinh điểm danh, điền bài, nộp thử và xác nhận dòng xuất hiện trong tab `DiemDanh_Bai23`. Dùng một tài khoản không có quyền với Google Sheet để xác nhận rằng không thể mở bảng tính. Chỉ chia sẻ link trang web cho học sinh.

## Quyền riêng tư

- Học sinh gửi dữ liệu đến Apps Script đã triển khai; website công khai không tải danh sách điểm danh hay bài làm.
- Apps Script chỉ có các thao tác ghi điểm danh và ghi bài theo mã phiên; không cung cấp thao tác đọc/xuất dữ liệu.
- Google Sheet được giữ riêng tư; giáo viên xem và tải bảng tính trực tiếp bằng tài khoản Google của mình.
- Không đưa URL của Google Sheet, mật khẩu, hoặc mã truy cập riêng vào `app.js`.
