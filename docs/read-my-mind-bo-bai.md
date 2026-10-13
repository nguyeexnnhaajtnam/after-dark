# Read My Mind — Toàn bộ lá bài

Bộ bài đang dùng có **109 lá**: mỗi nhóm có 5 mức độ nóng, cộng thêm 4 lá Bẻ lái dùng chung cho mọi mức. Nội dung lấy từ `apps/api/prisma/seed.ts` (tiếng Anh) và `apps/api/prisma/content/read-my-mind.vi.ts` (tiếng Việt).

## Tổng quan

| Mức | Đọc vị | Tương tác | Mong muốn chung | Nhiệm vụ bí mật | Thử thách | Cộng |
|---|---|---|---|---|---|---|
| 1 · Ngọt ngào (Sweet) | 6 | 4 | 3 | 4 | 4 | 21 |
| 2 · Tán tỉnh (Flirty) | 6 | 4 | 3 | 4 | 4 | 21 |
| 3 · Nóng bỏng (Spicy) | 6 | 4 | 3 | 4 | 4 | 21 |
| 4 · Táo bạo (Daring) | 6 | 4 | 3 | 4 | 4 | 21 |
| 5 · Cuồng nhiệt (Wild) | 6 | 4 | 3 | 4 | 4 | 21 |
| Mọi mức | Bẻ lái: 4 lá | | | | | 4 |

**Mỗi ván chia gì:** 12 vòng = 5 Đọc vị + 3 Tương tác + 2 Mong muốn chung + 2 Bẻ lái. Ngoài ra mỗi người nhận 2 Nhiệm vụ bí mật, và hệ thống chuẩn bị sẵn 6 lá Thử thách cho những lần đoán trật.

**Cách chọn theo mức nóng:** chỉ lấy lá có mức **≤ mức chủ phòng chọn**. Khoảng 60% lá là đúng mức đã chọn, phần còn lại ưu tiên mức thấp hơn một bậc rồi mới tới các mức thấp hơn nữa. Không bao giờ lấy lá nóng hơn mức đã chọn.

**Các loại lá:**
- **Đọc vị (Mind Reader):** một người bí mật chọn 1 trong 3 đáp án, người kia đoán. Đoán trúng thì được Spark.
- **Tương tác (Chemistry):** cả hai cùng bấm "Tôi đồng ý" thì mới làm. Mỗi lá có thêm dòng hướng dẫn.
- **Mong muốn chung (Mutual Desire):** mỗi người bí mật chọn Có / Có thể / Không. Chỉ báo "trùng ý" khi cả hai cùng chọn Có; nếu không, không ai biết người kia đã chọn gì.
- **Nhiệm vụ bí mật (Secret Mission):** chỉ người nhận nhìn thấy. Làm được thì xin người kia xác nhận.
- **Thử thách (Forfeit):** tuỳ chọn, chỉ làm khi cả hai đồng ý. Người đoán trật là người làm.
- **Bẻ lái (Plot Twist):** thay đổi luật cho lá Đọc vị kế tiếp.

Mỗi mục ghi bản tiếng Việt trước, bản tiếng Anh ở dòng dưới. Đáp án A/B/C giữ đúng thứ tự ở cả hai ngôn ngữ.

---

## Mức 1 · Ngọt ngào (Sweet)

### Đọc vị (6)

1. **Nếu bắt gặp bạn đang nhìn mình không rời mắt, mình sẽ muốn bạn làm gì tiếp?**  
   *If I catch you staring at me, what do I want you to do next?*
   - A. Quay đi, giả vờ như chưa có gì — *Look away and pretend nothing happened*
   - B. Nhìn lại thật lâu tới khi mình bật cười — *Stare right back until I crack up*
   - C. Bước tới hôn mình, không nói một lời — *Walk over and kiss me without a word*

2. **Mình đang dán mắt vào điện thoại. Chiêu giành sự chú ý “lầy” nhất là…**  
   *I’m glued to my phone. The sneakiest way to steal my attention is…*
   - A. Lén luồn tay vào tay mình — *Slip your hand into mine*
   - B. Hôn lên vai tới khi mình chịu ngẩng lên — *Kiss my shoulder until I look up*
   - C. Giật điện thoại rồi bắt mình đuổi theo — *Snatch the phone and make me chase you*

