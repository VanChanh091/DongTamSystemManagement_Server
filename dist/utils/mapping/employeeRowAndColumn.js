"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingEmployeeRow = exports.employeeColumns = void 0;
exports.employeeColumns = [
    { header: "STT", key: "index" },
    { header: "Mã Nhân Viên", key: "employeeCode" },
    { header: "Tên Nhân Viên", key: "fullName" },
    { header: "Ngày Vào Làm", key: "joinDate", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Bộ Phận", key: "department" },
    { header: "Chức Vụ", key: "position" },
    { header: "Giới Tính", key: "gender" },
    { header: "Ngày Sinh", key: "birthday", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Nơi Sinh", key: "birthPlace" },
    { header: "Nguyên Quán", key: "homeTown" },
    { header: "Số CCCD", key: "citizenId" },
    { header: "Ngày Cấp", key: "citizenIssuedDate", style: { numFmt: "dd/mm/yyyy" } },
    { header: "Nơi Cấp", key: "citizenIssuedPlace" },
    { header: "ĐC Thường Trú", key: "permanentAddress" },
    { header: "ĐC Tạm Trú", key: "temporaryAddress" },
    { header: "Dân Tộc", key: "ethnicity" },
    { header: "Trình Độ Văn Hóa", key: "educationLevel" },
    { header: "Hệ Đào Tạo", key: "educationSystem" },
    { header: "Ngành Học", key: "major" },
    { header: "Số Điện Thoại", key: "phoneNumber" },
    { header: "SDT (Khẩn Cấp)", key: "emergencyPhone" },
    { header: "Tình Trạng", key: "status" },
];
const mappingEmployeeRow = (item, index) => {
    const companyInfo = item.companyInfo;
    return {
        index: index + 1,
        employeeCode: companyInfo.employeeCode,
        fullName: item.fullName,
        joinDate: companyInfo.joinDate,
        department: companyInfo.department,
        position: companyInfo.position,
        gender: item.gender,
        birthday: item.birthday,
        birthPlace: item.birthPlace,
        homeTown: item.homeTown,
        citizenId: item.citizenId,
        citizenIssuedDate: item.citizenIssuedDate,
        citizenIssuedPlace: item.citizenIssuedPlace,
        permanentAddress: item.permanentAddress,
        temporaryAddress: item.temporaryAddress,
        ethnicity: item.ethnicity,
        educationLevel: item.educationLevel,
        educationSystem: item.educationSystem,
        major: item.major,
        phoneNumber: item.phoneNumber,
        emergencyPhone: companyInfo.emergencyPhone,
        status: companyInfo.status,
    };
};
exports.mappingEmployeeRow = mappingEmployeeRow;
//# sourceMappingURL=employeeRowAndColumn.js.map