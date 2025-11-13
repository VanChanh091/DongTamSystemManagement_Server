import { User } from "../models/user/user";

export const userRepository = {
  findUserById: async (userId: number) => {
    return await User.findByPk(userId);
  },
};
