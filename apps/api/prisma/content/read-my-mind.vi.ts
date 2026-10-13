// Vietnamese copy for the Read My Mind deck. Every list mirrors seed.ts position for position, so a card keeps its stable id
// and every answer keeps its index in both languages. Voice: gender-neutral “mình” (the card owner) and “bạn” / “người ấy”,
// Card content stays natural; Naughty Cats wordplay lives only in the Plot Twist headlines and the UI event copy.
export type Heat=1|2|3|4|5;

export const games:Record<string,{tagline:string;description:string;duration:string}>={
 'read-my-mind':{tagline:'Đoán thử xem mình muốn gì?',description:'Giấu một đáp án, đọc vị người ấy, và nhận Spark cho mỗi lần đoán trúng.',duration:'30–45 phút'},
 'dare-me':{tagline:'Bạn dám liều đến đâu?',description:'Thử thách tinh nghịch và những lần thách ngược ngày càng gắt.',duration:'20–40 phút'},
 'no-secrets':{tagline:'Có gì bạn chưa kể với mình?',description:'Lựa chọn riêng tư trở thành những khám phá chung.',duration:'40–60 phút'},
 'take-control':{tagline:'Đến lượt bạn. Luật của bạn.',description:'Đổi vai dẫn dắt và cùng nhau định nhịp.',duration:'45–60 phút'},
 'lucky-tonight':{tagline:'Để may rủi quyết định.',description:'Gợi ý bất ngờ, phần thưởng và những lá bài khó lường.',duration:'15–30 phút'},
};