3. **Muốn cố tình làm mình đỏ mặt, chiêu nào ăn chắc nhất?**  
   *To make me blush on purpose, the trick that never fails is…*
   - A. Một lời khen chẳng vì lý do gì — *A compliment out of nowhere*
   - B. Đọc to tin nhắn sến nhất mình từng gửi — *Reading my cheesiest old text out loud*
   - C. Cười với mình như đang giữ một bí mật — *Smiling at me like you know a secret*

4. **Cử chỉ mình thầm mong bạn chủ động nhiều hơn…**  
   *The move I secretly wish you made more often…*
   - A. Nắm tay kéo mình lại gần — *Pulling me in by the hand*
   - B. Hôn trộm sau gáy — *A sneaky kiss on the back of my neck*
   - C. Ôm mình từ phía sau — *Wrapping your arms around me from behind*

5. **Hai đứa đang đánh gối. Thật ra mình tính…**  
   *We’re in a pillow fight. My real plan is to…*
   - A. Thắng cho bằng được — *Win, fair and square*
   - B. Cố tình thua để ngã vào lòng bạn — *Lose on purpose and land in your arms*
   - C. Xin đình chiến rồi hôn trộm một cái — *Call a truce and steal a kiss*

6. **Cái tên mình muốn nghe bạn gọi nhất, thì thầm sát bên tai…**  
   *The name I most want to hear you say, right against my ear…*
   - A. Một tên cưng ngọt lịm — *Something sugary sweet*
   - B. Biệt danh lém lỉnh chỉ hai đứa hiểu — *A cheeky nickname only we get*
   - C. Tên thật của mình, gọi thật chậm — *My real name, said slowly*

### Tương tác (4)

1. **Đuổi bắt hôn trộm: hôn má nhau, nhưng phải né được của đối phương.** Ba mươi giây, cả hai cùng lúc. Ai hôn trúng nhiều hơn thì thắng.  
   *Kiss tag: land a kiss on each other’s cheek while dodging theirs. Thirty seconds, both of you at once. Most cheek kisses landed wins.*
2. **Đấu mắt, được phép thả thính.** Nhìn thẳng vào mắt nhau. Nhăn mặt hay nói lời ngọt để phá đều được. Ai cười hoặc quay đi trước phải hôn tay người thắng.  
   *Staring contest, flirting allowed. Eyes locked. Funny faces and sweet lines are fair game. Whoever laughs or looks away first kisses the winner’s hand.*
3. **Tái hiện nụ hôn đầu, nhưng phải hay hơn.** Vẫn hồi hộp như lần đó, chỉ một lần duy nhất. Xong cả hai cùng chấm xem có hơn bản gốc không.  
   *Recreate your first kiss, only better. Same nerves, one take. Then you both vote on whether it beat the original.*
4. **Gãi lưng cho nhau tới khi người kia phải khẽ thở dài: mỗi người ba mươi giây.** Người được gãi chỉ chỗ và chọn lực tay. Xong thì đổi lượt.  
   *Back scratches until the other one sighs: thirty seconds each. The one being scratched picks the spot and the pressure. Then swap.*

### Mong muốn chung (3)

1. Bạn có muốn đặt “thuế hôn”: ai về nhà trước phải nộp một nụ hôn?  
   *Would you like a kiss tax: whoever walks through the door first pays one kiss?*
2. Bạn có muốn hai đứa có một ám hiệu riêng nghĩa là “lại đây hôn mình”?  
   *Would you like a secret signal that means “come here and kiss me”?*
3. Bạn có muốn một ngày Chủ nhật lười, tới trưa mới thèm mặc đồ?  
   *Would you like a lazy Sunday where nobody gets dressed before noon?*

### Nhiệm vụ bí mật (4)

1. Được người ấy khen một câu mà không cần “câu”.  
   *Get a compliment from your partner without fishing for it.*
2. Hôn lén người ấy ba lần (má, tay hoặc vai) trước khi hết ván.  
   *Sneak three kisses onto your partner (cheek, hand or shoulder) before the game ends.*
3. Làm người ấy đỏ mặt bằng một lời khen cụ thể tới mức không chối được.  
   *Make your partner blush with a compliment so specific they can’t brush it off.*
4. Khiến người ấy nắm tay bạn trọn một vòng.  
   *Get your partner to hold your hand for a whole round.*

