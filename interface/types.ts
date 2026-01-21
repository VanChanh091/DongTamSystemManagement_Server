import ExcelJS from "exceljs";
import { Model, ModelStatic, Transaction, WhereOptions } from "sequelize";
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
  where?: WhereOptions<any>;
  data?: any;
  options?: any;
  transaction?: Transaction;
}

export interface RedisUserData {
  email: string;
  otp: number;
}

export type InboundSumByPlanning = {
  planningId?: number;
  planningBoxId?: number;
  totalInbound: string;
};
