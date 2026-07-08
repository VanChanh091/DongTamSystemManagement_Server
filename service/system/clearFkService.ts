import { sequelize } from "../../assets/configs/connect/database.connect";

//sau khi chạy hàm xong thì vào index chạy alter:true để cập nhật lại FK
export const cleanAllForeignKeys = async () => {
  try {
    console.log("\n🧹 Bắt đầu quét rác Database...");

    const [constraints] = (await sequelize.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';
    `)) as [any[], any];

    if (constraints.length === 0) {
      console.log("✅ Không có khóa ngoại nào cần xóa.");
    } else {
      console.log(
        `⚠️ Phát hiện tổng cộng ${constraints.length} khóa ngoại trên toàn hệ thống. Tiến hành xóa...`,
      );

      for (const row of constraints) {
        console.log(`constraintName: ${row.CONSTRAINT_NAME}`);
        await sequelize.query(
          `ALTER TABLE \`${row.TABLE_NAME}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\`;`,
        );
      }
    }

    return { message: "Đã dọn sạch khóa rác và reset Khóa Ngoại!" };
  } catch (error) {
    console.error("❌ Lỗi khi dọn dẹp khóa ngoại:", error);
    throw error;
  }
};
