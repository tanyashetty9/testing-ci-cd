import { QueryTypes } from 'sequelize';
import { UserModel } from '../models/index.model';
import { sequelize } from '../config/postgres.config';
import { logger } from '../utils/logger.util';
import { AbsenteeEmployCount } from '../types/queries/email.query.type';
import { CountedEmployee } from '../types/custom.interface';

class EmailRepository {
  async getAbsentEmployeesWithHighCount(
    flag: string,
  ): Promise<CountedEmployee[]> {
    try {
      const query = AbsenteeEmployCount(flag);
      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        raw: true,
      });
      const resultArray: CountedEmployee[] = results as CountedEmployee[];
      if (resultArray.length === 0) {
        logger.info(
          `[/src/repositories/email.repository.ts]-[getAbsentEmployeesWithHighCount]-No employees found with high absent count`,
        );
        return [];
      }
      logger.info(
        `[/src/repositories/email.repository.ts]-[getAbsentEmployeesWithHighCount]-Successfully fetched employees with high absent count`,
      );
      return resultArray;
    } catch (error) {
      logger.error(
        `[/src/repositories/email.repository.ts]-[getAbsentEmployeesWithHighCount]-Error fetching employees with high absent count: ${(error as Error).message}`,
      );
      throw new Error('Database query failed');
    }
  }

  async incrementWarningCounter(
    user_id: string,
    absent_warning_counter: number,
  ): Promise<void> {
    try {
      if (absent_warning_counter <= 3) {
        await UserModel.update(
          { absent_warning_counter: absent_warning_counter },
          { where: { id: user_id } },
        );
        logger.info(
          `[/src/repositories/email.repository.ts]-[incrementWarningCounter]-Successfully incremented warning counter for user_id: ${user_id}`,
        );
      } else {
        logger.info(
          `[/src/repositories/email.repository.ts]-[incrementWarningCounter]-Warning counter for user_id: ${user_id} has reached the limit. Disabling user.`,
        );
        await UserModel.update(
          { is_deleted: true },
          { where: { id: user_id } },
        );
      }
      logger.info(
        `[/src/repositories/email.repository.ts]-[incrementWarningCounter]-Warning counter updated successfully for user_id: ${user_id}`,
      );
    } catch (error) {
      logger.error(
        `[/src/repositories/email.repository.ts]-[incrementWarningCounter]-Error incrementing warning counter: ${(error as Error).message}`,
      );
      throw new Error('Database update failed');
    }
  }
}

export default EmailRepository;
