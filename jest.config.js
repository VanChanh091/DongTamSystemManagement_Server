/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  // Thêm dòng này để Jest không bỏ qua Faker
  transformIgnorePatterns: ["node_modules/(?!@faker-js/)"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  clearMocks: true,
};