### Thử thách (4)

1. Nhại lại kiểu người ấy thả thính, càng giống càng tốt.  
   *Do your best impression of your partner trying to flirt.*
2. Hát tặng người ấy một câu tình ca, mắt không rời.  
   *Sing your partner one line of a love song, eyes locked.*
3. Người ấy đặt cho bạn một biệt danh ngớ ngẩn, gọi là phải dạ tới hết ván.  
   *Your partner names you something silly, and you answer to it for the rest of the game.*
4. Thú nhận khoảnh khắc đầu tiên bạn nghĩ “toang rồi, mình thích người này”.  
   *Confess the moment you first thought “uh-oh, I like this one”.*

---

## Mức 2 · Tán tỉnh (Flirty)

### Đọc vị (6)

1. **Chiêu thả thính nào của bạn khiến mình chịu thua nhanh nhất?**  
   *Which of your flirting moves makes me give in fastest?*
   - A. Nhìn thẳng vào mắt rồi cười đầy ẩn ý — *Holding eye contact with a knowing smile*
   - B. Ghé sát tai nói một câu thật táo bạo — *Whispering something daring in my ear*
   - C. Hôn nhẹ rồi quay đi như chưa có chuyện gì — *Stealing a quick kiss and walking away*

2. **Giữa chỗ đông người, tín hiệu nào khiến mình phải tìm tới bạn ngay?**  
   *Across a crowded room, the signal that would make me come straight to you…*
   - A. Một cái nháy mắt thật chậm — *One slow wink*
   - B. Tin nhắn chỉ có đúng một chữ: “ngay” — *A text that just says “now”*
   - C. Nhìn mình rồi khẽ cắn môi — *Looking at me and biting your lip*

3. **Môi kề môi mà chưa chạm. Mình nhịn được bao lâu?**  
   *Lips almost touching. How long do I hold out before I close the gap?*
   - A. Ba giây là cùng — *Three seconds, tops*
   - B. Tới khi bạn chịu thua trước — *Until you crack first*
   - C. Không bao giờ. Mình bắt bạn phải tự tới — *I never do. I make you come to me*

4. **Khoảnh khắc nào của bạn khiến mình không cưỡng lại nổi?**  
   *The moment you’re impossible for me to resist…*
   - A. Khi bạn cười ngặt nghẽo — *Laugh with your whole body*
   - B. Khi bạn say sưa với điều mình đam mê — *Get completely lost in something you love*
   - C. Khi bạn vừa ngủ dậy, tóc rối bù — *Wake up sleepy with messy hair*

5. **Tin nhắn nào của bạn đủ sức phá nát buổi làm việc của mình?**  
   *The text from you that would wreck my focus at work…*
   - A. “Vẫn đang nghĩ về tối qua” — *“Still thinking about last night”*
   - B. “Đoán xem mình đang mặc gì” — *“Guess what I’m wearing”*
   - C. “Về sớm nhé. Có chuyện cần bàn.” — *“Come home early. We need to talk.”*

6. **Giữa hai đứa, thật ra ai mới là người chủ động trước?**  
   *Between us, who really makes the first move?*
   - A. Mình chứ ai — *Me, obviously*
   - B. Bạn, nhưng mình sắp đặt để bạn tưởng là ý bạn — *You, but I set it up so it feels like your idea*
   - C. Chẳng ai cả. Cứ thế lao vào nhau — *Neither. We just collide*

### Tương tác (4)

1. **Hôn đếm ngược: ghé sát thật chậm, dừng lại ngay trước khi môi chạm nhau.** Giữ yên năm giây. Ai không nhịn được mà hôn trước là thua, thua xong vẫn được hôn.  
   *Countdown kiss: lean in slowly and stop just before your lips touch. Hold it for five seconds. Whoever closes the gap first loses, and then you kiss anyway.*
2. **Đấu thả thính: mỗi người ba câu, mặt đối mặt.** Câu sến nhất, mượt nhất, liều nhất. Người nghe chấm thắng thua từng hiệp.  
   *Pickup-line duel: three lines each, face to face. Cheesiest, smoothest, boldest. The other person picks the winner of each round.*
