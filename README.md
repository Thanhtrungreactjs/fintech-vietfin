# VietFin — Nền tảng Fintech đầy đủ chức năng

Ứng dụng full-stack gồm 5 mô-đun nghiệp vụ: Ví điện tử, Cho vay ngang hàng (P2P Lending),
Bảo hiểm (Insurtech), Ngân hàng số (Digital Banking) và Quản lý tài chính doanh nghiệp.

## Kiến trúc

- `server/` — Node.js + Express + Prisma ORM + SQLite (dev). REST API tại `http://localhost:4000/api`.
- `client/` — React + Vite + Tailwind CSS v4. Chạy tại `http://localhost:5173`, proxy `/api` sang backend.

## Chạy dự án lần đầu

```bash
# Backend
cd server
npm install
npx prisma migrate dev --name init   # tạo database SQLite (server/prisma/dev.db)
node prisma/seed.js                  # seed các gói bảo hiểm mẫu
npm run dev                          # http://localhost:4000

# Frontend (terminal khác)
cd client
npm install
npm run dev                          # http://localhost:5173
```

Mở `http://localhost:5173`, đăng ký tài khoản mới để bắt đầu.

## Các mô-đun đã triển khai

- **Ví điện tử**: nạp/rút/chuyển khoản nội bộ, đối soát số dư theo thời gian thực, sao kê có
  bộ lọc, cơ chế `idempotencyKey` chống nhân đôi giao dịch khi retry.
- **Cho vay P2P**: đăng ký vay, engine chấm điểm tín dụng dựa trên dữ liệu hành vi thay thế
  (tuổi ví, lịch sử giao dịch, lịch sử trả nợ), giải ngân, lịch trả nợ khấu hao giảm dần, tự
  động đánh dấu quá hạn và tính phạt trễ hạn.
- **Bảo hiểm**: đăng ký gói, tính phí tự động (dùng lại engine chấm điểm rủi ro của mô-đun
  vay), quản lý hợp đồng (gia hạn/huỷ), quy trình xử lý bồi thường (nộp → xét duyệt → giải ngân).
- **Ngân hàng số**: trang tổng quan hợp nhất số dư ví/khoản vay/hợp đồng bảo hiểm, công cụ
  ngân sách cá nhân theo danh mục chi tiêu với cảnh báo vượt hạn mức.
- **Tài chính doanh nghiệp**: sổ cái tự động ghi nhận thu/chi từ mọi mô-đun, dự báo dòng tiền
  dựa trên lịch trả nợ và hoá đơn sắp đến hạn, hoá đơn điện tử, báo cáo tài chính theo tháng.

## Ghi chú kỹ thuật

- Database dùng SQLite cho môi trường dev (không cần cài đặt gì thêm). Để chuyển sang
  PostgreSQL cho production: đổi `provider = "postgresql"` và `DATABASE_URL` trong
  `server/prisma/schema.prisma` / `server/.env`, sau đó chạy lại `npx prisma migrate dev`.
- Các trường trạng thái (status/type) dùng kiểu `String` thay vì enum gốc của Prisma để tương
  thích cả SQLite lẫn PostgreSQL.
- eKYC và duyệt hồ sơ hiện dùng luật đơn giản hoá (rule-based) để mô phỏng quy trình thật —
  phù hợp cho demo/MVP, cần thay thế bằng nhà cung cấp KYC/underwriting thật khi lên production.
