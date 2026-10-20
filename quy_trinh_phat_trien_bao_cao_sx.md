# TÀI LIỆU NGHIỆP VỤ & KIẾN TRÚC KỸ THUẬT: BÁO CÁO SẢN XUẤT CÔNG ĐOẠN 1

---

## 1. MỤC TIÊU & BỐI CẢNH DỰ ÁN
* **Nghiệp vụ**: Xây dựng màn hình báo cáo tổng hợp kết quả sản xuất công đoạn 1 (Chạy sóng bao bì carton), hỗ trợ lọc theo một hoặc nhiều ngày trong tháng.
* **Đầu ra**: Xuất 2 bảng báo cáo độc lập nhưng dùng chung danh sách cột:
  1. **Bảng 1 - Báo cáo theo Máy**: Nhóm theo `chooseMachine`.
  2. **Bảng 2 - Báo cáo theo Thợ**: Nhóm theo `shiftManagement` (Thợ chính/phụ).
* **Đặc thù chu kỳ sản xuất**: 
  * Ngày sản xuất (Production Day) quy ước chạy từ **06:00 sáng hôm nay đến 06:00 sáng hôm sau** (không dùng ngày lịch dương thuần túy).
  * Lịch phân bổ máy động theo ngày: có thể chạy 8h, 12h, 16h hoặc 24h tùy kế hoạch.

---

## 2. QUY CÁCH DỮ LIỆU & CÔNG THỨC CHI TIẾT TỪNG CỘT

| STT | Tên cột hiển thị | Nguồn dữ liệu (Model) | Logic xử lý & Công thức | Độ phức tạp |
| :---: | :--- | :--- | :--- | :---: |
| **0** | **Máy / Thợ** | `PlanningPaper` / `ReportPlanningPaper` | Nhóm dữ liệu (Dimension key) | Dễ |
| **1** | **Số tấn giấy SD** | `PaperRequirements`, `ReportPlanningPaper`, `PlanningPaper` | **Phân bổ tỷ lệ (Pro-rata)** cho đơn chạy dở:<br>$$\text{Kg giấy} = \sum \left( \text{totalRequiredQty} \times \frac{\text{Report.qtyProduced}}{\text{Planning.runningPlan}} \right)$$<br>$$\text{Số tấn (1)} = \frac{\text{Kg giấy}}{1000}$$ | Trung bình |
| **2** | **Số mét chạy được** | `ReportPlanningPaper` | $$\text{Số mét (2)} = \sum \text{totalLength}$$ | Dễ |
| **3** | **Số kg phế** | `ScrapReport` | $$\text{Kg phế (3)} = \sum \text{totalQtyScrap}$$<br>*(Map theo `machine` + `reportedBy` = Thợ)* | Trung bình |
| **--** | **% Phế** | Suy diễn từ (3) và (1) | Suất tiêu hao phế theo quy ước xưởng:<br>$$\% \text{ Phế} = \frac{\text{Số kg phế (3)}}{\text{Số tấn giấy SD (1)}}$$*(Bẫy điều kiện chia cho 0)* | Dễ |
| **--** | **Tốc độ máy** | `ReportPlanningPaper` | $$\text{Tốc độ TB} = \text{AVG}(\text{averageSpeed})$$ | Dễ |
| **--** | **Tổng doanh số** | `ReportPlanningPaper` | $$\text{Doanh số} = \sum \text{totalPrice}$$ | Dễ |
| **--** | **% Đạt kế hoạch** | `PlanningPaper`, `ReportPlanningPaper` | Áp dụng công thức Earned Standard Time ($T_{\text{earned}}$):<br>• **Bảng Máy**: % Khối lượng hoàn thành & % Tuân thủ thời gian.<br>• **Bảng Thợ**: Hiệu suất thực thi $\sum T_{\text{earned}} / \sum \text{Report.durations}$. | Trung bình |
| **4** | **Số lỗi** | `QcInspectionPaper` | Đếm số bản ghi kiểm tra QC bị đánh trượt:<br>$$\text{Số lỗi (4)} = \text{COUNT}(\text{inspecPaperId})$$ với `result === false` | Trung bình |
| **--** | **% Lỗi / Tấn giấy** | Suy diễn từ (4) và (1) | $$\% \text{ Lỗi / Tấn} = \frac{\text{Số lỗi (4)}}{\text{Số tấn giấy SD (1)}}$$ | Dễ |

---

## 3. GIẢI QUYẾT CÁC ĐIỂM NGHẼN NGHIỆP VỤ (EDGE CASES)

### 3.1. Đơn hàng chạy dở qua ca / qua ngày
* **Hiện tượng**: Đơn 10.000 tấm định mức 200 kg giấy, hôm nay ca 1 chạy 5.000 tấm, hôm sau ca khác chạy nốt 5.000 tấm.
* **Xử lý**: Áp dụng công thức phân bổ theo tỷ lệ sản lượng thực tế thợ nộp báo cáo (`qtyProduced / runningPlan`). Tránh việc tính gộp toàn bộ 200 kg vào một ca làm đội chi phí và làm sai lệch chỉ số `% Phế` và `% Lỗi/tấn`.

