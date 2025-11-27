"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.verifyOTPChangePassword = exports.login = exports.register = exports.getOtpCode = void 0;
const authService_1 = require("../../service/authService");
const getOtpCode = async (req, res) => {
    const { email } = req.body;
    try {
        const response = await authService_1.authService.getOtpCode(email);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.getOtpCode = getOtpCode;
const register = async (req, res) => {
    try {
        const response = await authService_1.authService.register(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const response = await authService_1.authService.login(email, password);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.login = login;
const verifyOTPChangePassword = async (req, res) => {
    const { email, otpInput } = req.body;
    try {
        const response = await authService_1.authService.verifyOTPChangePassword(email, otpInput);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.verifyOTPChangePassword = verifyOTPChangePassword;
const changePassword = async (req, res) => {
    const { email, newPassword, confirmNewPW } = req.body;
    try {
        const response = await authService_1.authService.changePassword(email, newPassword, confirmNewPW);
        return res.status(201).json(response);
    }
    catch (error) {
        return res.status(error.statusCode).json({ message: error.message });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map