export const mindReader:Record<Heat,Array<[string,string[]]>>={
 1:[
  ['Nếu bắt gặp bạn đang nhìn mình không rời mắt, mình sẽ muốn bạn làm gì tiếp?',['Quay đi, giả vờ như chưa có gì','Nhìn lại thật lâu tới khi mình bật cười','Bước tới hôn mình, không nói một lời']],
  ['Mình đang dán mắt vào điện thoại. Chiêu giành sự chú ý “lầy” nhất là…',['Lén luồn tay vào tay mình','Hôn lên vai tới khi mình chịu ngẩng lên','Giật điện thoại rồi bắt mình đuổi theo']],
  ['Muốn cố tình làm mình đỏ mặt, chiêu nào ăn chắc nhất?',['Một lời khen chẳng vì lý do gì','Đọc to tin nhắn sến nhất mình từng gửi','Cười với mình như đang giữ một bí mật']],
  ['Cử chỉ mình thầm mong bạn chủ động nhiều hơn…',['Nắm tay kéo mình lại gần','Hôn trộm sau gáy','Ôm mình từ phía sau']],
  ['Hai đứa đang đánh gối. Thật ra mình tính…',['Thắng cho bằng được','Cố tình thua để ngã vào lòng bạn','Xin đình chiến rồi hôn trộm một cái']],
  ['Cái tên mình muốn nghe bạn gọi nhất, thì thầm sát bên tai…',['Một tên cưng ngọt lịm','Biệt danh lém lỉnh chỉ hai đứa hiểu','Tên thật của mình, gọi thật chậm']],
 ],
 2:[
  ['Chiêu thả thính nào của bạn khiến mình chịu thua nhanh nhất?',['Nhìn thẳng vào mắt rồi cười đầy ẩn ý','Ghé sát tai nói một câu thật táo bạo','Hôn nhẹ rồi quay đi như chưa có chuyện gì']],
  ['Giữa chỗ đông người, tín hiệu nào khiến mình phải tìm tới bạn ngay?',['Một cái nháy mắt thật chậm','Tin nhắn chỉ có đúng một chữ: “ngay”','Nhìn mình rồi khẽ cắn môi']],
  ['Môi kề môi mà chưa chạm. Mình nhịn được bao lâu?',['Ba giây là cùng','Tới khi bạn chịu thua trước','Không bao giờ. Mình bắt bạn phải tự tới']],
  ['Khoảnh khắc nào của bạn khiến mình không cưỡng lại nổi?',['Khi bạn cười ngặt nghẽo','Khi bạn say sưa với điều mình đam mê','Khi bạn vừa ngủ dậy, tóc rối bù']],
  ['Tin nhắn nào của bạn đủ sức phá nát buổi làm việc của mình?',['“Vẫn đang nghĩ về tối qua”','“Đoán xem mình đang mặc gì”','“Về sớm nhé. Có chuyện cần bàn.”']],
  ['Giữa hai đứa, thật ra ai mới là người chủ động trước?',['Mình chứ ai','Bạn, nhưng mình sắp đặt để bạn tưởng là ý bạn','Chẳng ai cả. Cứ thế lao vào nhau']],
 ],
 3:[
  ['Hôn vào đâu thì mình quên luôn đang nói gì?',['Một bên cổ','Ngay sau tai','Cổ tay phía trong']],
  ['Nếu phải trêu mình mà không được dùng tay, mình muốn nhất là…',['Hơi thở phả nhẹ lên cổ','Những nụ hôn dừng ngay trước môi','Giọng bạn kể trước điều sắp tới']],
  ['Nếu mình đang ghen một chút, chiêu nào của bạn khiến mình mềm lòng nhanh nhất?',['Hôn ngay giữa lúc mình đang dỗi','Nói rõ vì sao chỉ có mình thôi','Kéo mình ngồi lên đùi rồi chờ mình nguôi']],
  ['Kiểu “hành hạ” khiến mình chịu không nổi, theo nghĩa tốt nhất…',['Bạn cởi một cúc áo rồi dừng lại','Bàn tay đặt trên đùi mình, không nhúc nhích','Bạn nói “để lát nữa” bằng giọng đó']],
  ['Nếu tối nay mình ra tay trước, mình sẽ mở màn bằng…',['Đè bạn xuống sofa bằng một nụ hôn','Trèo lên ngồi trong lòng bạn','Túm cổ áo kéo bạn lại']],
  ['Đang hôn nhau, điều làm mình tan chảy nhất là…',['Bạn khẽ gọi tên mình','Bạn mỉm cười ngay giữa nụ hôn','Bạn lùi lại chỉ để ngắm mình']],
 ],
 4:[
  ['Nếu bạn nắm quyền mười phút, luật đầu tiên mình muốn bạn đặt ra là…',['Mình không được chạm vào bạn','Mình phải nhắm mắt suốt','Muốn hôn phải xin phép từng lần']],
  ['Lúc quần áo bắt đầu rơi tối nay, mình muốn…',['Chậm tới mức bạn phải sốt ruột','Để đèn sáng, mắt nhìn mắt','Tự tay mình làm, bạn chỉ được đứng yên']],
  ['Thú thật đi: điều mình tò mò muốn thử cùng bạn nhất là…',['Bị bịt mắt','Massage bằng dầu, chẳng phải vội đi đâu','Đổi vai người cầm trịch']],
  ['Nếu phải “mất kiểm soát” ở đâu đó trong nhà ngay bây giờ, mình chọn…',['Áp sát vào cửa phòng ngủ','Trên mặt bếp','Sofa, tắt hết đèn']],
  ['Lời thú nhận nào khiến mình gục nhanh nhất?',['Điều bạn đã nghĩ về mình hôm nay','Điều bạn muốn thử mà chưa từng nói','Đúng khoảnh khắc tối nay bạn bắt đầu muốn mình']],
  ['Nếu mình cầm trịch, mình sẽ bắt bạn…',['Chắp tay sau lưng mà chờ','Chỉ được hôn chỗ mình chỉ','Nói rõ điều bạn muốn rồi mới được nhận']],
 ],
 5:[
  ['Một đêm không giới hạn nào ngoài giới hạn của hai đứa: tưởng tượng nào mình sẽ thật sự gật đầu?',['Hai người lạ gặp nhau ở quầy bar khách sạn','Cả đêm để bạn cầm trịch','Không luật, không kế hoạch, chỉ theo bản năng']],
  ['Bị bịt mắt, điều đầu tiên mình muốn cảm nhận là…',['Môi bạn, ở chỗ không ngờ tới','Một thứ mát lạnh, rồi một thứ ấm nóng','Chẳng gì cả. Chỉ được chờ đợi']],
  ['Nếu thả hết, kiểu nói chuyện “bậy” của mình sẽ là…',['Ngọt ngào mà trêu ngươi','Ra lệnh thẳng thừng','Rất ít lời, nhưng luôn đúng lúc']],
  ['Trên giường, phía nào của mình bạn chưa thấy hết?',['Thích ra lệnh hơn bạn tưởng','Kiên nhẫn trêu ngươi hơn bạn tưởng','Ồn ào hơn bạn tưởng nhiều']],
  ['Nếu đêm nay là một cuộc rượt đuổi thật dài, mình muốn là…',['Người đi săn, suốt cả đêm','Người bị đuổi, và để bị bắt','Cả hai, đổi vai không báo trước']],
  ['Nếu thử trói nhẹ (hẹn trước một từ để dừng ngay), mình muốn ở vai nào?',['Mình giữ cổ tay bạn','Bạn giữ cổ tay mình','Nói chuyện kỹ với nhau trước đã']],
 ],
};

