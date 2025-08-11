import moment, { now } from 'moment';
import QRMasterModel from '../models/qrMaster.model';
import { logger } from '../utils/logger.util';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/postgres.config';
import UserModel from '../models/user.model';
import UserOptingPivotModel from '../models/userOptingPivot.model';
import {
  countOfAbesenteeAndAvailed,
  dailyOptOutTemp,
  detailedMealQuery,
  mealOptedQuery,
  weeklyAndMonthlyConsumedAbsentee,
  weeklyAndMonthlyConsumedAbsenteePagination,
  weeklyAndMonthlyPermanent,
  weeklyAndMonthlyPermanentPagination,
  weeklyAndMonthlyTemporary,
  weeklyAndMonthlyTemporaryPagination,
} from '../types/queries/qr.query.type';

class QRRepository {
  async insertQrCodeData(
    user_id: string[],
    date_of_use: Date,
    qr_opt_status: string,
  ): Promise<boolean> {
    try {
      logger.info(
        `[repositories/qr.repository]-[insertQrCodeData]-Inserting QR code data for user_id: ${user_id}`,
      );
      logger.info(
        `[repositories/qr.repository]-[insertQrCodeData]-Checking existing QR code data for user_id: ${user_id}`,
      );
      // const existingQrData = await QRMasterModel.findOne({
      //   where: {
      //     user_id: {
      //       [Op.in]: user_id,
      //     },
      //     created_at: {
      //       [Op.gte]: moment().subtract(1, 'days').toDate(),
      //       [Op.lt]: moment().toDate(),
      //     },
      //   },
      // });
      // if (existingQrData) {
      //   logger.info(
      //     `[repositories/qr.repository]-[insertQrCodeData]-QR code data already exists for user_id: ${user_id}`,
      //   );
      //   return false;
      // }
      logger.info(
        `[repositories/qr.repository]-[insertQrCodeData]-Inserting new QR code data for user_id: ${user_id}`,
      );
      const qrData = await QRMasterModel.bulkCreate(
        user_id.map(id => ({
          user_id: id,
          date_of_use: date_of_use,
          qr_opt_status: qr_opt_status,
        })),
      );
      logger.info(
        `[repositories/qr.repository]-[insertQrCodeData]-QR code data inserted successfully: ${qrData}`,
      );
      return true;
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[insertQrCodeData]-Error in inserting QR code data: ${error}`,
      );
      throw new Error('Error in inserting QR code data');
    }
  }

  async getQrCodeData(user_id: string): Promise<any> {
    try {
      const query = `
        SELECT 
          qr.id,
          qr.user_id,
          e.time_to_food,
          qr.created_at
        FROM qr_masters qr
        JOIN users u ON qr.user_id = u.id
        JOIN employees e ON u.employee_id = e.id
        WHERE qr.user_id = :user_id
          AND qr.is_scanned = false
          AND qr.created_at >= NOW() - INTERVAL '1 day'
          AND qr.created_at < NOW()
          AND u.is_active = true
          AND qr.is_active = true
          AND u.opt_status NOT IN ('opt-out-temp', 'opt-out-perm')
      `;
      const qrData = await QRMasterModel.sequelize?.query<any>(query, {
        replacements: { user_id },
        type: QueryTypes.SELECT,
      });

      if (!qrData || qrData.length === 0) {
        logger.info(
          `[repositories/qr.repository]-[getQrCodeData]-No QR code data found for user_id: ${user_id}`,
        );
        return null;
      }
      const [record] = qrData;
      if (
        moment().format('YYYY-MM-DD') !==
        moment(record.created_at).format('YYYY-MM-DD')
      ) {
        logger.error(
          `[repositories/qr.repository]-[getQrCodeData]-QR code has expired for user_id: ${user_id}`,
        );
        throw new Error('QR code has expired');
      }

      logger.info(
        `[repositories/qr.repository]-[getQrCodeData]-QR code data retrieved successfully: ${JSON.stringify(
          qrData,
        )}`,
      );
      return qrData[0];
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getQrCodeData]-Error in getting QR code data: ${error}`,
      );
      throw new Error('Error in getting QR code data');
    }
  }

  async updateQrCodeData(qr_id: string, user_id: string): Promise<string> {
    const transaction = await sequelize?.transaction();
    try {
      const qrData = await QRMasterModel.findOne({
        where: {
          id: qr_id,
          is_scanned: false,
          created_at: {
            [Op.gte]: moment().subtract(1, 'days').toDate(),
            [Op.lt]: moment().toDate(),
          },
        },
        transaction,
      });
      if (!qrData) {
        logger.info(
          `[repositories/qr.repository]-[updateQrCodeData]-No QR code data found for qr_id: ${qr_id}`,
        );
        return 'Failed: No QR code data found';
      }
      if ((qrData as any).user_id !== user_id) {
        logger.info(
          `[repositories/qr.repository]-[updateQrCodeData]-QR code data does not belong to user_id: ${user_id}`,
        );
        return 'Failed: QR code data does not belong to user';
      }
      if ((qrData as any).is_scanned) {
        logger.info(
          `[repositories/qr.repository]-[updateQrCodeData]-QR code data already scanned for qr_id: ${qr_id}`,
        );
        return 'Failed: QR code data already scanned';
      }
      if ((qrData as any).created_at < moment().subtract(1, 'days').toDate()) {
        logger.info(
          `[repositories/qr.repository]-[updateQrCodeData]-QR code data expired for qr_id: ${qr_id}`,
        );
        return 'Failed: QR code data expired';
      }
      await QRMasterModel.update(
        {
          is_active: false,
          is_scanned: true,
        },
        {
          where: {
            id: qr_id,
          },
          transaction,
        },
      );
      await transaction?.commit();
      logger.info(
        `[repositories/qr.repository]-[updateQrCodeData]-QR code data updated successfully for qr_id: ${qr_id}`,
      );
      return 'Success';
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[updateQrCodeData]-Error in updating QR code data: ${error}`,
      );
      throw new Error('Error in updating QR code data');
    }
  }

  async getPivotAvailableData(user_id: string): Promise<Object | null> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getPivotAvailableData]-Getting pivot available data for user_id: ${user_id}`,
      );
      const query = `
        SELECT 
	        DATE(opt.opt_out_time_to),
	        u.id
        FROM 
	        user_opting_pivots opt
        JOIN users u
	        ON u.id = opt.user_id
        WHERE u.id = :user_id
          AND u.opt_status = 'opt-out-perm'
          AND opt.opt_out_pivot_status = 'opt-out-permanently'
          AND DATE(opt.opt_out_time_to) >= DATE(NOW())
        ORDER BY opt.created_at DESC
        LIMIT 1
      `;
      const pivotData = await sequelize?.query(query, {
        replacements: { user_id },
        type: QueryTypes.SELECT,
      });

      if (!pivotData || pivotData.length === 0) {
        logger.info(
          `[repositories/qr.repository]-[getPivotAvailableData]-No pivot available data found for user_id: ${user_id}`,
        );
        return null;
      }
      logger.info(
        `[repositories/qr.repository]-[getPivotAvailableData]-Pivot available data retrieved successfully: ${JSON.stringify(
          pivotData,
        )}`,
      );
      return pivotData[0] || null;
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getPivotAvailableData]-Error in getting pivot available data: ${error}`,
      );
      throw new Error('Error in getting pivot available data');
    }
  }

  async updateQrDataByOptOutDate() {
    try {
      const today = moment();
      let targetDate: string;
      if (today.isoWeekday() === 1) {
        targetDate = today.subtract(3, 'days').format('YYYY-MM-DD');
        logger.info(
          `[repositories/qr.repository]-[updateQrDataByOptOutDate]-Today is Monday. Updating QR code data for Friday: ${targetDate}`,
        );
      } else {
        targetDate = today.subtract(1, 'days').format('YYYY-MM-DD');
        logger.info(
          `[repositories/qr.repository]-[updateQrDataByOptOutDate]-Updating QR code data for date: ${targetDate}`,
        );
      }

      const yesterdaysData = await QRMasterModel.update(
        {
          is_active: false,
        },
        {
          where: {
            created_at: {
              [Op.gte]: moment(targetDate).startOf('day').toDate(),
              // [Op.lt]: moment(targetDate).endOf('day').toDate(),
            },
          },
        },
      );
      if (yesterdaysData) {
        logger.info(
          `[repositories/qr.repository]-[updateQrDataByOptOutDate]-QR code data updated successfully for date: ${targetDate}`,
        );
      } else {
        logger.info(
          `[repositories/qr.repository]-[updateQrDataByOptOutDate]-No QR code data found for date: ${targetDate}`,
        );
      }
      return yesterdaysData;
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[updateQrDataByOptOutDate]-Error in getting QR code data by opt-out date: ${error}`,
      );
      throw new Error('Error in getting QR code data by opt-out date');
    }
  }

  async getOptDataByDate(mealNumber: number) {
    try {
      const query = `
      SELECT
      u.id AS user_id,
      opt.id AS opt_id,
      opt.opt_out_pivot_status,
      opt.opt_out_time_from,
      opt.opt_out_time_to,
      opt.created_at,
      opt.meal_opted_out,
      e.time_to_food
    FROM user_opting_pivots opt
    JOIN users u ON opt.user_id = u.id
    LEFT JOIN employees e ON e.id = u.employee_id
    WHERE opt.opt_out_pivot_status = 'opt-out-temporarily'
    AND opt.meal_opted_out  IN ('0', :mealNumber) 
    AND u.is_active = true
    AND u.opt_status NOT IN ('opt-out-perm')
    AND NOT EXISTS (
      SELECT 1
      FROM user_opting_pivots latest
      WHERE latest.user_id = opt.user_id
        AND latest.created_at = (
          SELECT MAX(inner_opt.created_at)
          FROM user_opting_pivots inner_opt
          WHERE inner_opt.user_id = opt.user_id
        )
        AND latest.opt_out_pivot_status = 'opt-out-permanently'
    )
    ORDER BY opt.opt_out_time_from ASC
    `;

      const optDataRaw = await sequelize?.query(query, {
        type: QueryTypes.SELECT,
        replacements: {
          mealNumber: mealNumber,
        },
      });

      // Filter for records where opt_out_time_from or opt_out_time_to is today (YYYY-MM-DD)
      const today = moment().format('YYYY-MM-DD');
      const optData = (optDataRaw || [])
        .filter((row: any) => {
          const fromDate = row.opt_out_time_from
            ? moment(row.opt_out_time_from).format('YYYY-MM-DD')
            : null;
          const toDate = row.opt_out_time_to
            ? moment(row.opt_out_time_to).format('YYYY-MM-DD')
            : null;
          return fromDate === today || toDate === today;
        })
        .map((row: any) => ({
          ...row,
          opt_out_time_from: row.opt_out_time_from
            ? moment(row.opt_out_time_from).format('YYYY-MM-DD')
            : null,
          opt_out_time_to: row.opt_out_time_to
            ? moment(row.opt_out_time_to).format('YYYY-MM-DD')
            : null,
        }));
      logger.warn(
        `[repositories/qr.repository]-[getOptDataByDate]-Fetching opt data for date: ${moment().format('YYYY-MM-DD')} ${JSON.stringify(optData, null, 2)}`,
      );

      if (!optData || optData.length === 0) {
        logger.info(
          `[repositories/qr.repository]-[getOptDataByDate]-No opt data found for date: ${moment().format('YYYY-MM-DD')}`,
        );
        return null;
      }

      logger.info(
        `[repositories/qr.repository]-[getOptDataByDate]-Opt data retrieved successfully: ${JSON.stringify(optData)}`,
      );

      return optData;
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getOptDataByDate]-Error in getting opt data by date: ${error}`,
      );
      throw new Error('Error in getting opt data by date');
    }
  }

  async updateOptStatus(
    user_id: string,
    opt_status: string,
    opt_id: string,
  ): Promise<string> {
    const transaction = await sequelize?.transaction();
    try {
      const userData = await UserModel.findOne({
        where: {
          id: user_id,
          is_active: true,
        },
        transaction,
      });
      logger.info(
        `[repositories/qr.repository]-[updateOptStatus]-Updating opt status for user_id: ${user_id}`,
      );
      if (!userData) {
        logger.info(
          `[repositories/qr.repository]-[updateOptStatus]-No user data found for user_id: ${user_id}`,
        );
        return 'Failed: No user data found';
      }
      if (opt_status === 'opt-in') {
        logger.info(
          `[repositories/qr.repository]-[updateOptStatus]-Updating opt status to opt-out-temp for user_id: ${user_id}`,
        );
        const optUpdated = await UserOptingPivotModel.update(
          {
            is_active: false,
          },
          {
            where: {
              id: opt_id,
            },
            transaction,
          },
        );
        logger.info(
          `[repositories/qr.repository]-[updateOptStatus]-Opt status updated to opt-out-temp for user_id: ${user_id}`,
        );
        if (!optUpdated) {
          logger.info(
            `[repositories/qr.repository]-[updateOptStatus]-Failed to update opt status for user_id: ${user_id}`,
          );
          return 'Failed: Opt status update failed';
        }
      }

      // if (userData.get('opt_status') === opt_status) {
      //   logger.info(
      //     `[repositories/qr.repository]-[updateOptStatus]-Opt status already set to ${opt_status} for user_id: ${user_id}`,
      //   );
      // }

      const isUpdated = await UserModel.update(
        {
          opt_status: opt_status,
        },
        {
          where: {
            id: user_id,
          },
          transaction,
        },
      );
      if (isUpdated) {
        logger.info(
          `[repositories/qr.repository]-[updateOptStatus]-Opt status updated successfully for user_id: ${user_id}`,
        );
        await transaction?.commit();
        return 'Success';
      } else {
        logger.info(
          `[repositories/qr.repository]-[updateOptStatus]-Failed to update opt status for user_id: ${user_id}`,
        );
        return 'Failed: Opt status update failed';
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[updateOptStatus]-Error in updating opt status: ${error}`,
      );
      await transaction?.rollback();
      throw new Error('Error in updating opt status');
    }
  }

  async optLunchDinner(): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[optLunchDinner]-Fetching users for lunch and dinner opt-in`,
      );
      const query = `UPDATE users u
      SET opt_status = 'opt-in'
      FROM employees e
      WHERE u.employee_id = e.id
      AND u.opt_status != 'opt-out-perm'
        AND u.is_active = true
        AND e.time_to_food = 'lunch-dinner';`;
      const users = await sequelize.query(query, {
        type: QueryTypes.UPDATE,
      });
      logger.info(
        `[repositories/qr.repository]-[optLunchDinner]-Udated users for lunch and dinner opt-in: ${JSON.stringify(
          users,
        )}`,
      );
      return 'Success';
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[optLunchDinner]-Error in fetching users for lunch and dinner opt-in: ${error}`,
      );
      throw new Error('Error in fetching users for lunch and dinner opt-in');
    }
  }

  async getDailyCount(): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getDailyCount]-Fetching meal opted data`,
      );
      let query_date;
      if (moment().isBefore(moment().hour(11).minute(59).second(0))) {
        query_date = moment().subtract(1, 'day').format('YYYY-MM-DD');
      } else {
        query_date = moment().format('YYYY-MM-DD');
      }

      const mealOpted = await mealOptedQuery();
      const [meal_required] = await sequelize.query(mealOpted, {
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/qr.repository]-[getDailyCount]-Fetching meal availed data`,
      );

      const absentee = await countOfAbesenteeAndAvailed('absentee');
      const [absentee_count] = await sequelize.query(absentee, {
        type: QueryTypes.SELECT,
        replacements: {
          query_date: query_date,
        },
      });
      logger.info(
        `[repositories/qr.repository]-[getDailyCount]-Fetching absentee data`,
      );

      const availed = await countOfAbesenteeAndAvailed('availed');
      const [availed_food_count] = await sequelize.query(availed, {
        type: QueryTypes.SELECT,
        replacements: {
          query_date: query_date,
        },
      });

      logger.info(
        `[repositories/qr.repository]-[getDailyCount]-Fetched opt out temporary data successfully`,
      );

      const tempOptOutQuery = await countOfAbesenteeAndAvailed('optOutTemp');
      const [tempOptOut] = await sequelize.query(tempOptOutQuery, {
        type: QueryTypes.SELECT,
      });

      logger.info(
        `[repositories/qr.repository]-[getDailyCount]-Fetched daily meal data successfully`,
      );

      return {
        meal_required,
        absentee_count,
        availed_food_count,
        tempOptOut,
      };
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getDailyCount]-Error in getting daily meal data: ${error}`,
      );
    }
  }

  async getWeeklyCount(): Promise<{
    food_consumed: number;
    absentees: number;
    total_permanent_opted_out_users: number;
    avg_temp_opted_out_days_count: number;
  }> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getWeeklyCount]-Fetching weekly meal count`,
      );

      const [consumedAbsentQuery, permanentQuery, temporaryQuery] =
        await Promise.all([
          weeklyAndMonthlyConsumedAbsentee(),
          weeklyAndMonthlyPermanent(),
          weeklyAndMonthlyTemporary(),
        ]);

      const start_date = moment().subtract(7, 'days').format('YYYY-MM-DD');
      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const replacements = {
        start_date: start_date,
        yesterday: yesterday,
      };
      const [consumedData, absentData, permanentData, temporaryData] =
        await Promise.all([
          sequelize.query(consumedAbsentQuery, {
            replacements: {
              scan_status: true,
              start_date: start_date,
              yesterday: yesterday,
            },
            type: QueryTypes.SELECT,
          }),
          sequelize.query(consumedAbsentQuery, {
            replacements: {
              scan_status: false,
              start_date: start_date,
              yesterday: yesterday,
            },
            type: QueryTypes.SELECT,
          }),
          sequelize.query(permanentQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
          }),
          sequelize.query(temporaryQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
          }),
        ]);

      const distinctAbsentees = new Set(
        (absentData as Array<{ employee_number: string }>).map(
          row => row.employee_number,
        ),
      );

      const distinctTempUsers = new Set(
        (temporaryData as Array<{ employee_number: string }>).map(
          row => row.employee_number,
        ),
      );

      logger.info(
        `[repositories/qr.repository]-[getWeeklyCount]-Fetched weekly meal data successfully`,
      );
      return {
        food_consumed: Math.round(consumedData.length / 5),
        absentees: distinctAbsentees.size,
        total_permanent_opted_out_users: permanentData.length,
        avg_temp_opted_out_days_count: distinctTempUsers.size,
      };
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getWeeklyCount]-Error fetching stats: ${error}`,
      );
      throw error;
    }
  }

  async weeklyDownload(): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Fetching meal data for download`,
      );

      const start_date = moment()
        .startOf('isoWeek')
        .subtract(6, 'days')
        .format('YYYY-MM-DD');

      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      logger.warn(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Start date: ${start_date}, Yesterday: ${yesterday}`,
      );
      const consumedAbsentee = await weeklyAndMonthlyConsumedAbsentee();

      const weekly_consumed = await sequelize.query(consumedAbsentee, {
        replacements: {
          start_date: start_date,
          yesterday: yesterday,
          scan_status: true,
        },
        type: QueryTypes.SELECT,
      });

      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Fetched weekly consumed data successfully`,
      );

      const weekly_absentee = await sequelize.query(consumedAbsentee, {
        replacements: {
          start_date: start_date,
          yesterday: yesterday,
          scan_status: false,
        },
        type: QueryTypes.SELECT,
      });

      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Fetched weekly absentee data successfully`,
      );

      const weekly_temp = await weeklyAndMonthlyTemporary();
      const weekly_temp_data = await sequelize.query(weekly_temp, {
        replacements: {
          start_date: start_date,
          yesterday: yesterday,
        },
        type: QueryTypes.SELECT,
      });

      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Filtered & formatted temporary data: ${JSON.stringify(weekly_temp_data)}`,
      );

      const weekly_permanent = await weeklyAndMonthlyPermanent();
      const weekly_permanent_data = await sequelize.query(weekly_permanent, {
        replacements: {
          start_date: start_date,
          yesterday: yesterday,
        },
        type: QueryTypes.SELECT,
      });

      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Fetched weekly permanent data successfully`,
      );

      return {
        weekly_consumed,
        weekly_absentee,
        weekly_temp_data,
        weekly_permanent_data,
      };
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Error in getting meal data for download: ${error}`,
      );
      throw new Error('Error in getting meal data for download');
    }
  }

  async weeklyPagination(flag: string, page: number): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[weeklyPagination]-Fetching weekly meal data for flag: ${flag}`,
      );
      const limit = 15;
      const offset = (page - 1) * limit;
      const result =
        flag === 'consumed'
          ? 'consumed'
          : flag === 'absent'
            ? 'absent'
            : flag === 'opt-out-temp'
              ? 'temp'
              : flag === 'opt-out-perm'
                ? 'permanent'
                : null;

      const start_date = moment()
        .startOf('isoWeek')
        .subtract(6, 'days')
        .format('YYYY-MM-DD');

      const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      logger.info(
        `[repositories/qr.repository]-[weeklyMonthlyDownload]-Start date: ${start_date}, Yesterday: ${yesterday}`,
      );

      switch (result) {
        case 'consumed': {
          const consumed = await weeklyAndMonthlyConsumedAbsenteePagination();

          const weekly_consumed = await sequelize.query(consumed, {
            replacements: {
              start_date: start_date,
              yesterday: yesterday,
              scan_status: true,
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[weeklyPagination]-Fetched weekly consumed data successfully`,
          );
          return weekly_consumed;
        }
        case 'absent': {
          const absentee = await weeklyAndMonthlyConsumedAbsenteePagination();
          const weekly_absentee = await sequelize.query(absentee, {
            replacements: {
              start_date: start_date,
              yesterday: yesterday,
              scan_status: false,
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[weeklyPagination]-Fetched weekly absentee data successfully`,
          );
          return weekly_absentee;
        }
        case 'temp': {
          const weekly_temp = await weeklyAndMonthlyTemporaryPagination();
          const weekly_temp_data = await sequelize.query(weekly_temp, {
            replacements: {
              start_date: start_date,
              yesterday: yesterday,
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[weeklyPagination]-Fetched weekly temporary data successfully`,
          );
          return weekly_temp_data;
        }
        case 'permanent': {
          const weekly_permanent = await weeklyAndMonthlyPermanentPagination();
          const weekly_permanent_data = await sequelize.query(
            weekly_permanent,
            {
              replacements: {
                start_date: start_date,
                yesterday: yesterday,
                limit: limit,
                offset: offset,
              },
              type: QueryTypes.SELECT,
            },
          );
          logger.info(
            `[repositories/qr.repository]-[weeklyPagination]-Fetched weekly permanent data successfully`,
          );
          return weekly_permanent_data;
        }
        default:
          logger.info(
            `[repositories/qr.repository]-[weeklyPagination]-Invalid flag: ${flag}`,
          );
          return `Invalid flag`;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[weeklyPagination]-Error in getting weekly meal data: ${error}`,
      );
      throw new Error('Error in getting weekly meal data');
    }
  }

  async monthlyPagination(flag: string, page: number): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[monthlyPagination]-Fetching monthly meal data for flag: ${flag}`,
      );
      const limit = 15;
      const offset = (page - 1) * limit;
      const result =
        flag === 'consumed'
          ? 'consumed'
          : flag === 'absent'
            ? 'absent'
            : flag === 'opt-out-temp'
              ? 'temp'
              : flag === 'opt-out-perm'
                ? 'permanent'
                : null;

      const yesterday = moment().subtract(1, 'days').startOf('day');
      let count = 0;
      let start_date = moment(yesterday); // clone of yesterday

      while (count < 22) {
        start_date = start_date.subtract(1, 'days');
        const day = start_date.isoWeekday(); // 1 (Mon) to 7 (Sun)
        if (day < 6) {
          // Monday to Friday
          count++;
        }
      }

      switch (result) {
        case 'consumed': {
          const consumed = await weeklyAndMonthlyConsumedAbsenteePagination();
          const monthly_consumed = await sequelize.query(consumed, {
            replacements: {
              start_date: start_date.format('YYYY-MM-DD'),
              yesterday: yesterday.format('YYYY-MM-DD'),
              scan_status: true,
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[monthlyPagination]-Fetched monthly consumed data successfully`,
          );
          return monthly_consumed;
        }
        case 'absent': {
          const absentee = await weeklyAndMonthlyConsumedAbsenteePagination();
          const monthly_absentee = await sequelize.query(absentee, {
            replacements: {
              start_date: start_date.format('YYYY-MM-DD'),
              yesterday: yesterday.format('YYYY-MM-DD'),
              scan_status: false,
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[monthlyPagination]-Fetched monthly absentee data successfully`,
          );
          return monthly_absentee;
        }
        case 'temp': {
          const monthly_temp = await weeklyAndMonthlyTemporaryPagination();
          const monthly_temp_data = await sequelize.query(monthly_temp, {
            replacements: {
              start_date: start_date.format('YYYY-MM-DD'),
              yesterday: yesterday.format('YYYY-MM-DD'),
              limit: limit,
              offset: offset,
            },
            type: QueryTypes.SELECT,
          });
          logger.info(
            `[repositories/qr.repository]-[monthlyPagination]-Fetched monthly temporary data successfully`,
          );
          return monthly_temp_data;
        }
        case 'permanent': {
          const monthly_permanent = await weeklyAndMonthlyPermanentPagination();
          const monthly_permanent_data = await sequelize.query(
            monthly_permanent,
            {
              replacements: {
                start_date: start_date.format('YYYY-MM-DD'),
                yesterday: yesterday.format('YYYY-MM-DD'),
                limit: limit,
                offset: offset,
              },
              type: QueryTypes.SELECT,
            },
          );
          logger.info(
            `[repositories/qr.repository]-[monthlyPagination]-Fetched monthly permanent data successfully`,
          );
          return monthly_permanent_data;
        }
        default:
          logger.info(
            `[repositories/qr.repository]-[monthlyPagination]-Invalid flag: ${flag}`,
          );
          return `Invalid flag`;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[monthlyPagination]-Error in getting monthly meal data: ${error}`,
      );
      throw new Error('Error in getting monthly meal data');
    }
  }

  async monthlyDownload(): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[monthlyDownload]-Fetching meal data for download`,
      );

      const yesterday = moment().subtract(1, 'days').startOf('day');
      let count = 0;
      let start_date = moment(yesterday); // clone of yesterday

      while (count < 22) {
        start_date = start_date.subtract(1, 'days');
        const day = start_date.isoWeekday(); // 1 (Mon) to 7 (Sun)
        if (day < 6) {
          // Monday to Friday
          count++;
        }
      }
      const consumedAbsentee = await weeklyAndMonthlyConsumedAbsentee();

      const monthly_consumed = await sequelize.query(consumedAbsentee, {
        replacements: {
          start_date: start_date.format('YYYY-MM-DD'),
          yesterday: yesterday.format('YYYY-MM-DD'),
          scan_status: true,
        },
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/qr.repository]-[monthlyDownload]-Fetched monthly consumed data successfully`,
      );

      const monthly_absentee = await sequelize.query(consumedAbsentee, {
        replacements: {
          start_date: start_date.format('YYYY-MM-DD'),
          yesterday: yesterday.format('YYYY-MM-DD'),
          scan_status: false,
        },
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/qr.repository]-[monthlyDownload]-Fetched monthly absentee data successfully`,
      );

      const monthly_temp = await weeklyAndMonthlyTemporary();
      const monthly_temp_data = await sequelize.query(monthly_temp, {
        replacements: {
          start_date: start_date.format('YYYY-MM-DD'),
          yesterday: yesterday.format('YYYY-MM-DD'),
        },
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/qr.repository]-[monthlyDownload]-Fetched monthly temporary data successfully`,
      );

      const monthly_permanent = await weeklyAndMonthlyPermanent();
      const monthly_permanent_data = await sequelize.query(monthly_permanent, {
        replacements: {
          start_date: start_date.format('YYYY-MM-DD'),
          yesterday: yesterday.format('YYYY-MM-DD'),
        },
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/qr.repository]-[monthlyDownload]-Fetched monthly permanent data successfully`,
      );

      return {
        monthly_consumed,
        monthly_absentee,
        monthly_temp_data,
        monthly_permanent_data,
      };
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[monthlyDownload]-Error in getting meal data for download: ${error}`,
      );
      throw new Error('Error in getting meal data for download');
    }
  }

  async getMonthlyCount(): Promise<{
    food_consumed: number;
    absentees: number;
    total_permanent_opted_out_users: number;
    avg_temp_opted_out_days_count: number;
  }> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getMonthlyCount]-Fetching monthly meal count`,
      );

      const yesterday = moment().subtract(1, 'days').startOf('day');
      let count = 0;
      let start_date = moment(yesterday); // Clone of yesterday

      // Get last 22 working days (Mon-Fri)
      while (count < 22) {
        start_date = start_date.subtract(1, 'days');
        const day = start_date.isoWeekday(); // 1 (Mon) to 7 (Sun)
        if (day < 6) {
          count++;
        }
      }

      const [consumedAbsentQuery, permanentQuery, temporaryQuery] =
        await Promise.all([
          weeklyAndMonthlyConsumedAbsentee(),
          weeklyAndMonthlyPermanent(),
          weeklyAndMonthlyTemporary(),
        ]);

      const replacements = {
        scan_status: true,
        start_date: start_date.format('YYYY-MM-DD'),
        yesterday: yesterday.format('YYYY-MM-DD'),
      };

      const [consumedData, absentData, permanentData, temporaryData] =
        await Promise.all([
          sequelize.query(consumedAbsentQuery, {
            replacements: {
              scan_status: true,
              start_date: start_date.format('YYYY-MM-DD'),
              yesterday: yesterday.format('YYYY-MM-DD'),
            },
            type: QueryTypes.SELECT,
          }),
          sequelize.query(consumedAbsentQuery, {
            replacements: {
              scan_status: false,
              start_date: start_date.format('YYYY-MM-DD'),
              yesterday: yesterday.format('YYYY-MM-DD'),
            },
            type: QueryTypes.SELECT,
          }),
          sequelize.query(permanentQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
          }),
          sequelize.query(temporaryQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
          }),
        ]);

      const distinctAbsentees = new Set(
        (absentData as Array<{ employee_number: string }>).map(
          row => row.employee_number,
        ),
      );

      const distinctTempUsers = new Set(
        (temporaryData as Array<{ employee_number: string }>).map(
          row => row.employee_number,
        ),
      );

      logger.info(
        `[repositories/qr.repository]-[getMonthlyCount]-Fetched monthly meal data successfully`,
      );

      return {
        food_consumed: Math.round(consumedData.length / 22),
        absentees: distinctAbsentees.size,
        total_permanent_opted_out_users: permanentData.length,
        avg_temp_opted_out_days_count: distinctTempUsers.size,
      };
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getMonthlyCount]-Error fetching monthly meal count: ${error}`,
      );
      throw error;
    }
  }

  async getDetailedMealOptedSummary(time_to_food: string): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getDetailedMealOptedSummary]-Fetching mealOpted data`,
      );

      if (time_to_food === 'lunch') {
        const meal_opted = await detailedMealQuery('mealedOpted');
        const mealOptedResult = await sequelize.query(meal_opted, {
          replacements: {
            time_to_food: time_to_food,
            meal_out: '1',
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedMealOptedSummary]-Fetched mealOpted results for lunch successfully`,
        );
        return mealOptedResult;
      } else if (time_to_food === 'dinner') {
        const meal_opted = await detailedMealQuery('mealedOpted');
        const mealOptedResult = await sequelize.query(meal_opted, {
          replacements: {
            time_to_food: time_to_food,
            meal_out: '2',
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedMealOptedSummary]-Fetched mealOpted results for dinner successfully`,
        );
        return mealOptedResult;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getDetailedMealOptedSummary]-Error in getting mealOpted data: ${error}`,
      );
    }
  }

  async getDetailedAbsenteeSummary(time_to_food: string): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getDetailedAbsenteeSummary]-Fetching absentee data`,
      );

      let query_date;
      if (moment().isBefore(moment().hour(11).minute(59).second(0))) {
        query_date = moment().subtract(1, 'day').format('YYYY-MM-DD');
      } else {
        query_date = moment().format('YYYY-MM-DD');
      }

      if (time_to_food === 'lunch') {
        const absentee = await detailedMealQuery('absentee');
        const absenteeResult = await sequelize.query(absentee, {
          replacements: {
            time_to_food: time_to_food,
            query_date: query_date,
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedAbsenteeSummary]-Fetched absentee results for lunch successfully`,
        );
        return absenteeResult;
      } else if (time_to_food === 'dinner') {
        const absentee = await detailedMealQuery('absentee');
        const absenteeResult = await sequelize.query(absentee, {
          replacements: {
            time_to_food: time_to_food,
            query_date: query_date,
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedAbsenteeSummary]-Fetched absentee results for dinner successfully`,
        );
        return absenteeResult;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getDetailedAbsenteeSummary]-Error in getting absentee data: ${error}`,
      );
    }
  }

  async getDetailedAvailedSummary(time_to_food: string): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getDetailedAvailedSummary]-Fetching food availed data...`,
      );

      let query_date;
      if (moment().isBefore(moment().hour(11).minute(59).second(0))) {
        query_date = moment().subtract(1, 'day').format('YYYY-MM-DD');
      } else {
        query_date = moment().format('YYYY-MM-DD');
      }

      if (time_to_food === 'lunch') {
        const availed = await detailedMealQuery('availed');
        const availedResult = await sequelize.query(availed, {
          replacements: {
            time_to_food: time_to_food,
            query_date: query_date,
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedAvailedSummary]-Fetched food availed results for lunch successfully`,
        );
        return availedResult;
      } else if (time_to_food === 'dinner') {
        const availed = await detailedMealQuery('availed');
        const availedResult = await sequelize.query(availed, {
          replacements: {
            time_to_food: time_to_food,
            query_date: query_date,
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedAvailedSummary]-Fetched food availed results for dinner successfully`,
        );
        return availedResult;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getDetailedAvailedSummary]-Error in getting food availed data: ${error}`,
      );
    }
  }

  async getDetailedOptedOutSummary(time_to_food: string): Promise<any> {
    try {
      logger.info(
        `[repositories/qr.repository]-[getDetailedOptedOutSummary]-Fetching opted out data...`,
      );

      if (time_to_food === 'lunch') {
        const opted_out = await dailyOptOutTemp();
        const optedOutResult = await sequelize.query(opted_out, {
          replacements: {
            time_to_food: time_to_food,
            meal_opted_out: '1',
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedOptedOutSummary]-Fetched opted out results for lunch successfully`,
        );
        return optedOutResult;
      } else if (time_to_food === 'dinner') {
        const opted_out = await dailyOptOutTemp();
        const optedOutResult = await sequelize.query(opted_out, {
          replacements: {
            time_to_food: time_to_food,
            meal_opted_out: '2',
          },
          type: QueryTypes.SELECT,
        });

        logger.info(
          `[repositories/qr.repository]-[getDetailedOptedOutSummary]-Fetched opted out results for dinner successfully`,
        );
        return optedOutResult;
      }
    } catch (error) {
      logger.error(
        `[repositories/qr.repository]-[getDetailedOptedOutSummary]-Error in getting opted out data: ${error}`,
      );
    }
  }

  async updateWFHemployeesForQr(time_to_food: string): Promise<Object[]> {
    const transaction = await sequelize.transaction();

    try {
      const opt_in_query = `
        SELECT 
          u.id AS user_id,
          e.id AS employee_id,
          e.is_wfh,
          e.time_to_food,
          opt.opt_out_pivot_status,
          opt.opt_out_time_from AS opt_in_time_from,
          opt.opt_out_time_to AS opt_in_time_to
        FROM users u
        JOIN employees e ON u.employee_id = e.id
        LEFT JOIN user_opting_pivots opt ON u.id = opt.user_id
        WHERE e.is_wfh = true
          AND u.is_active = true
          AND u.opt_status IN ('opt-out-perm')
          AND (opt.opt_out_pivot_status IS NULL OR opt.opt_out_pivot_status = 'opt-in-temporarily')
          AND DATE(opt.opt_out_time_from) = DATE(NOW())
          AND e.time_to_food = :time_to_food
        ORDER BY u.id;
      `;

      const opt_out_query = `
        SELECT 
          u.id AS user_id,
          e.id AS employee_id,
          e.is_wfh,
          e.time_to_food,
          opt.opt_out_pivot_status,
          opt.opt_out_time_from AS opt_in_time_from,
          opt.opt_out_time_to AS opt_in_time_to
        FROM users u
        JOIN employees e ON u.employee_id = e.id
        LEFT JOIN user_opting_pivots opt ON u.id = opt.user_id
        WHERE e.is_wfh = true
          AND u.is_active = true
          AND u.opt_status NOT IN ('opt-out-perm')
          AND (opt.opt_out_pivot_status IS NULL OR opt.opt_out_pivot_status = 'opt-in-temporarily')
          AND DATE(opt.opt_out_time_to) = DATE(NOW())
          AND e.time_to_food = :time_to_food
        ORDER BY u.id;
      `;
      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr] - Fetching WFH employees for opt-out`,
      );
      const wfhEmployees_optOut = await sequelize?.query(opt_out_query, {
        type: QueryTypes.SELECT,
        replacements: { time_to_food: time_to_food },
      });
      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr]-Fetched WFH employees for opt-out successfully`,
      );

      const opt_out_users = wfhEmployees_optOut.map((user: any) => ({
        user_id: user.user_id,
        employee_id: user.employee_id,
        is_wfh: user.is_wfh,
        time_to_food: user.time_to_food,
        opt_out_pivot_status: user.opt_out_pivot_status,
        opt_in_time_from: user.opt_in_time_from,
        opt_in_time_to: user.opt_in_time_to,
      }));
      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr] - Mapped WFH employees for opt-out: ${JSON.stringify(opt_out_users)}`,
      );

      for (const user of opt_out_users) {
        logger.info(
          `[repositories/qr.repository]-[updateWFHemployeesForQr] - Updating user opt status to 'opt-out-perm' for user_id: ${user.user_id}`,
        );
        await UserModel.update(
          { opt_status: 'opt-out-perm' },
          {
            where: { id: user.user_id },
            transaction,
          },
        );
      }

      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr] - Fetching WFH employees for opt-in`,
      );
      const wfhEmployees_optIn = await sequelize.query(opt_in_query, {
        type: QueryTypes.SELECT,
        replacements: { time_to_food },
        transaction,
      });

      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr]-Fetched WFH employees for opt-in successfully`,
      );
      const opt_in_users = wfhEmployees_optIn.map((user: any) => ({
        user_id: user.user_id,
        employee_id: user.employee_id,
        is_wfh: user.is_wfh,
        time_to_food: user.time_to_food,
        opt_out_pivot_status: user.opt_out_pivot_status,
        opt_in_time_from: user.opt_in_time_from,
        opt_in_time_to: user.opt_in_time_to,
      }));

      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr] - Mapped WFH employees for opt-in: ${JSON.stringify(opt_in_users)}`,
      );

      for (const user of opt_in_users) {
        logger.info(
          `[repositories/qr.repository]-[updateWFHemployeesForQr] - Updating user opt status to 'opt-in' for user_id: ${user.user_id}`,
        );
        await UserModel.update(
          { opt_status: 'opt-in' },
          {
            where: { id: user.user_id },
            transaction,
          },
        );
      }

      await transaction.commit();
      logger.info(
        `[repositories/qr.repository]-[updateWFHemployeesForQr] - Transaction committed successfully`,
      );

      return [...opt_in_users, ...opt_out_users];
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.error(
        `[repositories/qr.repository]-[getWFHemployees]-Error in getting WFH employees: ${error}`,
      );
      throw new Error('Error in getting WFH employees');
    }
  }
}

export default QRRepository;
