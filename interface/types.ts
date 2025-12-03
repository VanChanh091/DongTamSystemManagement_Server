import ExcelJS from "exceljs";
export interface FilterDataFromCacheProps<T> {
  model?: any;
  cacheKey: string;
  keyword: string;
  getFieldValue: (item: T) => any;
  page?: number | string;
  pageSize?: number | string;
  message?: string;
  fetchFunction?: () => Promise<T[]>;
  whereCondition?: any;
  isBox?: boolean;
}

export interface BreakTime {
  start: string;
  end: string;
  duration: number;
}

export interface ExportExcelOptions<T> {
  data: T[];
  sheetName: string;
  fileName: string;
  columns: Partial<ExcelJS.Column>[];
  rows: (item: T, index: number) => Record<string, any>;
}

export interface RepoPayload {
  model: any;
  where?: any;
  data?: any;
  options?: any;
  transaction?: any;
}

export interface RedisUserData {
  email: string;
  otp: number;
}
