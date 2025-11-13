import { User } from "../models/user/user";

export const authRepository = {
  findUserByEmail: async (email: string) => {
    return await User.findOne({ where: { email } });
  },

  createUser: async (data: any) => {
    return await User.create(data);
  },

  updatePassword: async (email: string, hashedPassword: string) => {
    return await User.update({ password: hashedPassword }, { where: { email } });
  },
};
