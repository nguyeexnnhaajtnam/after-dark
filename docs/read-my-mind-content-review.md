# Read My Mind — Rà soát nội dung Naughty Cats

Tài liệu này tổng kết đợt viết lại toàn bộ 109 lá bài của Read My Mind theo hướng "Naughty Cats: Sweet to Untamed".

- **Nguồn nội dung:**
  - Tiếng Anh: `apps/api/prisma/seed.ts`
  - Tiếng Việt: `apps/api/prisma/content/read-my-mind.vi.ts`
- **Danh sách đầy đủ:** `docs/read-my-mind-bo-bai.md`

## Cấu trúc giữ nguyên

Bộ bài trước khi sửa khớp với bản brief:

| Loại lá | Số lá mỗi mức | Tổng |
|---|---|---|
| Đọc vị | 6 | 30 |
| Tương tác | 4 | 20 |
| Mong muốn chung | 3 | 15 |
| Nhiệm vụ bí mật | 4 | 20 |
| Thử thách | 4 | 20 |
| Bẻ lái (dùng chung) | — | 4 |

Sau khi sửa, cấu trúc vẫn y như vậy. Những thứ không thay đổi:

- Id lá bài
- Loại lá
- Mức độ nóng
- Số đáp án và thứ tự A/B/C
- Hiệu ứng `ROLE_REVERSAL` / `DOUBLE_SPARK`
- Thuật toán chia bài, cách tính điểm, quy tắc đồng ý

## Đánh giá theo từng mức

**1 · Ngọt ngào**
- **Trước:** giống câu hỏi làm quen ("cách được đón sau ngày dài", "nhạc nền").
- **Sau:**
  - Câu hỏi có ý trêu: bị bắt quả tang nhìn trộm, giành sự chú ý khỏi điện thoại, cố tình thua khi đánh gối.
  - Thử thách có tính thi đấu: đuổi bắt hôn má, đấu mắt có thả thính, tái hiện nụ hôn đầu.
- **Độ nóng:** dễ thương, đôi khi khiến người chơi bất ngờ. Không có nội dung thân mật vượt mức hôn má, hôn tay.

**2 · Tán tỉnh**
- **Trước:** chủ yếu là khen và thả thính nhẹ.
- **Sau:** có sự hồi hộp thật sự.
  - Rượt hôn, môi kề môi mà chưa chạm, câu hỏi "ai chủ động trước".
  - Nhiệm vụ "hôn trộm lên môi rồi tỉnh bơ".
- **Độ nóng:** lần đầu có nụ hôn môi, có yếu tố ai thắng ai thua.

**3 · Nóng bỏng**
- **Trước:** còn những câu an toàn kiểu "mặc gì tối nay".
- **Sau:**
  - Câu hỏi về điểm yếu cụ thể (cổ, sau tai, cổ tay), kiểu "hành hạ" bằng sự chờ đợi, ai ra tay trước.
  - Thử thách cả hai cùng tham gia: ngồi đối mặt trong lòng nhau, hôn dọc cổ, viết chữ lên lưng.
- **Độ nóng:** rõ ràng nóng hơn mức 2. Tiếp xúc cơ thể gần, nhưng chưa cởi đồ.

**4 · Táo bạo**
- **Trước:** câu chữ táo bạo nhưng người chơi chủ yếu ngồi trả lời.
- **Sau:**
  - Đổi quyền kiểm soát có luật rõ ràng: mười phút nắm quyền, trò tượng đá, thử thách cám dỗ.
  - Cởi đồ có giới hạn do mỗi người tự đặt.
  - Câu hỏi buộc người chơi phải tự nói ra điều mình muốn.
- **Độ nóng:** lần đầu có chuyện cởi đồ. Món nào cởi luôn do chính người đó chọn.

**5 · Cuồng nhiệt**
- **Trước:** giống mức 4 nhưng mạnh hơn một chút.
- **Sau:**
  - Tưởng tượng, nhập vai người lạ, bịt mắt, trói nhẹ có từ dừng.
  - "Mặt khuất" của mỗi người trên giường, rượt đuổi cả đêm.