export const chemistry:Record<Heat,Array<[string,string]>>={
 1:[
  ['Đuổi bắt hôn trộm: hôn má nhau, nhưng phải né được của đối phương.','Ba mươi giây, cả hai cùng lúc. Ai hôn trúng nhiều hơn thì thắng.'],
  ['Đấu mắt, được phép thả thính.','Nhìn thẳng vào mắt nhau. Nhăn mặt hay nói lời ngọt để phá đều được. Ai cười hoặc quay đi trước phải hôn tay người thắng.'],
  ['Tái hiện nụ hôn đầu, nhưng phải hay hơn.','Vẫn hồi hộp như lần đó, chỉ một lần duy nhất. Xong cả hai cùng chấm xem có hơn bản gốc không.'],
  ['Gãi lưng cho nhau tới khi người kia phải khẽ thở dài: mỗi người ba mươi giây.','Người được gãi chỉ chỗ và chọn lực tay. Xong thì đổi lượt.'],
 ],
 2:[
  ['Hôn đếm ngược: ghé sát thật chậm, dừng lại ngay trước khi môi chạm nhau.','Giữ yên năm giây. Ai không nhịn được mà hôn trước là thua, thua xong vẫn được hôn.'],
  ['Đấu thả thính: mỗi người ba câu, mặt đối mặt.','Câu sến nhất, mượt nhất, liều nhất. Người nghe chấm thắng thua từng hiệp.'],
  ['Nhảy chậm không nhạc, một người tự ngân nga.','Nhảy tới hết bài. Người ngân được chọn bài, người kia cấm cười.'],
  ['Rượt hôn: một người có ba mươi giây để hôn trộm, người kia né nhưng không ra khỏi tầm tay.','Rồi đổi vai. Không chạy đi, không xô kéo, chơi cho vui.'],
 ],
 3:[
  ['Trao nhau nụ hôn mười giây chậm nhất từ trước tới giờ.','Đếm thầm. Ai vội trước thì đếm lại từ đầu.'],
  ['Viết một từ bí mật lên lưng nhau bằng đầu ngón tay.','Qua lớp áo hay không là tuỳ cả hai. Mỗi người được đoán ba lần, và từ đó phải khiến người đoán đỏ mặt.'],
  ['Ngồi đối mặt trong lòng nhau suốt vòng tới.','Ngồi yên đó tới hết lá kế tiếp. Ai muốn dừng cũng được.'],
  ['Hôn một đường thật chậm từ tai xuống xương quai xanh, rồi đổi lượt.','Người được hôn giữ nhịp bằng một từ: “chậm thôi” hoặc “dừng”.'],
 ],
 4:[
  ['Cởi cho nhau một món đồ, thật chậm, không được rời mắt.','Mỗi người tự chọn món đồ của mình. Lỡ rời mắt thì làm lại món đó.'],
  ['Trò tượng đá: một người đứng yên một phút, người kia trêu bằng những nụ hôn từ eo trở lên.','“Tượng” nói trước chỗ nào không được chạm. Ai nhúc nhích thì đổi vai.'],
  ['Thử thách cám dỗ: ba mươi giây để khiến người kia phải với tay về phía bạn trước, cấm cù.','Người bị thử giữ tay xuôi hai bên. Lời nói, ánh nhìn, cái chạm qua lớp áo: chiêu gì cũng được. Rồi đổi lượt. Ai trụ lâu hơn được chọn một nụ hôn.'],
  ['Massage “lạc đường”: hai phút, tay đi tới đâu do người được massage dẫn.','Người được massage đặt giới hạn trước và tự cầm tay dẫn đường. Nói dừng là dừng.'],
 ],
 5:[
  ['Trao quyền cho người ấy hai phút, mỗi lần một mệnh lệnh.','Thống nhất từ dừng trước. Mỗi lần chỉ một yêu cầu, và yêu cầu nào cũng có thể từ chối.'],
  ['Vòng bịt mắt: một người nhắm mắt, người kia dẫn dắt ba nụ hôn thật chậm.','Thống nhất trước những chỗ được hôn. Dùng khăn hay chỉ nhắm mắt đều được. Muốn thì đổi vai.'],
  ['Thì thầm mong muốn táo bạo nhất cho đêm nay, rồi nghe của người kia.','Cả hai, sát tai nhau. Câu trả lời có thể là có, để sau hoặc không, chẳng cần giải thích.'],
  ['Một phút liều lĩnh: hôn nhau như sắp có người bật đèn.','Trọn một phút, ngay tại chỗ. Ai cũng có thể tạm dừng bằng một cái vỗ vai.'],
 ],
};

