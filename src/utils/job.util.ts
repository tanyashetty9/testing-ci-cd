import { logger } from './logger.util';
import QRRepository from '../repositories/qr.repository';
import EmailRepository from '../repositories/email.repository';
import EmployeeRepository from '../repositories/employee.repository';
import moment from 'moment';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { sendmail, writeMailTemplate } from './mail.util';

const qrRepo = new QRRepository();
const emailRepo = new EmailRepository();
const employeeRepo = new EmployeeRepository();

//Helper Functions
const createExcelSheet = async (data: any) => {
  const employee_number = data?.employee?.employee_number || 'unknown';

  // Create temp folder
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  if (!data?.data || data.data.length === 0) {
    logger.warn(
      `[utils/job.util]-[createExcelSheet] - No data to write to Excel`,
    );
    return null;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Scan Details');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Meal Opted', key: 'meal_opted', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Scanner Status', key: 'scanner_status', width: 20 },
  ];

  for (const detail of data.data) {
    worksheet.addRow({
      date: moment(detail.date).format('YYYY-MM-DD'),
      meal_opted: detail.meal_opted,
      status: detail.status,
      scanner_status: detail.scanner_status,
    });
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  };

  const filePath = path.join(
    tempDir,
    `${employee_number}_${moment().format('YYYY-MM-DD_HH-mm-ss')}_scan_details.xlsx`,
  );

  try {
    logger.info(
      `[utils/job.util]-[createExcelSheet] - Writing Excel to: ${filePath}`,
    );
    await workbook.xlsx.writeFile(filePath);
    logger.info(
      `[utils/job.util]-[createExcelSheet] - File successfully written`,
    );
    return filePath;
  } catch (error) {
    logger.error(
      `[utils/job.util]-[createExcelSheet] - Error writing file: ${(error as Error).message}`,
    );
    return null;
  }
};

//Jobs
const updateInfoJob = async (
  mealNumber: number,
  time_to_food: string,
): Promise<boolean | undefined> => {
  try {
    logger.info(`[utils/job.util]-[updateInfoJob]-Starting updateInfoJob`);
    const yesterdaysData = await qrRepo.updateQrDataByOptOutDate();
    if (yesterdaysData) {
      logger.info(
        `[utils/job.util]-[updateInfoJob]-QR code data updated successfully for date: ${yesterdaysData}`,
      );
    } else {
      logger.info(
        `[utils/job.util]-[updateInfoJob]-No QR code data found for date: ${yesterdaysData}`,
      );
    }
    const wfhEmployees = await qrRepo.updateWFHemployeesForQr(time_to_food);
    if (wfhEmployees) {
      logger.info(
        `[utils/job.util]-[updateInfoJob]-WFH employees updated successfully for lunch: ${wfhEmployees}`,
      );
    } else {
      logger.info(
        `[utils/job.util]-[updateInfoJob]-No WFH employees found for lunch`,
      );
    }
    const lunchAndDinner = await qrRepo.optLunchDinner();
    if (lunchAndDinner === 'Success') {
      logger.info(
        `[utils/job.util]-[updateInfoJob]-Lunch and Dinner opt-in status updated successfully`,
      );
    }

    const qrData = await qrRepo.getOptDataByDate(mealNumber);
    if (!qrData) {
      logger.info(`[utils/job.util]-[updateInfoJob]-No QR code data found`);
      return false;
    }
    logger.warn(
      '[utils/job.util]-[updateInfoJob]-QR code data found: ' +
        JSON.stringify(qrData, null, 2),
    );
    for (const data of qrData) {
      const { user_id, opt_out_time_from, opt_out_time_to, opt_id } = data as {
        user_id: string;
        opt_out_time_from: Date;
        opt_out_time_to: Date;
        opt_id: string;
      };
      const currentDate = moment().format('YYYY-MM-DD');
      const optOutDateFrom = moment(opt_out_time_from).format('YYYY-MM-DD');
      const optOutDateTo = moment(opt_out_time_to).format('YYYY-MM-DD');
      logger.warn(
        `[utils/job.util]-[updateInfoJob]-Processing QR code data for user ID: ${user_id}, currentDate: ${currentDate}, optOutDateFrom: ${optOutDateFrom}, optOutDateTo: ${optOutDateTo}`,
      );
      if (currentDate === optOutDateFrom) {
        logger.info(
          `[utils/job.util]-[updateInfoJob]-QR code data found for user ID: ${user_id}`,
        );
        const updatedData = await qrRepo.updateOptStatus(
          user_id,
          'opt-out-temp',
          opt_id,
        );
        if (updatedData !== 'Success') {
          logger.error(
            `[utils/job.util]-[updateInfoJob]-Failed to update QR code data with message : ${updatedData} for user ID: ${user_id}`,
          );
          return false;
        }
      } else if (currentDate === optOutDateTo) {
        const updatedData = await qrRepo.updateOptStatus(
          user_id,
          'opt-in',
          opt_id,
        );
        if (updatedData !== 'Success') {
          logger.error(
            `[utils/job.util]-[updateInfoJob]-Failed to update QR code data with message : ${updatedData} for user ID: ${user_id}`,
          );
          return false;
        }
      } else {
        logger.info(
          `[utils/job.util]-[updateInfoJob]-No QR code data found for date: ${currentDate}`,
        );
        return false;
      }
      logger.info(
        `[utils/job.util]-[updateInfoJob]-QR code data updated successfully for user ID: ${user_id}`,
      );
    }
    logger.info(
      `[utils/job.util]-[updateInfoJob]-updateInfoJob completed successfully`,
    );
    return true;
  } catch (error) {
    logger.error(`[utils/job.util]-[updateInfoJob]-Error: ${error}`);
    return false;
  }
};

