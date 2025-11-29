import { NextFunction, Request, Response } from "express";
import { employeeService } from "../../../service/employeeService";

//get all
export const getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const {
    page = 1,
    pageSize = 20,
    noPaging = false,
  } = req.query as { page?: string; pageSize?: string; noPaging?: string | boolean };

  try {
    const response = await employeeService.getAllEmployees({
      page: Number(page),
      pageSize: Number(pageSize),
      noPaging,
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//get by field
export const getEmployeesByField = async (req: Request, res: Response, next: NextFunction) => {
  const { field, keyword, page, pageSize } = req.query as {
    field: string;
    keyword: string;
    page: string;
    pageSize: string;
  };

  try {
    const response = await employeeService.getEmployeesByField({
      field,
      keyword,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//add employee
export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await employeeService.createEmployee(req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//update
export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId } = req.query as { employeeId: string };

  try {
    const response = await employeeService.updateEmployee(Number(employeeId), req.body);
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//delete
export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId } = req.query as { employeeId: string };

  try {
    const response = await employeeService.deleteEmployee(Number(employeeId));
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//export excel
export const exportExcelEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const { status, joinDate, all = false } = req.body;

  try {
    await employeeService.exportExcelEmployee(res, { status, joinDate, all });
  } catch (error) {
    next(error);
  }
};
