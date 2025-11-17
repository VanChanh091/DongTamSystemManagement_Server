export interface FilterDataFromCacheProps<T> {
  model: any;
  cacheKey: string;
  keyword: string;
  getFieldValue: (item: T) => any;
  page?: number | string;
  pageSize?: number | string;
  message?: string;
  fetchFunction?: () => Promise<T[]>;
}

export interface BreakTime {
  start: string;
  end: string;
  duration: number;
}
