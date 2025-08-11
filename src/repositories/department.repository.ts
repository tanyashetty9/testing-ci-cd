import { DepartmentModel } from '../models/index.model';
import { Department } from '../types/custom.interface';
import { logger } from '../utils/logger.util';

class DepartmentRepository {
  async createDepartment(departmentData: object) {
    logger.info(
      `[repositories/department.repository]-[DepartmentRepository.createDepartment]-Creating new department with data: ${JSON.stringify(departmentData)}`,
    );

    try {
      const newDepartment = await DepartmentModel.create({ ...departmentData });
      logger.info(
        `[repositories/department.repository]-[DepartmentRepository.createDepartment]-Department created successfully with ID: ${newDepartment.get('id')}`,
      );
      return newDepartment;
    } catch (error) {
      throw new Error(`Error creating department: ${(error as Error).message}`);
    }
  }

  async getAllDepartments() {
    logger.info(
      `[repositories/department.repository]-[DepartmentRepository.getAllDepartments]-Fetching all departments`,
    );
    try {
      const departments = await DepartmentModel.findAll();
      logger.info(
        `[repositories/department.repository]-[DepartmentRepository.getAllDepartments]-Fetched ${departments.length} departments successfully`,
      );

      return departments;
    } catch (error) {
      throw new Error(
        `Error fetching departments: ${(error as Error).message}`,
      );
    }
  }

  async getDepartmentById(departmentId: string) {
    logger.info(
      `[repositories/department.repository]-[DepartmentRepository.getDepartmentById]-Fetching department with ID: ${departmentId}`,
    );
    try {
      const department = await DepartmentModel.findByPk(departmentId);
      if (!department) {
        logger.warn(
          `[repositories/department.repository]-[DepartmentRepository.getDepartmentById]-Department with ID ${departmentId} not found`,
        );
        return null;
      }
      logger.info(
        `[repositories/department.repository]-[DepartmentRepository.getDepartmentById]-Fetched department successfully`,
      );
      return department;
    } catch (error) {
      throw new Error(`Error fetching department: ${(error as Error).message}`);
    }
  }

  async updateDepartment(
    departmentId: string,
    updateData: Partial<Department>,
  ) {
    logger.info(
      `[repositories/department.repository]-[DepartmentRepository.updateDepartment]-Updating department with ID: ${departmentId}`,
    );
    try {
      const [updatedRowsCount, updatedRows] = await DepartmentModel.update(
        updateData,
        {
          where: { id: departmentId },
          returning: true,
        },
      );
      if (updatedRowsCount === 0) {
        logger.warn(
          `[repositories/department.repository]-[DepartmentRepository.updateDepartment]-No department found with ID ${departmentId} to update`,
        );

        return null;
      }
      logger.info(
        `[repositories/department.repository]-[DepartmentRepository.updateDepartment]-Department updated successfully`,
      );
      return updatedRows[0];
    } catch (error) {
      throw new Error(`Error updating department: ${(error as Error).message}`);
    }
  }
}

export default DepartmentRepository;