export const desires:Record<Heat,string[]>={
 1:['Bạn có muốn đặt “thuế hôn”: ai về nhà trước phải nộp một nụ hôn?','Bạn có muốn hai đứa có một ám hiệu riêng nghĩa là “lại đây hôn mình”?','Bạn có muốn một ngày Chủ nhật lười, tới trưa mới thèm mặc đồ?'],
 2:['Bạn có muốn một buổi tối mà một người theo đuổi, người kia cố tình làm giá?','Bạn có muốn một buổi hẹn chỉ được thả thính, cấm hôn tới phút cuối?','Bạn có muốn một hũ phiếu “đổi một nụ hôn”, dùng lúc nào cũng được, không cần lý do?'],
 3:['Bạn có muốn một đêm mà một người cầm trịch từ bữa tối tới lúc đi ngủ?','Bạn có muốn một đêm massage dưới ánh nến, có tinh dầu, không điện thoại?','Bạn có muốn cả buổi tối chỉ trêu nhau, cấm tiến xa hơn trước nửa đêm?'],
 4:['Bạn có muốn có dịp cùng nhau thử bịt mắt?','Bạn có muốn một đêm khách sạn chỉ cho hai đứa, treo biển “Xin đừng làm phiền”?','Bạn có muốn mỗi người viết ra một tưởng tượng rồi đổi cho nhau đọc, chỉ để biết thôi?'],
 5:['Bạn có muốn thử trói nhẹ, với từ dừng do cả hai cùng chọn?','Bạn có muốn một đêm nhập vai hai người lạ không rời tay nhau nổi?','Bạn có muốn một đêm mà ai nói “đổi” thì người kia lên dẫn dắt?'],
};

