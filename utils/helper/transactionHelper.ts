import { Transaction } from "sequelize";
import { sequelize } from "../../configs/connectDB";

export const runInTransaction = async <T>(fn: (t: Transaction) => Promise<T>): Promise<T> => {
  const t = await sequelize.transaction();

  try {
    const result = await fn(t);
    await t.commit();
    return result;
  } catch (e) {
    await t.rollback();
    throw e;
  }
};
