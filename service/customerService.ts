import redisCache from "../configs/redisCache";
import { Customer } from "../models/customer/customer";
import { customerRepository } from "../repository/customerRepository";
import { CacheManager } from "../utils/helper/cacheManager";

export const customerService = {
  async getAllCustomers({
    page = 1,
    pageSize = 20,
    noPaging = false,
    devEnvironment,
  }: {
    page?: number;
    pageSize?: number;
    noPaging?: string | boolean;
    devEnvironment: boolean;
  }) {
    const noPagingMode = noPaging === "true";

    const { customer } = CacheManager.keys;
    const cacheKey = noPaging === "true" ? customer.all : customer.page(page);

    const { isChanged } = await CacheManager.check(Customer, "customer");

    if (isChanged) {
      await CacheManager.clearCustomer();
    } else {
      const cachedData = await redisCache.get(cacheKey);
      if (cachedData) {
        if (devEnvironment) console.log("✅ Data Customer from Redis");
        return { ...JSON.parse(cachedData), fromCache: true };
      }
    }

    let data, totalPages;
    const totalCustomers = await customerRepository.customerCount();

    if (noPagingMode) {
      totalPages = 1;
      data = await customerRepository.findAllCustomer();
    } else {
      totalPages = Math.ceil(totalCustomers / pageSize);
      data = await customerRepository.findCustomerByPage(page, pageSize);
    }

    const responseData = {
      data,
      totalCustomers,
      totalPages,
      currentPage: noPagingMode ? 1 : page,
    };

    await redisCache.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    return responseData;
  },
};