3. **Nhảy chậm không nhạc, một người tự ngân nga.** Nhảy tới hết bài. Người ngân được chọn bài, người kia cấm cười.  
   *Slow dance with no music: one of you hums the song. Dance until the song ends. The hummer picks it; the dancer isn’t allowed to laugh.*
4. **Rượt hôn: một người có ba mươi giây để hôn trộm, người kia né nhưng không ra khỏi tầm tay.** Rồi đổi vai. Không chạy đi, không xô kéo, chơi cho vui.  
   *Kiss chase: one of you has thirty seconds to steal a kiss, the other dodges within arm’s reach. Then swap. No running off, no grabbing. Keep it playful.*

### Mong muốn chung (3)

1. Bạn có muốn một buổi tối mà một người theo đuổi, người kia cố tình làm giá?  
   *Would you like an evening where one of us does the chasing and the other plays hard to get?*
2. Bạn có muốn một buổi hẹn chỉ được thả thính, cấm hôn tới phút cuối?  
   *Would you like a flirting-only date where kissing is banned until the very end?*
3. Bạn có muốn một hũ phiếu “đổi một nụ hôn”, dùng lúc nào cũng được, không cần lý do?  
   *Would you like a jar of kiss coupons, redeemable any time, no questions asked?*

### Nhiệm vụ bí mật (4)

1. Khiến người ấy gọi bạn bằng một tên cưng.  
   *Get your partner to call you by a pet name.*
2. Nháy mắt với người ấy và nhận lại một cái nháy mắt.  
   *Wink at your partner and get a wink back.*
3. Hôn trộm lên môi, rồi tỉnh bơ như chưa có gì suốt một vòng.  
   *Steal a kiss on the lips, then act like nothing happened for a full round.*
4. Khiến người ấy vuốt tóc hoặc chạm vào mặt bạn.  
   *Get your partner to play with your hair or touch your face.*

### Thử thách (4)

1. Xin lỗi người ấy bằng màn diễn sến nhất có thể để giành lại sự chú ý.  
   *Win back your partner’s attention with your most dramatic apology.*
2. Người ấy chọn chỗ bạn ngồi trong vòng tới.  
   *Your partner picks where you sit for the next round.*
3. Tả nét quyến rũ nhất của người ấy bằng giọng thuyết minh phim thế giới động vật.  
   *Describe your partner’s best feature like a nature documentary narrator.*
4. Nhắn cho người ấy câu thả thính táo bạo nhất bạn nghĩ ra, ngay bây giờ, trong lúc họ nhìn bạn gõ.  
   *Text your partner the flirtiest line you can think of, right now, while they watch you type.*

---

## Mức 3 · Nóng bỏng (Spicy)

### Đọc vị (6)

1. **Hôn vào đâu thì mình quên luôn đang nói gì?**  
   *Where do you have to kiss me to make me forget what I was saying?*
   - A. Một bên cổ — *The side of my neck*
   - B. Ngay sau tai — *Right behind my ear*
   - C. Cổ tay phía trong — *The inside of my wrist*

2. **Nếu phải trêu mình mà không được dùng tay, mình muốn nhất là…**  
   *If you had to tease me without using your hands, I’d most want…*
   - A. Hơi thở phả nhẹ lên cổ — *Your breath on my neck*
   - B. Những nụ hôn dừng ngay trước môi — *Kisses that stop just short of my lips*
   - C. Giọng bạn kể trước điều sắp tới — *Your voice telling me what comes next*

3. **Nếu mình đang ghen một chút, chiêu nào của bạn khiến mình mềm lòng nhanh nhất?**  
   *If I’m a little jealous, which move of yours softens me fastest?*
   - A. Hôn ngay giữa lúc mình đang dỗi — *Kissing me mid-sulk*
   - B. Nói rõ vì sao chỉ có mình thôi — *Telling me exactly why it’s only me*
   - C. Kéo mình ngồi lên đùi rồi chờ mình nguôi — *Pulling me onto your lap and waiting*

4. **Kiểu “hành hạ” khiến mình chịu không nổi, theo nghĩa tốt nhất…**  
   *The kind of torture I can’t stand, in the best way…*
   - A. Bạn cởi một cúc áo rồi dừng lại — *You undoing one button, then stopping*
   - B. Bàn tay đặt trên đùi mình, không nhúc nhích — *Your hand on my thigh, not moving*
   - C. Bạn nói “để lát nữa” bằng giọng đó — *You saying “later” in that voice*

