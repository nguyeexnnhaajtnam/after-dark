# Deploy AFTER DARK: Neon + Render + Vercel

| Phần | Nơi chạy | Ghi chú |
|---|---|---|
| Database | Neon (PostgreSQL) | Chọn region Singapore (AWS ap-southeast-1) |
| API (`apps/api`) | Render, Web Service | Socket.IO cần một process chạy liên tục |
| Web (`apps/web`) | Vercel | Next.js |

Làm theo thứ tự dưới đây, vì mỗi bước cần địa chỉ (URL) có được từ bước trước.

## 1. Neon

1. Tạo project, chọn region **Singapore** (cùng khu vực với Render).
2. Vào **Connection Details** và **tắt Connection pooling**, để lấy chuỗi kết nối *direct*. Host của chuỗi này không có chữ `-pooler`. Ví dụ:
   `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - Lý do: `prisma migrate` cần kết nối trực tiếp. Với một API chỉ chạy một instance, kết nối direct là đủ.
3. Giữ chuỗi này làm `DATABASE_URL`.

## 2. Render (API)

1. Push code (gồm `render.yaml` ở thư mục gốc) lên GitHub.
2. Trên Render, chọn **New → Blueprint** rồi chọn repo `after-dark`. Render tự đọc `render.yaml`.
3. Nhập các biến được hỏi:
   - `DATABASE_URL`: chuỗi Neon ở bước 1.
   - `WEB_ORIGIN`: tạm để `https://after-dark.vercel.app`, rồi sửa lại ở bước 4 khi đã có domain thật.
   - `RECONNECT_TOKEN_PEPPER`: Render tự tạo ngẫu nhiên. **Đừng đổi giá trị này về sau**, nếu không mọi người chơi đang có phiên sẽ bị đăng xuất.
4. Mỗi lần deploy, bước build sẽ:
   - cài các package bằng pnpm;
   - generate Prisma client và build NestJS;
   - chạy `prisma migrate deploy` (chỉ áp các migration mới, không xoá dữ liệu);
   - chạy seed (chạy lại nhiều lần không tạo dữ liệu trùng).
5. Kiểm tra: mở `https://<tên-service>.onrender.com/api/v1/health`, phải thấy `{"status":"ok",...}`.

**Gói miễn phí (Free):** service sẽ ngủ sau khoảng 15 phút không có request, và mất khoảng 50 giây để thức dậy. Khi ngủ, mọi phòng đang chơi đều mất kết nối. File `render.yaml` đang để `plan: free`. Khi chơi thật, đổi thành `plan: starter` (có phí) để service không ngủ.

## 3. Vercel (Web)

1. **Add New → Project**, chọn repo, rồi bấm **Import single project** ở dòng **web**. Không chọn "Services".
2. Root Directory: `apps/web`. Framework: Next.js. Vercel tự nhận pnpm qua `pnpm-lock.yaml`.
3. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://<tên-service>.onrender.com/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL` = `https://<tên-service>.onrender.com`
   - Hai biến này được gắn cứng vào bản build, nên đổi giá trị thì phải **Redeploy**.
4. Deploy, rồi ghi lại domain thật, ví dụ `https://after-dark-xyz.vercel.app`.

## 4. Nối hai bên

1. Trên Render, đặt `WEB_ORIGIN` = domain Vercel ở bước 3. Muốn cho cả bản preview, ghi nhiều domain cách nhau bằng dấu phẩy.
2. Lưu lại. Render sẽ tự khởi động lại API.
3. Thử: mở web, tạo phòng trên một máy, vào phòng bằng máy thứ hai, chơi qua một lá.

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân |
|---|---|
| Web báo lỗi kết nối, console có lỗi CORS | `WEB_ORIGIN` không khớp chính xác với domain web (sai `https`, thừa dấu `/` ở cuối) |
| Socket liên tục "đang kết nối lại" | `NEXT_PUBLIC_SOCKET_URL` sai, hoặc service Free đang ngủ |
| Build Render lỗi ở bước migrate | `DATABASE_URL` đang là chuỗi pooler, hoặc thiếu `sslmode=require` |
| Đổi URL API mà web vẫn gọi URL cũ | Chưa Redeploy web sau khi đổi biến `NEXT_PUBLIC_*` |
