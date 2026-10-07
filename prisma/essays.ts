export type EssaySeed = {
  slug: string;
  title: string;
  prompt: string;
  topic: string;
  difficulty: string;
  position: number;
  sentences: {
    order: number;
    vietnameseHint: string;
    referenceEnglish: string;
    keywords: string[];
    structureTip: string;
  }[];
};

export const essays: EssaySeed[] = [
  {
    slug: "university-fees",
    title: "Học phí đại học",
    topic: "Giáo dục",
    difficulty: "Trung bình",
    position: 1,
    prompt:
      "Some people believe university education should be free for everyone. Others think students should pay for their own studies. Discuss both views and give your own opinion.",
    sentences: [
      {
        order: 1,
        vietnameseHint:
          "Mọi người có quan điểm trái chiều về việc đại học nên miễn phí hay sinh viên phải tự trả học phí, và bài viết này sẽ xem xét cả hai phía.",
        referenceEnglish:
          "People hold contrasting views on whether university education should be free or paid for by students, and this essay will examine both sides.",
        keywords: ["contrasting views", "university education", "both sides"],
        structureTip:
          "Câu mở bài: nêu hai phe, rồi báo hiệu bài sẽ bàn cả hai. Đừng đưa ý kiến cá nhân ở câu này.",
      },
      {
        order: 2,
        vietnameseHint:
          "Một mặt, học phí miễn phí sẽ cho sinh viên nhà nghèo cơ hội công bằng để vào đại học và giảm bất bình đẳng.",
        referenceEnglish:
          "On the one hand, free tuition would give students from low-income families a fair chance to enter university and reduce inequality.",
        keywords: ["On the one hand", "low-income", "inequality"],
        structureTip:
          "Bắt đầu bằng On the one hand. Chủ ngữ là free tuition, rồi nêu hai kết quả: cơ hội và giảm bất bình đẳng.",
      },
      {
        order: 3,
        vietnameseHint:
          "Ví dụ, nhiều học sinh giỏi bỏ đại học vì nợ học phí, nên năng lực của họ bị lãng phí.",
        referenceEnglish:
          "For instance, talented school leavers often abandon higher education because of student debt, so their potential is wasted.",
        keywords: ["For instance", "student debt", "potential"],
        structureTip:
          "Câu ví dụ: For instance + ai + việc họ làm + because of + hệ quả.",
      },
      {
        order: 4,
        vietnameseHint:
          "Mặt khác, nếu mọi khóa học đều miễn phí thì ngân sách nhà nước sẽ bị ép nặng và chất lượng giảng dạy có thể giảm.",
        referenceEnglish:
          "On the other hand, making every course free would put heavy pressure on the state budget and could reduce teaching quality.",
        keywords: ["On the other hand", "state budget", "teaching quality"],
        structureTip:
          "Đổi phe bằng On the other hand. Nêu gánh nặng ngân sách và rủi ro chất lượng.",
      },
      {
        order: 5,
        vietnameseHint:
          "Tôi cho rằng học phí vừa phải, kèm học bổng cho sinh viên khó khăn, là cách làm thực tế hơn.",
        referenceEnglish:
          "I believe a moderate tuition fee, together with scholarships for disadvantaged students, is a more realistic approach.",
        keywords: ["I believe", "moderate tuition", "scholarships"],
        structureTip:
          "Đây là câu nêu ý kiến. Dùng I believe, rồi nêu giải pháp cân bằng, không chỉ chọn một phe.",
      },
      {
        order: 6,
        vietnameseHint:
          "Kết luận, đại học miễn phí giúp công bằng hơn, nhưng học phí vừa sức cộng hỗ trợ tài chính sẽ hiệu quả hơn trong thực tế.",
        referenceEnglish:
          "In conclusion, free university education supports fairness, but affordable fees plus financial aid would work better in practice.",
        keywords: ["In conclusion", "financial aid", "in practice"],
        structureTip:
          "Kết bài một câu: In conclusion + nhượng bộ phe miễn phí + but + giải pháp bạn chọn.",
      },
    ],
  },
  {
    slug: "plastic-waste",
    title: "Rác thải nhựa",
    topic: "Môi trường",
    difficulty: "Cơ bản",
    position: 2,
    prompt:
      "Plastic waste is becoming a serious problem in many countries. What are the causes of this problem, and what measures can be taken to tackle it?",
    sentences: [
      {
        order: 1,
        vietnameseHint:
          "Rác thải nhựa đã trở thành vấn đề cấp bách, và bài viết này sẽ nêu nguyên nhân cùng một số biện pháp xử lý.",
        referenceEnglish:
          "Plastic waste has become an urgent problem, and this essay will outline its main causes and some practical measures.",
        keywords: ["urgent problem", "main causes", "practical measures"],
        structureTip:
          "Mở bài dạng nguyên nhân – giải pháp: nêu vấn đề, rồi hứa sẽ nói causes và measures.",
      },
      {
        order: 2,
        vietnameseHint:
          "Một nguyên nhân lớn là đồ nhựa dùng một lần rất rẻ và tiện, nên người tiêu dùng ít khi từ chối.",
        referenceEnglish:
          "A major cause is that single-use plastic is cheap and convenient, so consumers rarely refuse it.",
        keywords: ["major cause", "single-use plastic", "convenient"],
        structureTip:
          "Câu nguyên nhân: A major cause is that + tính chất + so + hệ quả.",
      },
      {
        order: 3,
        vietnameseHint:
          "Thêm vào đó, nhiều thành phố chưa có hệ thống tái chế đủ mạnh để xử lý lượng nhựa thải ra mỗi ngày.",
        referenceEnglish:
          "In addition, many cities lack a strong recycling system to handle the amount of plastic thrown away each day.",
        keywords: ["In addition", "recycling system", "each day"],
        structureTip:
          "Thêm nguyên nhân thứ hai bằng In addition. Nhấn vào hạ tầng, không lặp lại ý giá rẻ.",
      },
      {
        order: 4,
        vietnameseHint:
          "Chính phủ có thể đánh thuế đồ nhựa dùng một lần và dùng khoản tiền đó để xây dựng nhà máy tái chế.",
        referenceEnglish:
          "Governments could tax single-use plastic and use the money to build recycling plants.",
        keywords: ["Governments could", "tax", "recycling plants"],
        structureTip:
          "Câu giải pháp: chủ ngữ Governments + could + hai hành động nối bằng and.",
      },
      {
        order: 5,
        vietnameseHint:
          "Người dân cũng nên mang túi vải và hộp đựng riêng khi đi mua sắm, thay vì nhận túi nilon.",
        referenceEnglish:
          "Individuals should also bring cloth bags and their own containers when shopping, instead of accepting plastic bags.",
        keywords: ["Individuals should", "cloth bags", "instead of"],
        structureTip:
          "Đổi từ chính phủ sang cá nhân. Dùng instead of để đối lập thói quen cũ.",
      },
      {
        order: 6,
        vietnameseHint:
          "Tóm lại, rác nhựa vừa do thói quen tiện lợi vừa do hạ tầng yếu, nên cần cả chính sách lẫn thay đổi cá nhân.",
        referenceEnglish:
          "In summary, plastic waste comes from convenient habits and weak infrastructure, so both policy and personal change are needed.",
        keywords: ["In summary", "weak infrastructure", "personal change"],
        structureTip:
          "Kết một câu: nhắc lại hai nguyên nhân, rồi so + cả hai hướng giải quyết.",
      },
    ],
  },
  {
    slug: "social-media-youth",
    title: "Mạng xã hội và giới trẻ",
    topic: "Công nghệ",
    difficulty: "Nâng cao",
    position: 3,
    prompt:
      "Social media has a negative impact on young people. To what extent do you agree or disagree?",
    sentences: [
      {
        order: 1,
        vietnameseHint:
          "Tôi đồng ý một phần rằng mạng xã hội hại người trẻ, vì tác hại là có thật nhưng không phải ảnh hưởng duy nhất.",
        referenceEnglish:
          "I partly agree that social media harms young people, because the risks are real but they are not its only effect.",
        keywords: ["partly agree", "social media", "not its only effect"],
        structureTip:
          "Mở bài nêu mức độ đồng ý ngay. partly agree báo hiệu bài sẽ có cả tác hại lẫn mặt còn lại.",
      },
      {
        order: 2,
        vietnameseHint:
          "Trước hết, việc lướt mạng liên tục làm giảm khả năng tập trung và khiến học sinh khó học sâu.",
        referenceEnglish:
          "First, constant scrolling reduces concentration and makes it harder for students to study in depth.",
        keywords: ["First", "constant scrolling", "in depth"],
        structureTip:
          "Ý thân bài 1, bắt đầu bằng First. Một chủ ngữ, hai động từ song song: reduces và makes.",
      },
      {
        order: 3,
        vietnameseHint:
          "Nhiều bạn trẻ còn so sánh mình với hình ảnh đã chỉnh sửa, nên dễ mất tự tin và lo lắng.",
        referenceEnglish:
          "Many teenagers also compare themselves with edited images, which can damage their confidence and increase anxiety.",
        keywords: ["compare themselves", "edited images", "anxiety"],
        structureTip:
          "Dùng mệnh đề which can để nói hệ quả, tránh viết hai câu cụt.",
      },
      {
        order: 4,
        vietnameseHint:
          "Tuy nhiên, mạng xã hội cũng giúp người trẻ học kỹ năng mới và giữ liên lạc với bạn bè ở xa.",
        referenceEnglish:
          "However, social media also helps young people learn new skills and stay in touch with friends who live far away.",
        keywords: ["However", "new skills", "stay in touch"],
        structureTip:
          "Câu nhượng bộ mở bằng However. Đừng xóa hết ý tiêu cực ở các câu trước.",
      },
      {
        order: 5,
        vietnameseHint:
          "Vì vậy, nhà trường nên dạy cách dùng mạng có chừng mực thay vì cấm hoàn toàn.",
        referenceEnglish:
          "Therefore, schools should teach young people to use social media in moderation rather than banning it completely.",
        keywords: ["Therefore", "in moderation", "rather than"],
        structureTip:
          "Câu đề xuất: Therefore + should + giải pháp + rather than + cách cực đoan.",
      },
      {
        order: 6,
        vietnameseHint:
          "Kết luận, mạng xã hội có hại khi bị lạm dụng, nhưng nếu dùng có kiểm soát thì người trẻ vẫn hưởng lợi.",
        referenceEnglish:
          "In conclusion, social media is harmful when it is overused, but young people can still benefit from it if their use is controlled.",
        keywords: ["In conclusion", "overused", "benefit"],
        structureTip:
          "Khép lại đúng lập trường mở bài: có hại khi lạm dụng, nhưng vẫn có lợi nếu kiểm soát.",
      },
    ],
  },
];
