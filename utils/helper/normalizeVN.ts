export const normalizeVN = (str: string = ""): string => {
  return str
    .normalize("NFD") // tách ký tự & dấu
    .replace(/[\u0300-\u036f]/g, "") // xoá dấu thanh (á à ả ã...)
    .replace(/đ/g, "d") // chuẩn hoá đ
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};
