import Customer from "./customer/customer.js";
import Box from "./order/box.js";
import Song from "./order/enum/song.js";
import InfoProduction from "./order/infoProduction.js";
import Order from "./order/order.js";
import QuantitativePaper from "./order/quantitativePaper.js";
import User from "./user/user.js";

const models = {
  User,
  Customer,
  InfoProduction,
  QuantitativePaper,
  Order,
  Box,
  Song,
};

export default models;
