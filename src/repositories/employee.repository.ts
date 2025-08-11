import { QueryTypes } from 'sequelize';
import { EmployeeModel, UserModel } from '../models/index.model';
import { Employee } from '../types/custom.interface';
import { logger } from '../utils/logger.util';
import moment from 'moment';
import { getEmployeeAbsentCountQuery } from '../types/queries/employee.query.type';

class EmployeeRepository {
  async createEmployee(employeeData: Employee): Promise<Employee | null> {
    const transaction = await EmployeeModel.sequelize?.transaction();
    try {
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Creating employee with data: ${JSON.stringify(employeeData)}`,
      );

      if (!transaction) {
        throw new Error('Transaction could not be created');
      }

      const employeeDetails = {
        employee_number: employeeData.employee_number,
        first_name: employeeData.first_name,
        middle_name: employeeData.middle_name || null,
        department: employeeData.department || null,
        last_name: employeeData.last_name || null,
        time_to_food: employeeData.time_to_food || null,
      };

      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Employee details: ${JSON.stringify(
          employeeDetails,
        )}`,
      );

      const existingEmployee = await EmployeeModel.findOne({
        where: {
          employee_number: employeeData.employee_number,
          is_deleted: false,
        },
        transaction,
      });

      if (existingEmployee) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Employee already exists with employee_number: ${employeeData.employee_number}`,
        );
        throw new Error('Employee already exists');
      }

      const employee = await EmployeeModel.create(employeeDetails, {
        transaction,
      });

      const userDetails = {
        employee_id: employee.getDataValue('id'),
        email: employeeData.email,
        role: employeeData.role,
      };

      const existingUser = await UserModel.findOne({
        where: {
          employee_id: employee.getDataValue('id'),
          email: employeeData.email,
          is_deleted: false,
        },
        transaction,
      });

      if (existingUser) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-User already exists with employee ID: ${employee.getDataValue('id')}`,
        );
        throw new Error('User already exists');
      }

      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Creating user with data: ${JSON.stringify(
          userDetails,
        )}`,
      );
      const user = await UserModel.create(userDetails, { transaction });

      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-User created successfully with ID: ${user.getDataValue(
          'id',
        )}`,
      );

      const userId = user.getDataValue('id');

      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Creating QRMaster with user ID: ${userId}`,
      );

      await transaction.commit();

      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Employee and User created successfully with IDs: ${employee.getDataValue('id')} and ${user.getDataValue('id')}`,
      );

      return employee.get({ plain: true }) as Employee;
    } catch (error) {
      logger.error(
        `[repositories/employee.repository]-[EmployeeRepository.createEmployee]-Error: ${error}`,
      );
      if (transaction) {
        await transaction.rollback();
      }
      throw new Error('Error creating employee');
    }
  }

  async getEmployeeById(employeeId: string): Promise<Employee | null> {
    try {
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.getEmployeeById]-Fetching employee with ID: ${employeeId}`,
      );
      const query = `
        SELECT
          u.id AS user_id,
          e.id AS employee_id,
          e.first_name,
          e.middle_name,
          e.last_name,
          e.employee_number,
          e.department,
          u.email,
          u.role,
          e.time_to_food,
          u.opt_status,
          u.is_active,
          e.is_wfh,
          e.is_deleted,
          e.created_at,
          e.updated_at
        FROM
          employees e
        LEFT JOIN
          users u ON e.id = u.employee_id
        WHERE
          e.id = :employeeId
        `;
      const employee = await EmployeeModel.sequelize?.query(query, {
        replacements: { employeeId },
        type: QueryTypes.SELECT,
      });
      if (!employee) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.getEmployeeById]-Employee not found with ID: ${employeeId}`,
        );
        throw new Error('Employee not found');
      }
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.getEmployeeById]-Employee found with ID: ${employee}`,
      );

      return employee && employee.length > 0 ? (employee[0] as Employee) : null;
    } catch (error) {
      logger.error(
        `[repositories/employee.repository]-[EmployeeRepository.getEmployeeById]-Error: ${error}`,
      );
      throw new Error('Error fetching employee by ID');
    }
  }
  async getAllEmployees(): Promise<Employee[] | null> {
    try {
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.getAllEmployees]-Fetching all employees`,
      );
      const query = `
        SELECT
          u.id AS user_id,
          e.id AS employee_id,
          u.role,
          u.is_active,
          e.is_deleted,
          e.created_at,
          e.updated_at,
          json_build_object(
          'employee_number', e.employee_number,
          'full_name', CONCAT(
          COALESCE(e.first_name, ''),
          CASE WHEN e.middle_name IS NOT NULL AND e.middle_name != '' THEN CONCAT(' ', e.middle_name) ELSE '' END,
          CASE WHEN e.last_name IS NOT NULL AND e.last_name != '' THEN CONCAT(' ', e.last_name) ELSE '' END
          ),
          'department', e.department,
          'time_to_food', e.time_to_food,
          'opt_status', u.opt_status
          ) AS user_details
        FROM
          employees e
        LEFT JOIN
          users u ON e.id = u.employee_id
        ORDER BY CAST(e.employee_number AS INTEGER) DESC
      `;
      const employees = await EmployeeModel.sequelize?.query(query, {
        type: QueryTypes.SELECT,
      });
      if (!employees) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.getAllEmployees]-No employees found`,
        );
        throw new Error('No employees found');
      }
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.getAllEmployees]-Employees fetched successfully`,
      );
      return employees as Employee[] | null;
    } catch (error) {
      logger.error(
        `[repositories/employee.repository]-[EmployeeRepository.getAllEmployees]-Error: ${error}`,
      );
      throw new Error('Error fetching all employees');
    }
  }
  async updateEmployee(
    employeeId: string,
    employeeData: Employee,
  ): Promise<Employee | null> {
    const transaction = await EmployeeModel.sequelize?.transaction();
    try {
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-Updating employee with ID: ${employeeId}`,
      );
      if (!transaction) {
        throw new Error('Transaction could not be created');
      }
      const employee = await EmployeeModel.findOne({
        where: {
          id: employeeId,
          is_deleted: false,
        },
        transaction,
      });
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-Employee found with ID: ${employeeId} and data: ${JSON.stringify(
          employee,
        )}`,
      );
      if (!employee) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-Employee not found with ID: ${employeeId}`,
        );
        throw new Error('Employee not found');
      }
      await employee.update(employeeData, { transaction });
      const user = await UserModel.findOne({
        where: {
          employee_id: employeeId,
          is_deleted: false,
        },
        transaction,
      });
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-User found with employee ID: ${employeeId} and data: ${JSON.stringify(
          user,
        )}`,
      );
      if (!user) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-User not found with employee ID: ${employeeId}`,
        );
        throw new Error('User not found');
      }
      const userDetails = {
        email: employeeData.email,
        role: employeeData.role,
        opt_status: employeeData.opt_status,
        is_active: employeeData.is_active,
      };
      const isUpdted = await user.update(
        {
          ...userDetails,
        },
        { transaction },
      );
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-User updated with employee ID: ${employeeId} and data: ${JSON.stringify(
          isUpdted,
        )}`,
      );
      if (!isUpdted) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-User not updated with employee ID: ${employeeId}`,
        );
        throw new Error('User not updated');
      }
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-User updated successfully with ID: ${user.getDataValue(
          'id',
        )}`,
      );
      await transaction.commit();
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-Employee updated successfully with ID: ${employeeId}`,
      );
      return employee.get({ plain: true }) as Employee;
    } catch (error) {
      logger.error(
        `[repositories/employee.repository]-[EmployeeRepository.updateEmployee]-Error: ${error}`,
      );
      if (transaction) {
        await transaction.rollback();
      }
      throw new Error('Error updating employee');
    }
  }
  async deleteEmployee(employeeId: string): Promise<boolean> {
    const transaction = await EmployeeModel.sequelize?.transaction();
    try {
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.deleteEmployee]-Deleting employee with ID: ${employeeId}`,
      );
      if (!transaction) {
        throw new Error('Transaction could not be created');
      }
      const employee = await EmployeeModel.findOne({
        where: {
          id: employeeId,
          is_deleted: false,
        },
        transaction,
      });
      if (!employee) {
        logger.warn(
          `[repositories/employee.repository]-[EmployeeRepository.deleteEmployee]-Employee not found with ID: ${employeeId}`,
        );
        throw new Error('Employee not found');
      }
      await employee.update({ is_deleted: true }, { transaction });
      await transaction.commit();
      logger.info(
        `[repositories/employee.repository]-[EmployeeRepository.deleteEmployee]-Employee deleted successfully with ID: ${employeeId}`,
      );
      return true;
    } catch (error) {
      logger.error(
        `[repositories/employee.repository]-[EmployeeRepository.deleteEmployee]-Error: ${error}`,
      );
      if (transaction) {
        await transaction.rollback();
      }
      throw new Error('Error deleting employee');
    }
  }

  async getEmployeeScanningDetails(
    employeeId: string,
    period: string = 'none',
  ): Promise<{
    employee: {
      full_name: string;
      employee_number: string;
      time_to_food: string;
    };
    data: Array<{
      date: string;
      meal_opted: string;
      status: string;
      scanner_status: string;
    }>;
  } | null> {
    try {
      //const currentDateStr = moment().subtract(1, 'days').format('YYYY-MM-DD');

      // Always fetch employee details, even if no scan/opt data exists
      const query = getEmployeeAbsentCountQuery(period);
      const results = await EmployeeModel.sequelize?.query<any>(query, {
        replacements: {
          employeeId,
        },
        type: QueryTypes.SELECT,
      });

      const { full_name, employee_number, time_to_food } = results
        ? results[0]
        : { full_name: '', employee_number: '', time_to_food: '' };

      if (
        !results ||
        results.length === 0 ||
        results.every(r => r.date === null)
      ) {
        logger.info('No data is available for this employee');
        return {
          employee: { full_name, employee_number, time_to_food },
          data: [],
        };
      }
      if (results.every(r => r.date === null)) {
        logger.info('No data is available for this employee');
        return {
          employee: { full_name, employee_number, time_to_food },
          data: [],
        };
      }

      return {
        employee: { full_name, employee_number, time_to_food },
        data: results.map(({ date, meal_opted, status, scanner_status }) => ({
          date,
          meal_opted,
          status,
          scanner_status,
        })),
      };
    } catch (error) {
      logger.error(
        `[EmployeeRepository.getEmployeeScanningDetails] Error: ${error}`,
      );
      throw new Error('Error fetching employee scanning details');
    }
  }
}

export default EmployeeRepository;
