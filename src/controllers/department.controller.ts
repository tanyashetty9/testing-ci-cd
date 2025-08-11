import { Request, Response } from 'express';
import { statusCode, statusMessage } from '../constants';
import { logger } from '../utils/logger.util';
import { sendResponse } from '../utils/response.util';
import departmentRepository from '../repositories/department.repository';

const departmentRepo = new departmentRepository();

class DepartmentController {
  async createDepartment(req: Request, res: Response) {
    try {
      logger.info(
        `[controllers/department.controller]-[DepartmentController.createDepartment]-Creating new department with data: ${JSON.stringify(req.body)}`,
      );
      const { department_name } = req.body;
      if (!department_name) {
        logger.warn(
          `[controllers/department.controller]-[DepartmentController.createDepartment]-Department name is required`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      const departmentData = {
        department_name,
        is_deleted: false,
      };
      const Department = await departmentRepo.createDepartment(departmentData);
      logger.info(
        `[controllers/department.controller]-[DepartmentController.createDepartment]-Department created successfully with ID: ${Department.get('id')}`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        'Department created successfully',
        {
          id: Department.get('id'),
          department_name: Department.get('department_name'),
          is_deleted: Department.get('is_deleted'),
        },
      );
    } catch (error) {
      logger.error(
        `[controllers/department.controller]-[DepartmentController.createDepartment]-Error creating department: ${(error as Error).message}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  //   async getDepartments(req, res) {}

  //   async updateDepartment(req, res) {}

  //   async deleteDepartment(req, res) {}
}

export default DepartmentController;