5. **Nếu tối nay mình ra tay trước, mình sẽ mở màn bằng…**  
   *If I make the first move tonight, I start by…*
   - A. Đè bạn xuống sofa bằng một nụ hôn — *Pinning you to the sofa with a kiss*
   - B. Trèo lên ngồi trong lòng bạn — *Climbing into your lap*
   - C. Túm cổ áo kéo bạn lại — *Pulling you in by the collar*

6. **Đang hôn nhau, điều làm mình tan chảy nhất là…**  
   *Mid-kiss, the thing that makes me melt is…*
   - A. Bạn khẽ gọi tên mình — *You saying my name*
   - B. Bạn mỉm cười ngay giữa nụ hôn — *You smiling into the kiss*
   - C. Bạn lùi lại chỉ để ngắm mình — *You pulling back just to look at me*

### Tương tác (4)

1. **Trao nhau nụ hôn mười giây chậm nhất từ trước tới giờ.** Đếm thầm. Ai vội trước thì đếm lại từ đầu.  
   *Share the slowest ten-second kiss you’ve ever had. Count silently. If either of you speeds up, start the count again.*
2. **Viết một từ bí mật lên lưng nhau bằng đầu ngón tay.** Qua lớp áo hay không là tuỳ cả hai. Mỗi người được đoán ba lần, và từ đó phải khiến người đoán đỏ mặt.  
   *Spell a secret word on each other’s back with one fingertip. Over or under clothing, as you both prefer. Three guesses each, and the word should make the guesser blush.*
3. **Ngồi đối mặt trong lòng nhau suốt vòng tới.** Ngồi yên đó tới hết lá kế tiếp. Ai muốn dừng cũng được.  
   *Sit face to face in one lap for the whole next round. Stay there until the next card is done. Either of you can call it off.*
4. **Hôn một đường thật chậm từ tai xuống xương quai xanh, rồi đổi lượt.** Người được hôn giữ nhịp bằng một từ: “chậm thôi” hoặc “dừng”.  
   *Kiss a slow line from ear to collarbone, then swap. The one being kissed sets the pace with one word: “slower” or “stop”.*

### Mong muốn chung (3)

1. Bạn có muốn một đêm mà một người cầm trịch từ bữa tối tới lúc đi ngủ?  
   *Would you like a night where one of us is in charge from dinner to bedtime?*
2. Bạn có muốn một đêm massage dưới ánh nến, có tinh dầu, không điện thoại?  
   *Would you like a candlelit massage night with oil and no phones?*
3. Bạn có muốn cả buổi tối chỉ trêu nhau, cấm tiến xa hơn trước nửa đêm?  
   *Would you like a whole evening of teasing where nothing goes further until midnight?*

### Nhiệm vụ bí mật (4)

1. Khiến người ấy hôn bạn trước.  
   *Get your partner to kiss you first.*
2. Làm người ấy nổi da gà chỉ bằng một câu thì thầm.  
   *Give your partner goosebumps with nothing but a whisper.*
3. Khiến người ấy nói ra điểm gợi cảm nhất ở bạn.  
   *Get your partner to tell you what they find sexiest about you.*
4. Khiến người ấy cứng họng ít nhất ba giây.  
   *Leave your partner speechless for three full seconds.*

### Thử thách (4)

1. Hôn người ấy ở chỗ họ chỉ, từ vai trở lên.  
   *Kiss your partner wherever they point, from the shoulders up.*
2. Thú nhận lần gần nhất bạn mơ mộng về người ấy, và lúc đó bạn đang ở đâu.  
   *Confess the last time you daydreamed about them, and where you were.*
3. Thì thầm điều bạn sẽ làm nếu đoán trúng lá tiếp theo.  
   *Whisper what you’d do if you guess the next one right.*
4. Chuộc lỗi bằng ba mươi giây hôn lên tay, cổ tay và vai người ấy.  
   *Earn your way back: thirty seconds of kisses on their hand, wrist and shoulder.*

---

## Mức 4 · Táo bạo (Daring)

### Đọc vị (6)

