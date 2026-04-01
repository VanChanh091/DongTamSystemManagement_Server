import { RepoPayload } from "../../interface/types";

export const planningHelper = {
  //====================================FUNC GLOBAL========================================
  getModelById: async ({ model, where, options = {} }: RepoPayload) => {
    return await model.findOne({ where, ...options });
  },

  updateDataModel: async ({ model, data, options = {} }: RepoPayload) => {
    return await model.update(data, options);
  },

  deleteModelData: async ({ model, where, transaction }: RepoPayload) => {
    return await model.destroy({ where, transaction });
  },

  createData: async ({ model, data, transaction }: RepoPayload) => {
    return await model.create(data, { transaction });
  },
};
