import EmployeeRepository from '../repositories/employee.repository';
import e, { Request, Response } from 'express';
import { Employee } from '../types/custom.interface';
import { logger } from '../utils/logger.util';
import { sendResponse } from '../utils/response.util';
import { statusCode, statusMessage } from '../constants';

const employeeRepo = new EmployeeRepository();

/**
 * @class EmployeeController
 * @description Controller for managing employee-related operations in the system.
 *
 * @method createEmployee
 * @description Creates a new employee in the system.
 * @param {Request} req - The request object containing employee data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or employee creation.
 *
 * @method getEmployeeById
 * @description Fetches an employee by ID from the system.
 * @param {Request} req - The request object containing employee ID.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or employee retrieval.
 *
 * @method getAllEmployees
 * @description Fetches all employees from the system.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or employee retrieval.
 *
 * @method updateEmployee
 * @description Updates an employee in the system.
 * @param {Request} req - The request object containing employee ID and data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or employee update.
 *
 * @method getEmployeeQrDetails
 * @description Fetches QR details for an employee by ID from the system.
 * @param {Request} req - The request object containing employee ID.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or QR details retrieval.
 */
class EmployeeController {
  /*
   *@description Creates a new employee in the system.
   * @param {Request} req - The request object containing employee data.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or employee creation.
   */
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const {
        employee_number,
        first_name,
        middle_name,
        last_name,
        email,
        department,
        time_to_food,
        role,
      }: Employee = req.body;
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.createEmployee]-Creating employee with data: ${JSON.stringify(req.body)}`,
      );
      const employeeData = {
        employee_number,
        first_name,
        middle_name,
        last_name,
        email,
        time_to_food,
        department,
        role,
      } as Employee;
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.createEmployee]-Employee data: ${JSON.stringify(employeeData)}`,
      );
      const employee = await employeeRepo.createEmployee(employeeData);
      if (!employee) {
        logger.error(
          `[controllers/employee.controller]-[EmployeeController.createEmployee]-Failed to create employee`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.createEmployee]-Employee created successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.CREATED),
        statusMessage.CREATED,
        employee,
      );
    } catch (error) {
      logger.error(
        `[controllers/employee.controller]-[EmployeeController.createEmployee]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Fetches an employee by ID from the system.
   * @param {Request} req - The request object containing employee ID.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or employee retrieval.
   */
  async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeById]-Fetching employee with ID: ${id}`,
      );
      const employee = await employeeRepo.getEmployeeById(id);
      let { role, time_to_food, opt_status, ...employeeData } = employee || {};
      role =
        role === 'admin'
          ? 'Admin'
          : role === 'manager'
            ? 'Manager'
            : 'Employee';
      time_to_food =
        time_to_food === 'dinner'
          ? 'Dinner'
          : time_to_food === 'lunch'
            ? 'Lunch'
            : 'Lunch And Dinner';
      opt_status =
        opt_status === 'opt-in'
          ? 'Opt In'
          : opt_status === 'opt-out-temp'
            ? 'Opt Out Temporary'
            : 'Opt Out Permanent';
      employeeData = {
        ...employeeData,
        role,
        time_to_food,
        opt_status,
      };
      if (!employee) {
        logger.error(
          `[controllers/employee.controller]-[EmployeeController.getEmployeeById]-Employee not found with ID: ${id}`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeById]-Employee found with ID: ${JSON.stringify(
          employeeData,
        )}`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        employeeData,
      );
    } catch (error) {
      logger.error(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeById]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Fetches all employees from the system.
   * @param {Request}
   * req - The request object.
   * @param {Response}
   * res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or employee retrieval.
   * */
  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getAllEmployees]-Fetching all employees`,
      );
      const employees = await employeeRepo.getAllEmployees();
      let formattedEmployees: any = employees?.map(employee => {
        let { role, user_details, ...employeeData } = employee;
        let {
          time_to_food,
          opt_status,
          employee_number,
          full_name,
          department,
        } = user_details || {};
        role =
          role === 'admin'
            ? 'Admin'
            : role === 'manager'
              ? 'Manager'
              : 'Employee';
        time_to_food =
          time_to_food === 'dinner'
            ? 'Dinner'
            : time_to_food === 'lunch'
              ? 'Lunch'
              : 'Lunch And Dinner';
        employeeData = {
          ...employeeData,
          role,
          user_details: {
            employee_number: employee_number,
            full_name: full_name,
            department: department,
            time_to_food,
            opt_status,
          },
        } as Employee;
        return employeeData;
      });
      if (!employees) {
        logger.error(
          `[controllers/employee.controller]-[EmployeeController.getAllEmployees]-No employees found`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getAllEmployees]-Employees fetched successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        formattedEmployees,
      );
    } catch (error) {
      logger.error(
        `[controllers/employee.controller]-[EmployeeController.getAllEmployees]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }
  /*
   * @description Updates an employee in the system.
   * @param {Request}
   * req - The request object containing employee ID and data.
   * @param {Response}
   * res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or employee update.
   * */
  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const employeeData = req.body as Employee;

      logger.info(
        `[controllers/employee.controller]-[EmployeeController.updateEmployee]-Updating employee with ID: ${id} and data: ${JSON.stringify(
          employeeData,
        )}`,
      );
      const employee = await employeeRepo.updateEmployee(id, employeeData);
      if (!employee) {
        logger.error(
          `[controllers/employee.controller]-[EmployeeController.updateEmployee]-Failed to update employee with ID: ${id}`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.updateEmployee]-Employee updated successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        employee,
      );
    } catch (error) {
      logger.error(
        `[controllers/employee.controller]-[EmployeeController.updateEmployee]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Deletes an employee from the system.
   * @param {Request}
   * req - The request object containing employee ID.
   * @param {Response}
   * res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or employee deletion.
   * */
  async getEmployeeQrDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeQrDetails]-Fetching QR details for employee with ID: ${id}`,
      );
      const qrDetails = await employeeRepo.getEmployeeScanningDetails(id);
      if (!qrDetails) {
        logger.error(
          `[controllers/employee.controller]-[EmployeeController.getEmployeeQrDetails]-No QR details found for employee with ID: ${id}`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeQrDetails]-QR details fetched successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        qrDetails,
      );
    } catch (error) {
      logger.error(
        `[controllers/employee.controller]-[EmployeeController.getEmployeeQrDetails]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }
}

export default EmployeeController;