- **Ràng buộc an toàn:**
  - Lá nào chạm tới quyền lực hoặc trói đều yêu cầu thống nhất trước và có từ dừng.
  - Một đáp án luôn là "nói chuyện kỹ trước đã".
  - Không có mô tả tình dục chi tiết.

## Ngôn ngữ Naughty Cats: hai lớp

Quy tắc từ đợt chỉnh thứ hai: **lá bài thường viết như lời tán tỉnh tự nhiên, chữ mèo chỉ dành cho những khoảnh khắc lớn.**

### Lớp A: nội dung lá bài thường

Gồm câu hỏi và đáp án Đọc vị, Tương tác, Mong muốn chung, Nhiệm vụ bí mật, Thử thách.

- **Không có ẩn dụ hay thành ngữ mèo.** 22 lá có yếu tố mèo đã được viết lại, giữ nguyên độ nóng và ý nghĩa từng đáp án.
- **Script quét chỉ còn báo 2 lá, cả hai là báo nhầm, giữ nguyên:**
  - "vuốt tóc" là chạm tóc.
  - "giọng thuyết minh phim thế giới động vật" là trò đùa giọng đọc, không phải hình ảnh mèo.

### Lớp B: sự kiện và phản hồi

Mỗi sự kiện có một tiêu đề kiểu mèo, đi kèm câu mô tả rõ kết quả thật.

| Sự kiện | Tiếng Việt | English |
|---|---|---|
| Đoán trúng (người đoán) | Bắt bài được rồi! | Caught You Purring! |
| Lật bí mật (người giấu bị đoán trúng) | Lộ bí mật rồi nhé! / Bị tóm đuôi rồi nhé. | Cat’s Out of the Bag! / Caught by the Tail. |
| Đoán trật | Mèo này chưa đủ tinh đâu! | Nice Try, Kitty. |
| Người giấu chưa bị đoán ra | Mèo tinh ranh, vẫn kín bưng. | Sneaky Cat. Still Unread. |
| Cơ hội thứ hai kích hoạt / đã dùng | Vẫn còn một mạng! + đáp án đã bị gạch | Nine Lives! + what was crossed out |
| Spark nhân đôi được thưởng | Spark nhân đôi! Phần thưởng lần này được gấp đôi. | Double Trouble! Double Spark doubled this reward. |
| Dùng Lá quyền năng Đảo vai | Tung vuốt bí mật! Bạn đã dùng Đảo vai | Hidden Claws! You played Role Reversal |
| Nhận lời thử thách | Tới lúc ra chiêu! + làm gì tiếp | Time to Pounce! + what to do |
| Hoàn thành Nhiệm vụ bí mật | Mèo nằm vùng lập công! | Undercover Cat! |
| Tương tác hoàn thành | Nghe như có tiếng gừ gừ đâu đây. | Was That a Purr? |
| Cùng muốn | Đúng là bạc hà mèo của nhau. | You’re Each Other’s Catnip. |
| Kết thúc ván, hoà điểm | Hai con mèo, chung một ý. | Two Cats, One Mind. |

**Lá Bẻ lái:**

- Tiêu đề lớn lấy từ lá bài: Giấu vuốt đủ rồi! / Rắc rối nhân đôi! / Chuột cũng biết cắn! / Tò mò có thưởng!
- Ngay dưới là tên chức năng (Đảo vai / Spark nhân đôi) và luật cụ thể (ai giấu, ai đoán, +2 Spark).

**Lá quyền năng:**

- Có tiêu đề phụ: Vẫn còn một mạng! / Giấu vuốt đủ rồi! / Rắc rối nhân đôi!
- Tên chức năng giữ nguyên: Cơ hội thứ hai / Đảo vai / Spark nhân đôi.
- Phần mô tả chỉ nói về cơ chế.

**Tên gọi trong giao diện:** "Mèo nằm vùng" (nhãn Nhiệm vụ bí mật) và "Móng vuốt giấu kín" (khay Lá quyền năng).

**Giữ chữ thường, không chèn chữ mèo:** trạng thái kết nối, chờ người kia, bước đồng ý / từ chối / dừng, thông báo lỗi, điểm số.