### 3.2. Quy trình duyệt đơn hàng (State Machine)
* **Luồng trạng thái**:
  * Chạy đủ sản lượng $\rightarrow$ Bấm hoàn thành $\rightarrow$ Trạng thái chuyển sang `requested` (chờ quản lý duyệt).
  * Chạy thiếu sản lượng $\rightarrow$ Báo thiếu $\rightarrow$ Quản lý xem xét và chuyển sang `lackQty`.
  * Hôm sau quản lý chốt sổ toàn bộ $\rightarrow$ Chuyển hàng loạt sang `complete`.
* **Kết luận**: Khi đánh giá tiến độ của thợ, các đơn ở trạng thái `requested`, `lackQty`, `complete` đều được coi là đã hoàn tất phần việc của ca.

### 3.3. Thuật toán `% Đạt kế hoạch theo thời gian định mức` (Chuẩn OEE cho Bảng Máy & Thợ)
Thay vì đo Wall-clock time (dễ bị nhiễu bởi giờ ăn, downtime sự cố máy), áp dụng phương pháp **Thời gian định mức tạo ra (Earned Standard Time - $T_{\text{earned}}$)**:
1. **Thời gian định mức tạo ra ($T_{\text{earned}}$)**:
   * Mỗi đơn hàng có `plannedDuration` (phút) được lưu trực tiếp khi chạy thuật toán kế hoạch.
   * Khi thợ báo cáo sản lượng (`qtyProduced`), thời gian định mức tạo ra tương ứng:
     $$T_{\text{earned}} = \text{plannedDuration} \times \frac{\text{Report.qtyProduced}}{\text{Planning.runningPlan}}$$
   * *(Tự động phân bổ chính xác cho đơn chạy dở qua ca / qua ngày).*
2. **Bảng Máy**:
   * **% Khối lượng hoàn thành**:
     $$\% \text{ Đạt KH (Khối lượng)} = \min\left(100\%, \frac{\sum T_{\text{earned}}}{\sum \text{plannedDuration của kế hoạch ngày}} \times 100\%\right)$$
   * **% Hiệu suất tuân thủ thời gian / tốc độ**:
     $$\% \text{ Tuân thủ thời gian} = \frac{\sum T_{\text{earned}}}{\sum \text{Report.durations}} \times 100\%$$
3. **Bảng Thợ**:
   * Đo lường hiệu suất thực thi của Thợ trong ca làm việc:
     $$\% \text{ Đạt KH (Thợ)} = \frac{\sum T_{\text{earned}}}{\sum \text{Report.durations}} \times 100\%$$

---

## 4. ĐỀ XUẤT CẢI TIẾN SCHEMA (DATABASE)

* **Thực trạng**: 
  * `timeRunning` trong `PlanningPaper` hiện đang lưu dạng string kết thúc dự kiến (ví dụ: `"02:30"`).
  * Bảng `ReportPlanningPaper` đã có `durations: number` (lưu số phút chạy thực tế).
* **Đề xuất bổ sung**:
  * Thêm cột **`plannedDuration: number`** (đơn vị: phút) vào bảng `PlanningPaper`.
  * Ghi nhận trực tiếp giá trị này khi hàm cập nhật kế hoạch nhận param *tổng thời gian chạy*.
  * **Lợi ích**: 
    * Xử lý triệt để bẫy chuyển ngày (đơn bắt đầu 23:30, kết thúc 02:00 sáng).
    * Đối chiếu kế hoạch vs thực tế bằng phép so sánh số nguyên trực tiếp: `Report.durations` vs `Planning.plannedDuration`.

---

## 5. ĐỊNH HƯỚNG KIẾN TRÚC BACKEND (SERVICE ORCHESTRATION)

* **Không dùng**: Không viết 1 câu Raw SQL monolithic `LEFT JOIN` cả 5 bảng để tránh lỗi nhân bản dòng (Cartesian Product) do lệch cấp độ dữ liệu.
* **Mô hình khuyến nghị**:
  1. Truy vấn hạt nhỏ nhất `(chooseMachine, shiftManagement)` từ bảng gốc `ReportPlanningPaper`.
  2. Dùng `Promise.all` gọi song song các helper lấy dữ liệu phụ trợ:
     * `fetchPaperRequirements(planningIds)`
     * `fetchScrapData(dates)`
     * `fetchPlanAdherence(dates)`
     * `fetchQcErrors(planningIds)`
  3. Ghép nối dữ liệu trên bộ nhớ (In-memory aggregation bằng `Map`).
  4. Thực hiện rollup ra 2 bảng: theo Máy và theo Thợ.

---

## 6. CHECKLIST CẦN SCAN CODEBASE TRÊN ANTIGRAVITY

1. **Trường lưu ngày sản xuất**: Kiểm tra xem các đơn chạy rạng sáng (00:00 - 06:00) đang được lưu `dayStart` theo ngày lịch thực tế hay theo ngày sản xuất (ngày hôm trước).
2. **Thời điểm hoàn thành thực tế**: Kiểm tra khi thợ bấm chốt đơn, mốc thời gian thực tế được ghi vào `dayCompleted` của `PlanningPaper` hay `createdAt` của `ReportPlanningPaper`.
3. **Hàm tính lỗi QC**: Kiểm tra hàm đếm lỗi hiện tại trong dự án nhận tham số là gì (danh sách `planningId`, `userId`, hay khoảng thời gian).
4. **Hàm cập nhật kế hoạch**: Xem lại logic nhận param *tổng thời gian chạy* để chuẩn bị tích hợp cột `plannedDuration`.