1. **Nếu bạn nắm quyền mười phút, luật đầu tiên mình muốn bạn đặt ra là…**  
   *If you took control for ten minutes, the first rule I’d want you to set…*
   - A. Mình không được chạm vào bạn — *I’m not allowed to touch you*
   - B. Mình phải nhắm mắt suốt — *My eyes stay closed the whole time*
   - C. Muốn hôn phải xin phép từng lần — *I have to ask for every kiss*

2. **Lúc quần áo bắt đầu rơi tối nay, mình muốn…**  
   *When the clothes start coming off tonight, I want it…*
   - A. Chậm tới mức bạn phải sốt ruột — *So slow you get impatient*
   - B. Để đèn sáng, mắt nhìn mắt — *Lights on, eyes on each other*
   - C. Tự tay mình làm, bạn chỉ được đứng yên — *Done by me, while you keep your hands still*

3. **Thú thật đi: điều mình tò mò muốn thử cùng bạn nhất là…**  
   *Be honest: the thing I’m most curious to try with you is…*
   - A. Bị bịt mắt — *Being blindfolded*
   - B. Massage bằng dầu, chẳng phải vội đi đâu — *A massage with oil and nowhere to be*
   - C. Đổi vai người cầm trịch — *Swapping who’s in charge*

4. **Nếu phải “mất kiểm soát” ở đâu đó trong nhà ngay bây giờ, mình chọn…**  
   *If I had to lose control somewhere at home right now, I’d pick…*
   - A. Áp sát vào cửa phòng ngủ — *Up against the bedroom door*
   - B. Trên mặt bếp — *On the kitchen counter*
   - C. Sofa, tắt hết đèn — *The sofa, lights off*

5. **Lời thú nhận nào khiến mình gục nhanh nhất?**  
   *The confession that would undo me fastest…*
   - A. Điều bạn đã nghĩ về mình hôm nay — *What you thought about me today*
   - B. Điều bạn muốn thử mà chưa từng nói — *Something you want to try but never said*
   - C. Đúng khoảnh khắc tối nay bạn bắt đầu muốn mình — *The exact moment tonight you started wanting me*

6. **Nếu mình cầm trịch, mình sẽ bắt bạn…**  
   *If I’m in charge, I’d make you…*
   - A. Chắp tay sau lưng mà chờ — *Wait with your hands behind your back*
   - B. Chỉ được hôn chỗ mình chỉ — *Kiss only where I point*
   - C. Nói rõ điều bạn muốn rồi mới được nhận — *Tell me what you want, in detail, before you get it*

### Tương tác (4)

1. **Cởi cho nhau một món đồ, thật chậm, không được rời mắt.** Mỗi người tự chọn món đồ của mình. Lỡ rời mắt thì làm lại món đó.  
   *Take off one item of clothing from each other, slowly, without breaking eye contact. Each of you chooses which of your own items comes off. Look away and you start that one again.*
2. **Trò tượng đá: một người đứng yên một phút, người kia trêu bằng những nụ hôn từ eo trở lên.** “Tượng” nói trước chỗ nào không được chạm. Ai nhúc nhích thì đổi vai.  
   *Statue game: one of you stays perfectly still for a minute while the other teases with kisses above the waist. The statue names any no-go zones first. Move, and you swap roles.*
3. **Thử thách cám dỗ: ba mươi giây để khiến người kia phải với tay về phía bạn trước, cấm cù.** Người bị thử giữ tay xuôi hai bên. Lời nói, ánh nhìn, cái chạm qua lớp áo: chiêu gì cũng được. Rồi đổi lượt. Ai trụ lâu hơn được chọn một nụ hôn.  
   *Temptation test: thirty seconds to make the other one reach for you first. No tickling. The one being tempted keeps their hands at their sides. Words, a look, a touch over clothing: all fair. Then swap. Whoever lasts longer chooses one kiss.*
4. **Massage “lạc đường”: hai phút, tay đi tới đâu do người được massage dẫn.** Người được massage đặt giới hạn trước và tự cầm tay dẫn đường. Nói dừng là dừng.  
   *Wandering massage: two minutes, and the receiver guides where the hands go. The receiver sets limits first and steers by moving the giver’s hand. Stop means stop.*

### Mong muốn chung (3)

1. Bạn có muốn có dịp cùng nhau thử bịt mắt?  
   *Would you like to try a blindfold together sometime?*