// Helper function handles parse time
const parseEnvTime = (time: string) => {
  try {
    logger.info(`[utils/job.util]-[parseEnvTime]-Parsing time: ${time}`);
    const [h, m, sMs] = time.split(':');
    const [s, ms] = sMs.split('.');
    logger.info(
      `[utils/job.util]-[parseEnvTime]-Parsed time - Hours: ${h}, Minutes: ${m}, Seconds: ${s}, Milliseconds: ${ms}`,
    );
    return moment().set({
      hour: parseInt(h),
      minute: parseInt(m),
      second: parseInt(s),
      millisecond: parseInt(ms),
    });
  } catch (error) {
    logger.error(
      `[utils/job.util]-[parseEnvTime]-Error parsing time: ${error}`,
    );
    throw new Error('Error parsing time');
  }
};

const warningMail = async (period: string = 'weekly') => {
  try {
    logger.info(`[utils/job.util]-[warningMail]-Starting warningMail job`);
    const employeeDataWithHighAbesentCountWeekly =
      await emailRepo.getAbsentEmployeesWithHighCount('weekly');
    logger.info(
      `[utils/job.util]-[warningMail]-Fetched ${employeeDataWithHighAbesentCountWeekly.length} employees with high absent count for weekly period`,
    );
    const employeeDataWithHighAbesentCountMonthly =
      await emailRepo.getAbsentEmployeesWithHighCount('monthly');
    logger.info(
      `[utils/job.util]-[warningMail]-Fetched ${employeeDataWithHighAbesentCountMonthly.length} employees with high absent count for monthly period`,
    );

    // Weekly warning emails and Remove the Access to Portal
    if (period === 'weekly') {
      for (const employee of employeeDataWithHighAbesentCountWeekly) {
        const {
          employee_id,
          user_id,
          email,
          full_name,
          absent_count,
          employee_number,
          absent_warning_counter,
          is_deleted,
        } = employee;
        logger.info(
          `[utils/job.util]-[warningMail]-Sending weekly warning email to: ${email}, Full Name: ${full_name}, Absent Count: ${absent_count}`,
        );
        if (absent_count && absent_count > 2) {
          const employeeScanedDetails =
            await employeeRepo.getEmployeeScanningDetails(
              employee_id,
              'weekly',
            );
          if (!employeeScanedDetails) {
            logger.warn(
              `[utils/job.util]-[warningMail]-No scanning details found for employee ID: ${employee_id}`,
            );
            continue;
          }
          if (is_deleted) {
            logger.warn(
              `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} is deleted, skipping email sending`,
            );
            continue;
          }
          if (absent_warning_counter && absent_warning_counter === 3) {
            logger.warn(
              `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} has already received 3 warnings, skipping email sending`,
            );
            continue;
          }
          logger.info(
            `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} has not received 3 warnings yet, proceeding with email sending`,
          );
          await emailRepo.incrementWarningCounter(
            user_id,
            (absent_warning_counter as number) + 1,
          );
          logger.info(
            `[utils/job.util]-[warningMail]-Warning counter incremented for user ID: ${user_id}`,
          );
          const filePath = await createExcelSheet(employeeScanedDetails);
          logger.info(
            `[utils/job.util]-[warningMail]-Excel file created at: ${filePath}`,
          );
          const htmlTemplate = await writeMailTemplate('WARNING_MAIL', {
            full_name: full_name ?? undefined,
            employee_number: employee_number ?? undefined,
            absent_count,
            period: 'week',
            content_finish: `Please note, 
            continued missed meals may result in restricted access to the Food-Portal and meal services, 
            as we strive to minimize food wastage and ensure fair usage for all`,
            content_start: `We understand that unforeseen circumstances may arise. 
            If you have valid reasons for these absences, kindly reach out to the Food-Portal Admin contact provided below.
            so we can address your concerns appropriately.`,
          });
          logger.info(
            `[utils/job.util]-[warningMail]-HTML template created for employee ID: ${employee_id}`,
          );
          const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email ?? undefined,
            bcc: [
              'nishanth.shivananda@invenger.com',
              'tejas.nayak@invenger.com',
            ],
            subject: 'Weekly Warning - High Absenteeism',
            html: htmlTemplate,
            attachments: filePath
              ? [
                  {
                    filename: path.basename(filePath),
                    path: filePath,
                  },
                ]
              : [],
          };
          if (filePath) {
            logger.info(
              `[utils/job.util]-[warningMail]-Sending email with attachment to: ${email}`,
            );
            await sendmail(mailOptions);
            logger.info(
              `[utils/job.util]-[warningMail]-Email sent to: ${email}`,
            );

            // Remove the Excel file after sending the email
            if (fs.existsSync(filePath)) {
              await fs.unlinkSync(filePath);
              logger.info(
                `[utils/job.util]-[warningMail]-Excel file deleted: ${filePath}`,
              );
            }
          }
        }
      }
    }

    // Monthly warning emails and Remove the Access to Portal
    if (period === 'monthly') {
      for (const employee of employeeDataWithHighAbesentCountMonthly) {
        const {
          employee_id,
          user_id,
          email,
          full_name,
          absent_count,
          employee_number,
          absent_warning_counter,
          is_deleted,
          time_to_food,
        } = employee;
        logger.info(
          `[utils/job.util]-[warningMail]-Sending weekly warning email to: ${email}, Full Name: ${full_name}, Absent Count: ${absent_count}`,
        );
        if (absent_count && absent_count > 12) {
          const employeeScanedDetails =
            await employeeRepo.getEmployeeScanningDetails(
              employee_id,
              'monthly',
            );
          let htmlTemplate: string;
          let subject: string;
          let cc: string[];

          if (!employeeScanedDetails) {
            logger.warn(
              `[utils/job.util]-[warningMail]-No scanning details found for employee ID: ${employee_id}`,
            );
            continue;
          }
          if (is_deleted) {
            logger.warn(
              `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} is deleted, skipping email sending`,
            );
            continue;
          }
          if (absent_warning_counter && absent_warning_counter === 3) {
            logger.warn(
              `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} has already received 3 warnings`,
            );
            htmlTemplate = await writeMailTemplate('WARNING_MAIL', {
              full_name: full_name ?? undefined,
              employee_number: employee_number ?? undefined,
              absent_count,
              period: 'month',
              content_start: `Please note,
              due to continued missed meals and repeated absence despite prior warnings, your access to the Food-Portal and meal services has been temporarily restricted.
              Our aim is to minimize food wastage and ensure fair usage for all employees.`,
              content_finish: `If you believe there are valid reasons for your absences or if you wish to discuss your situation, please contact the Food-Portal Admin using the details provided below.
              We are here to support you and address any concerns you may have.`,
            });
            subject = 'Monthly Warning - High Absenteeism - Access Restricted';
            cc =
              time_to_food === 'lunch'
                ? ['hr@invenger.com', 'nmmallya@invenger.com']
                : [
                    'hr@invenger.com',
                    'nmmallya@invenger.com',
                    'shiva.kumar@invenger.com',
                  ];
            await emailRepo.incrementWarningCounter(
              user_id,
              (absent_warning_counter as number) + 1,
            );
            logger.info(
              `[utils/job.util]-[warningMail]-Disabled user ID: ${user_id}`,
            );
            continue;
          } else {
            logger.info(
              `[utils/job.util]-[warningMail]-Employee ID: ${employee_id} has not received 3 warnings yet, proceeding with email sending`,
            );
            htmlTemplate = await writeMailTemplate('WARNING_MAIL', {
              full_name: full_name ?? undefined,
              employee_number: employee_number ?? undefined,
              absent_count,
              period: 'month',
              content_finish: `Please note, 
            continued missed meals may result in restricted access to the Food-Portal and meal services, 
            as we strive to minimize food wastage and ensure fair usage for all`,
            content_start: `We understand that unforeseen circumstances may arise. 
            If you have valid reasons for these absences, kindly reach out to the Food-Portal Admin contact provided below.
            so we can address your concerns appropriately.`,
            });
            subject = 'Monthly Warning - High Absenteeism';
            cc = ['hr@invenger.com'];
            await emailRepo.incrementWarningCounter(
              user_id,
              (absent_warning_counter as number) + 1,
            );
            logger.info(
              `[utils/job.util]-[warningMail]-Warning counter incremented for user ID: ${user_id}`,
            );
          }
          const filePath = await createExcelSheet(employeeScanedDetails);
          logger.info(
            `[utils/job.util]-[warningMail]-Excel file created at: ${filePath}`,
          );
          logger.info(
            `[utils/job.util]-[warningMail]-HTML template created for employee ID: ${employee_id}`,
          );
          const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email ?? undefined,
            cc: cc,
            bcc: [
              'nishanth.shivananda@invenger.com',
              'tejas.nayak@invenger.com',
            ],
            subject: subject,
            html: htmlTemplate,
            attachments: filePath
              ? [
                  {
                    filename: path.basename(filePath),
                    path: filePath,
                  },
                ]
              : [],
          };
          logger.warn(`${filePath}`);
          if (filePath) {
            logger.info(
              `[utils/job.util]-[warningMail]-Sending email with attachment to: ${email}`,
            );
            await sendmail(mailOptions);
            logger.info(
              `[utils/job.util]-[warningMail]-Email sent to: ${email}`,
            );
            // Remove the Excel file after sending the email

            if (fs.existsSync(filePath)) {
              await fs.unlinkSync(filePath);
              logger.info(
                `[utils/job.util]-[warningMail]-Excel file deleted: ${filePath}`,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error(`[utils/job.util]-[warningMail]-Error: ${error}`);
    throw new Error('Error in warningMail job');
  }
};

export { updateInfoJob, parseEnvTime, warningMail };