## Kiểm tra trùng lặp

Một script tự động đã chạy trên cả hai ngôn ngữ. Nó so câu trùng y hệt, câu gần giống (trùng hơn 50% số từ) và đáp án Đọc vị lặp lại giữa các lá.

- **Kết quả cuối:** không có câu trùng, không có câu gần giống, không có đáp án lặp.
- **Lá đã viết lại vì quá giống nhau:** hai lá `DOUBLE_SPARK` (twist-02 và twist-05). Lá twist-05 được viết lại.
- **Nội dung cũ đã thay vì lặp ý:**
  - Lá cũ có ba nụ hôn "mười giây" ở nhiều mức khác nhau.
  - Nhiệm vụ "khiến người ấy chủ động trước" xuất hiện cả ở mức 3 và mức 5. Mức 5 giờ là "kéo bạn ngồi vào lòng".
  - Thử thách "massage lan dần" cũ đã được viết lại thành trò có người dẫn đường rõ ràng.
- **Phân bố hành động:** hôn vẫn là hành động phổ biến nhất ở Tương tác. Mỗi mức có thêm ít nhất một trò không cần hôn: đấu mắt, nhảy, viết chữ lên lưng, trò tượng, trao quyền, thì thầm.

## Kiểm tra ngôn ngữ

- Lá nào cũng có cả bản tiếng Việt và tiếng Anh. Seed sẽ dừng với lỗi nếu bản tiếng Việt lệch vị trí hoặc số đáp án.
- Đáp án A/B/C mang cùng nghĩa ở cả hai ngôn ngữ (đối chiếu từng lá trong `docs/read-my-mind-bo-bai.md`).
- Không có placeholder trong nội dung lá bài. File chữ giao diện qua `check:i18n`: 589 mục, cú pháp ICU hợp lệ, hai ngôn ngữ cùng key.
- **Văn phong tiếng Việt:**
  - Trung tính về giới ("mình", "bạn", "người ấy"), không dùng anh/em.
  - Thành ngữ mèo được chuyển ý chứ không dịch từng chữ. Ví dụ "Cat got your tongue" thành "Sao tự nhiên im re thế?".

## Tương thích với luật chơi

- **Tương tác:**
  - Mọi lá đều có điều kiện hoàn thành cụ thể (thời gian, số lần, tiêu chí thắng).
  - Người được tác động luôn là người đặt giới hạn: "nói dừng là dừng", "tượng nói trước chỗ không được chạm", "mỗi người tự chọn món đồ".
  - Không lá nào cần đạo cụ đặc biệt, ra ngoài, quay phim chụp ảnh, hay có người thứ ba.
- **Thử thách:**
  - Vẫn là tuỳ chọn, chỉ làm khi cả hai đồng ý.
  - Không có nội dung làm bẽ mặt, gây đau, hay bắt đăng mạng xã hội.
  - Lá cởi đồ ở mức 5 do người làm đưa ra hai lựa chọn trước.
- **Nhiệm vụ bí mật:**
  - Người kia đều quan sát được kết quả, nên có thể xác nhận.
  - Không có nhiệm vụ nào dựa vào lừa dối về sự đồng ý. Đã bỏ nhiệm vụ cũ "khiến người ấy nói 'thôi đi mà'", vì dễ nhầm với lời từ chối.
- **Bẻ lái:** tiêu đề kiểu mèo luôn đi kèm tên chức năng và luật cụ thể (ai giấu, ai đoán, +2 Spark).
- **Lá quyền năng:** mô tả không đổi về cơ chế, chỉ thêm tên phụ.

## Hạn chế còn lại

- 40 lá đã ngừng dùng (`enabled=false`) không được viết lại. Chúng chỉ còn xuất hiện trong các ván cũ đang chơi dở.
- Ván đang chơi dở sẽ hiện nội dung mới ngay từ lá kế tiếp, vì id lá giữ nguyên.
- Chất lượng văn phong do người viết tự đánh giá. Nên cho vài cặp đôi người Việt chơi thử để chỉnh độ nóng của mức 4–5.