2. Bạn có muốn một đêm khách sạn chỉ cho hai đứa, treo biển “Xin đừng làm phiền”?  
   *Would you like a hotel night just for us, with the do-not-disturb sign on the door?*
3. Bạn có muốn mỗi người viết ra một tưởng tượng rồi đổi cho nhau đọc, chỉ để biết thôi?  
   *Would you like to each write down one fantasy and swap them, just to read?*

### Nhiệm vụ bí mật (4)

1. Khiến người ấy cắn môi.  
   *Make your partner bite their lip.*
2. Được hôn lên cổ mà không cần đòi.  
   *Get a kiss on your neck without asking for one.*
3. Làm người ấy xao nhãng tới mức quên mất đang tới lượt ai.  
   *Distract your partner so well they forget whose turn it is.*
4. Mở màn nụ hôn kế tiếp khi người ấy còn chưa kịp phản ứng.  
   *Start the next kiss before your partner sees it coming.*

### Thử thách (4)

1. Cởi một phụ kiện hoặc một món đồ, tuỳ bạn chọn.  
   *Take off one accessory or item of clothing, your choice.*
2. Người ấy ra cho bạn một mệnh lệnh tinh nghịch trong vòng tới. Bạn được từ chối một lần.  
   *Your partner gives you one playful order for the next round. You can veto it once.*
3. Thú nhận ý nghĩ khiến bạn mất tập trung nhất về người ấy tối nay.  
   *Confess your most distracting thought about your partner tonight.*
4. Chắp tay sau lưng: hôn người ấy ba mươi giây mà không dùng tay.  
   *Hands behind your back: give your partner a thirty-second kiss without using them.*

---

## Mức 5 · Cuồng nhiệt (Wild)

### Đọc vị (6)

1. **Một đêm không giới hạn nào ngoài giới hạn của hai đứa: tưởng tượng nào mình sẽ thật sự gật đầu?**  
   *A night with no limits but ours: which fantasy would I actually say yes to?*
   - A. Hai người lạ gặp nhau ở quầy bar khách sạn — *Strangers meeting at a hotel bar*
   - B. Cả đêm để bạn cầm trịch — *A whole night with you in charge*
   - C. Không luật, không kế hoạch, chỉ theo bản năng — *No rules, no plan, pure instinct*

2. **Bị bịt mắt, điều đầu tiên mình muốn cảm nhận là…**  
   *Blindfolded, the first thing I’d want to feel is…*
   - A. Môi bạn, ở chỗ không ngờ tới — *Your lips somewhere unexpected*
   - B. Một thứ mát lạnh, rồi một thứ ấm nóng — *Something cool, then something warm*
   - C. Chẳng gì cả. Chỉ được chờ đợi — *Nothing at all. Just the waiting*

3. **Nếu thả hết, kiểu nói chuyện “bậy” của mình sẽ là…**  
   *If I let it all out, my dirty-talk style would be…*
   - A. Ngọt ngào mà trêu ngươi — *Sweet, but teasing*
   - B. Ra lệnh thẳng thừng — *Bossy and direct*
   - C. Rất ít lời, nhưng luôn đúng lúc — *Barely a word, but always at the right moment*

4. **Trên giường, phía nào của mình bạn chưa thấy hết?**  
   *In bed, the side of me you haven’t fully seen yet is…*
   - A. Thích ra lệnh hơn bạn tưởng — *Bossier than you think*
   - B. Kiên nhẫn trêu ngươi hơn bạn tưởng — *More patient at teasing than you think*
   - C. Ồn ào hơn bạn tưởng nhiều — *A lot louder than you think*

5. **Nếu đêm nay là một cuộc rượt đuổi thật dài, mình muốn là…**  
   *If tonight were one long chase, I’d want to be…*
   - A. Người đi săn, suốt cả đêm — *The one chasing, all night*
   - B. Người bị đuổi, và để bị bắt — *The one being chased, and caught*
   - C. Cả hai, đổi vai không báo trước — *Both, switching without warning*

6. **Nếu thử trói nhẹ (hẹn trước một từ để dừng ngay), mình muốn ở vai nào?**  
   *If we tried light restraints, with a stop word agreed first, which role would I pick?*
   - A. Mình giữ cổ tay bạn — *I hold your wrists*
   - B. Bạn giữ cổ tay mình — *You hold mine*
   - C. Nói chuyện kỹ với nhau trước đã — *Let’s talk it through first*

