import ExcelJS from "exceljs";
import { Transaction, WhereOptions } from "sequelize";
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
  include?: any;
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

export interface searchFieldAtribute {
  field: string;
  keyword: string;
  user?: any;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  machine?: string;
  filter?: "gtZero" | "ltZero";
}

export interface UnifiedPerfInput {
  dateKey: string;
  fluteLayer: number;
  length: number;
  duration: number;
}

export interface PlanningOrderInput {
  // Thông số máy & Khổ chạy
  chooseMachine: string;
  runningPlan: number;
  ghepKho: number;

  lengthPaperPlanning: number;
  sizePaperPLaning: number;

  // Cấu trúc giấy các lớp
  dayReplace?: string;
  songEReplace?: string;
  matEReplace?: string;
  songBReplace?: string;
  matBReplace?: string;
  songCReplace?: string;
  matCReplace?: string;
  songE2Replace?: string;
  matE2Replace?: string;
}