export const missions:Record<Heat,string[]>={
 1:['Được người ấy khen một câu mà không cần “câu”.','Hôn lén người ấy ba lần (má, tay hoặc vai) trước khi hết ván.','Làm người ấy đỏ mặt bằng một lời khen cụ thể tới mức không chối được.','Khiến người ấy nắm tay bạn trọn một vòng.'],
 2:['Khiến người ấy gọi bạn bằng một tên cưng.','Nháy mắt với người ấy và nhận lại một cái nháy mắt.','Hôn trộm lên môi, rồi tỉnh bơ như chưa có gì suốt một vòng.','Khiến người ấy vuốt tóc hoặc chạm vào mặt bạn.'],
 3:['Khiến người ấy hôn bạn trước.','Làm người ấy nổi da gà chỉ bằng một câu thì thầm.','Khiến người ấy nói ra điểm gợi cảm nhất ở bạn.','Khiến người ấy cứng họng ít nhất ba giây.'],
 4:['Khiến người ấy cắn môi.','Được hôn lên cổ mà không cần đòi.','Làm người ấy xao nhãng tới mức quên mất đang tới lượt ai.','Mở màn nụ hôn kế tiếp khi người ấy còn chưa kịp phản ứng.'],
 5:['Khiến người ấy nói ra một điều muốn làm lát nữa đêm nay.','Làm người ấy mất mạch ngay giữa câu đang nói.','Khiến người ấy kéo bạn ngồi vào lòng.','Khiến người ấy thừa nhận đang nóng lòng muốn ván này kết thúc.'],
};

export const forfeits:Record<Heat,string[]>={
 1:['Nhại lại kiểu người ấy thả thính, càng giống càng tốt.','Hát tặng người ấy một câu tình ca, mắt không rời.','Người ấy đặt cho bạn một biệt danh ngớ ngẩn, gọi là phải dạ tới hết ván.','Thú nhận khoảnh khắc đầu tiên bạn nghĩ “toang rồi, mình thích người này”.'],
 2:['Xin lỗi người ấy bằng màn diễn sến nhất có thể để giành lại sự chú ý.','Người ấy chọn chỗ bạn ngồi trong vòng tới.','Tả nét quyến rũ nhất của người ấy bằng giọng thuyết minh phim thế giới động vật.','Nhắn cho người ấy câu thả thính táo bạo nhất bạn nghĩ ra, ngay bây giờ, trong lúc họ nhìn bạn gõ.'],
 3:['Hôn người ấy ở chỗ họ chỉ, từ vai trở lên.','Thú nhận lần gần nhất bạn mơ mộng về người ấy, và lúc đó bạn đang ở đâu.','Thì thầm điều bạn sẽ làm nếu đoán trúng lá tiếp theo.','Chuộc lỗi bằng ba mươi giây hôn lên tay, cổ tay và vai người ấy.'],
 4:['Cởi một phụ kiện hoặc một món đồ, tuỳ bạn chọn.','Người ấy ra cho bạn một mệnh lệnh tinh nghịch trong vòng tới. Bạn được từ chối một lần.','Thú nhận ý nghĩ khiến bạn mất tập trung nhất về người ấy tối nay.','Chắp tay sau lưng: hôn người ấy ba mươi giây mà không dùng tay.'],
 5:['Bịt mắt, hoặc nhắm mắt, suốt vòng tới.','Thì thầm điều táo bạo nhất bạn muốn thử cùng người ấy. Không cần giải thích.','Đưa ra hai món đồ trên người; người ấy chọn món nào được cởi.','Cấm động tay: người ấy trêu bạn ba mươi giây, bạn không được chạm lại.'],
};

export const twists:Record<string,string>={
 'twist-01':'Giấu vuốt đủ rồi!',
 'twist-02':'Rắc rối nhân đôi!',
 'twist-04':'Chuột cũng biết cắn!',
 'twist-05':'Tò mò có thưởng!',
};