### Tương tác (4)

1. **Trao quyền cho người ấy hai phút, mỗi lần một mệnh lệnh.** Thống nhất từ dừng trước. Mỗi lần chỉ một yêu cầu, và yêu cầu nào cũng có thể từ chối.  
   *Hand your partner control for two minutes: one instruction at a time. Agree on a stop word first. One instruction at a time, and any of them can be turned down.*
2. **Vòng bịt mắt: một người nhắm mắt, người kia dẫn dắt ba nụ hôn thật chậm.** Thống nhất trước những chỗ được hôn. Dùng khăn hay chỉ nhắm mắt đều được. Muốn thì đổi vai.  
   *Blindfold round: one of you closes their eyes while the other leads three slow kisses. Agree on where first. Use a scarf or just closed eyes. Swap if you both want.*
3. **Thì thầm mong muốn táo bạo nhất cho đêm nay, rồi nghe của người kia.** Cả hai, sát tai nhau. Câu trả lời có thể là có, để sau hoặc không, chẳng cần giải thích.  
   *Whisper your boldest wish for tonight, then hear theirs. Mouth to ear, both of you. The answer can be yes, later, or no, with no explanation needed.*
4. **Một phút liều lĩnh: hôn nhau như sắp có người bật đèn.** Trọn một phút, ngay tại chỗ. Ai cũng có thể tạm dừng bằng một cái vỗ vai.  
   *One reckless minute: make out like the lights are about to come on. One full minute, right where you are. Either of you can pause it with a tap on the shoulder.*

### Mong muốn chung (3)

1. Bạn có muốn thử trói nhẹ, với từ dừng do cả hai cùng chọn?  
   *Would you like to try light restraints, with a stop word we choose together?*
2. Bạn có muốn một đêm nhập vai hai người lạ không rời tay nhau nổi?  
   *Would you like a night of role-play as two strangers who can’t keep their hands off each other?*
3. Bạn có muốn một đêm mà ai nói “đổi” thì người kia lên dẫn dắt?  
   *Would you like a night where whoever says “switch” hands the lead to the other?*

### Nhiệm vụ bí mật (4)

1. Khiến người ấy nói ra một điều muốn làm lát nữa đêm nay.  
   *Get your partner to tell you one thing they want later tonight.*
2. Làm người ấy mất mạch ngay giữa câu đang nói.  
   *Make your partner lose their train of thought mid-sentence.*
3. Khiến người ấy kéo bạn ngồi vào lòng.  
   *Get your partner to pull you onto their lap.*
4. Khiến người ấy thừa nhận đang nóng lòng muốn ván này kết thúc.  
   *Get your partner to admit they can’t wait for this game to end.*

### Thử thách (4)

1. Bịt mắt, hoặc nhắm mắt, suốt vòng tới.  
   *Wear a blindfold, or keep your eyes closed, for the next round.*
2. Thì thầm điều táo bạo nhất bạn muốn thử cùng người ấy. Không cần giải thích.  
   *Whisper the boldest thing you want to try with them. No explanations.*
3. Đưa ra hai món đồ trên người; người ấy chọn món nào được cởi.  
   *Offer two items of clothing; your partner picks which one comes off.*
4. Cấm động tay: người ấy trêu bạn ba mươi giây, bạn không được chạm lại.  
   *Hands off: your partner teases you for thirty seconds, and you can’t touch back.*

---

## Bẻ lái · mọi mức (4)

Mỗi ván có 2 lá Bẻ lái, và hai lá này luôn có hiệu ứng khác nhau. Sau mỗi lá Bẻ lái luôn có ít nhất một lá Đọc vị để hiệu ứng có chỗ áp dụng.

| Mã | Hiệu ứng | Tiếng Việt | English |
|---|---|---|---|
| twist-01 | `ROLE_REVERSAL` | Giấu vuốt đủ rồi! | Claws Out! |
| twist-02 | `DOUBLE_SPARK` | Rắc rối nhân đôi! | Double Trouble! |
| twist-04 | `ROLE_REVERSAL` | Chuột cũng biết cắn! | The Mouse Bites Back! |
| twist-05 | `DOUBLE_SPARK` | Tò mò có thưởng! | Curiosity Pays! |
