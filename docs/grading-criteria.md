# Tiêu chí chấm điểm từng câu

Mỗi câu học viên nộp được chấm theo **4 tiêu chí**. Giáo viên AI (Gemini/OpenAI) cho điểm
từng tiêu chí; app tự cộng lại thành **Độ chính xác** (0–100%). AI không tự cho một con số
tổng.

| Tiêu chí | Tối đa | Câu hỏi khi chấm |
|---|---:|---|
| Đúng ý | 40 | Câu có diễn đạt đủ và đúng ý tiếng Việt không? |
| Ngữ pháp & dấu câu | 30 | Câu có đúng ngữ pháp, chính tả, dấu câu không? |
| Từ vựng học thuật | 20 | Từ có chính xác, tự nhiên và hợp giọng bài luận không? |
| Mạch lạc | 10 | Câu có nối tự nhiên với các câu trước và đúng vai trò trong bài không? |
| **Tổng** | **100** | |

## 1. Đúng ý (0–40)

So với **ý tiếng Việt**, không so từng chữ với câu tham chiếu.

| Điểm | Mô tả |
|---|---|
| 40 | Đủ mọi ý, đúng sắc thái và lập trường (ví dụ "partly agree" khác "agree"). |
| 32–39 | Đủ ý chính; lệch nhẹ sắc thái hoặc thiếu một chi tiết phụ. |
| 20–31 | Thiếu một ý chính, hoặc một phần câu hiểu sai ý. |
| 1–19 | Chỉ đúng một phần nhỏ ý. |
| 0 | Sai ý, không liên quan, hoặc viết bằng tiếng Việt. |

## 2. Ngữ pháp & dấu câu (0–30)

| Điểm | Mô tả |
|---|---|
| 30 | Không có lỗi nào. |
| 26–29 | Một lỗi nhỏ không ảnh hưởng nghĩa: mạo từ, số ít/nhiều, viết hoa, thiếu dấu chấm cuối câu. |
| 18–25 | 2–3 lỗi nhỏ, hoặc một lỗi rõ: sai thì, hòa hợp chủ ngữ – động từ, sai giới từ. |
| 8–17 | Nhiều lỗi nhưng vẫn hiểu được câu. |
| 0–7 | Câu vỡ cấu trúc, khó hiểu. |

## 3. Từ vựng học thuật (0–20)

| Điểm | Mô tả |
|---|---|
| 20 | Không thể chọn từ nào chính xác hoặc tự nhiên hơn. |
| 19 | Rất tốt, chỉ một chỗ có thể tinh chỉnh. |
| 15–18 | Đúng nghĩa nhưng còn thông thường, collocation hơi gượng, hoặc cụm từ dễ hiểu nhầm (ví dụ "deep learning" là thuật ngữ AI). |
| 10–14 | Từ chung chung, lặp từ, hoặc giọng văn nói. |
| 0–9 | Dùng sai từ đến mức làm sai nghĩa. |

## 4. Mạch lạc (0–10)

Xét câu trong bối cảnh **đề bài** và **các câu đã viết trước đó**.

| Điểm | Mô tả |
|---|---|
| 10 | Nối tự nhiên với câu trước, từ nối phù hợp, đúng vai trò trong đoạn. |
| 7–9 | Ổn nhưng thiếu/thừa từ nối, hoặc hơi lệch trọng tâm chủ đề. |
| 4–6 | Rời rạc so với mạch bài. |
| 0–3 | Mâu thuẫn với các câu trước hoặc với lập trường của bài. |

## Quy tắc chung

1. **Liệt kê lỗi trước, chấm sau.** AI soát lần lượt cả 4 tiêu chí (kể cả từng collocation và từ nối) như một giám khảo IELTS khó tính, ghi các lỗi tìm thấy, rồi mới cho điểm.
2. **Có lỗi thì phải trừ điểm, không có lỗi thì cho tối đa.** Không trừ điểm "cho có" khi không chỉ ra được lỗi; không cho tối đa khi đã nêu lỗi.
3. **Khác câu tham chiếu không phải là lỗi.** Diễn đạt khác nhưng đúng ý, đúng ngữ pháp vẫn được điểm cao.
4. **Câu viết bằng tiếng Việt** hoặc chỉ là cụm từ rời: mọi tiêu chí rất thấp, tổng dưới 40.
5. Điểm từng tiêu chí là số nguyên; tổng có thể là bất kỳ số nào, không cần tròn 5 hay 10.

## Điều kiện qua câu

Câu chỉ được sang câu tiếp theo khi thoả **cả ba** điều kiện (xem `scoreOutcome` trong `src/lib/grading.ts`):

1. Tổng từ **70** trở lên.
2. Đúng ý từ **32/40** trở lên — thiếu ý chính thì không qua dù tổng đủ.
3. **Không còn lỗi ngữ pháp nào**: Ngữ pháp phải đạt 30/30 và danh sách `errors` không có lỗi thuộc tiêu chí ngữ pháp.

Lỗi chỉ ở Từ vựng hoặc Mạch lạc không chặn câu, chỉ bị trừ điểm.

| Kết quả | Khi nào |
|---|---|
| Xuất sắc ("Good translation!") | Qua câu và tổng ≥ 98, không có lỗi nào. |
| Đạt | Qua câu. |
| Chưa đạt — "Đúng ý nhưng còn lỗi ngữ pháp" | Chỉ vướng điều kiện 3. Lần nộp lại câu đó **không trừ token** (một lần cho mỗi lần nộp có trả token). |
| Chưa đạt — "Chưa đủ ý" | Vướng điều kiện 2. |
| Chưa đạt | Tổng dưới 70. |

Điểm thưởng: câu đạt được `round(tổng / 10)` điểm (tối thiểu 1). Ví dụ 84% được 8 điểm.
Bài chấm mẫu (không có API key) không có điểm từng tiêu chí nên chỉ xét điều kiện 1.

## Ví dụ

Ý tiếng Việt: *"Tôi đồng ý một phần rằng mạng xã hội có hại cho giới trẻ, vì rủi ro là có thật nhưng không phải tác động duy nhất."*

| Câu học viên | Đúng ý | Ngữ pháp | Từ vựng | Mạch lạc | Tổng |
|---|---:|---:|---:|---:|---:|
| I partly agree that social media harms young people, because its risks are real but they are not its only effect. | 40 | 30 | 19 | 10 | **99** |
| I partially agree that social media is harmful to young people, as the negative effects are real, but they are not the only impact. | 40 | 30 | 17 | 10 | **97** |
| I agree social media is bad for young people because it have many risks. | 22 | 22 | 11 | 7 | **62** |

## Chấm mẫu (không có API key)

Khi chưa cấu hình API key, app dùng bộ chấm mẫu so khớp từ khóa với câu tham chiếu
(`src/lib/grading.ts`). Bộ này không chấm theo 4 tiêu chí trên và chỉ dùng để thử giao diện.

## Code liên quan

- Prompt và cách cộng điểm: `src/lib/ai.ts`
- Ngưỡng đạt và điểm thưởng: `src/lib/grading.ts` (`scoreOutcome`, `SCORE_CRITERIA`)
- Hiển thị điểm từng tiêu chí: `src/components/PracticeScreen.tsx`
