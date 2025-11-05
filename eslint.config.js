import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }], // cảnh báo khi khai báo mà không dùng, bỏ qua từ có dấu _ đằng trước
      "no-undef": "error", // lỗi nếu dùng biến chưa định nghĩa
      semi: ["error", "always"], // bắt buộc có ;
      quotes: ["warn", "double"], // khuyên dùng double quotes
    },
  },
]);
