import { Request, Response } from 'express';
import QrRepository from '../repositories/qr.repository';

//Helper function
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger.util';
import moment from 'moment';

async function exportToExcel(
  res: Response,
  data: any[],
  sheetName: string,
  fileName: string,
): Promise<void> {
  if (data.length === 0) {
    res.status(404).json({ message: 'No data to export.' });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = Object.keys(data[0]).map(key => {
    const header = key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      header: header,
      key: key,
      width: 20,
    };
  });

  worksheet.getRow(1).font = { bold: true };

  data.forEach(row => {
    worksheet.addRow(row);
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  res.status(200).end();
}

function formatHeader(header: string): string {
  return header.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

async function weeklyMonthlyToExcel(
  data: Record<string, any[]>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const [key, records] of Object.entries(data)) {
    const sheetName = formatHeader(key).substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

    if (!Array.isArray(records) || records.length === 0) {
      worksheet.addRow(['No data available']);
      continue;
    }

    // Extract unique keys from all objects, union of all keys to handle inconsistent records
    const headerSet = new Set<string>();
    records.forEach(record => {
      Object.keys(record).forEach(k => headerSet.add(k));
    });
    const headers = Array.from(headerSet).map(formatHeader);

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    // Add data rows aligned to headers order
    records.forEach(record => {
      const rowData = headers.map(h => {
        const originalKey = h.replace(/ /g, '_').toLowerCase();
        return record[originalKey] ?? '';
      });
      worksheet.addRow(rowData);
    });

    // Autofit columns based on header lengths and sample data
    worksheet.columns.forEach(col => {
      let maxLength = 10;
      if (typeof col.eachCell === 'function') {
        col.eachCell({ includeEmpty: true }, cell => {
          const val = cell.value ? cell.value.toString() : '';
          if (val.length > maxLength) maxLength = val.length;
        });
      }
      col.width = Math.min(maxLength + 2, 50); // max width cap
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
}

const qrRepo = new QrRepository();

class FileController {
  async dailyReport(req: Request, res: Response): Promise<void> {
    try {
      logger.info(
        `[controllers/file.controller]-[dailyReport]-Generating daily report`,
      );
      const { summaryOf, timeToFood } = req.params;
      const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
      const fileName = `${date}-${summaryOf}-${timeToFood}.xlsx`;
      let data: any[];

      const result =
        timeToFood === 'lunch'
          ? summaryOf === 'meal-opted'
            ? 'lunchopted'
            : summaryOf === 'absent'
              ? 'lunchabsent'
              : summaryOf === 'availed'
                ? 'lunchavailed'
                : summaryOf === 'opt-out-temp'
                  ? 'lunchOptOut'
                  : ''
          : timeToFood === 'dinner'
            ? summaryOf === 'meal-opted'
              ? 'dinneropted'
              : summaryOf === 'absent'
                ? 'dinnerabsent'
                : summaryOf === 'availed'
                  ? 'dinneravailed'
                  : summaryOf === 'opt-out-temp'
                    ? 'dinnerOptOut'
                    : ''
            : '';
      logger.info(
        `[controllers/file.controller]-[dailyReport]-Parameters: summaryOf=${summaryOf}, timeToFood=${timeToFood}, result=${result}`,
      );

      switch (result) {
        case 'lunchopted':
          data = await qrRepo.getDetailedMealOptedSummary('lunch');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for lunch opted summary`,
          );
          await exportToExcel(
            res,
            data,
            `Lunch Opted Summary-${date}`,
            fileName,
          );
          break;

        case 'lunchabsent':
          data = await qrRepo.getDetailedAbsenteeSummary('lunch');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for lunch absent summary`,
          );
          await exportToExcel(
            res,
            data,
            `Lunch Absent Summary-${date}`,
            fileName,
          );
          break;

        case 'lunchavailed':
          data = await qrRepo.getDetailedAvailedSummary('lunch');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for lunch availed summary`,
          );
          await exportToExcel(
            res,
            data,
            `Lunch Availed Summary-${date}`,
            fileName,
          );
          break;

        case 'dinneropted':
          data = await qrRepo.getDetailedMealOptedSummary('dinner');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for dinner opted summary`,
          );
          await exportToExcel(
            res,
            data,
            `Dinner Opted Summary-${date}`,
            fileName,
          );
          break;

        case 'dinnerabsent':
          data = await qrRepo.getDetailedAbsenteeSummary('dinner');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for dinner absent summary`,
          );
          await exportToExcel(
            res,
            data,
            `Dinner Absent Summary-${date}`,
            fileName,
          );
          break;

        case 'dinneravailed':
          data = await qrRepo.getDetailedAvailedSummary('dinner');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for dinner availed summary`,
          );
          await exportToExcel(
            res,
            data,
            `Dinner Availed Summary-${date}`,
            fileName,
          );
          break;

        case 'lunchOptOut':
          data = await qrRepo.getDetailedOptedOutSummary('lunch');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for lunch opted out temporary summary`,
          );
          await exportToExcel(
            res,
            data,
            `Lunch-Opt-Out Summary-${date}`,
            fileName,
          );
          break;

        case 'dinnerOptOut':
          data = await qrRepo.getDetailedOptedOutSummary('dinner');
          logger.info(
            `[controllers/file.controller]-[dailyReport]-Data fetched for dinner opted out temporary summary`,
          );
          await exportToExcel(
            res,
            data,
            `Dinner-Opt-Out Summary-${date}`,
            fileName,
          );
          break;

        default:
          logger.error(
            `[controllers/file.controller]-[dailyReport]-Invalid parameters: summaryOf=${summaryOf}, timeToFood=${timeToFood}`,
          );
          res.status(400).json({ message: 'Invalid parameters.' });
      }
    } catch (error) {
      logger.error(
        `[controllers/file.controller]-[dailyReport]-Error: ${error}`,
      );
      res.status(500).json({ message: 'Internal server error', error });
    }
  }

  async downloadWeeklyMonthly(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    try {
      logger.info(
        `[controllers/file.controller]-[downloadWeeklyMonthly]-Generating ${type} download`,
      );
      let data;

      if (type === 'weekly') {
        data = await qrRepo.weeklyDownload();
        logger.info(
          `[controllers/file.controller]-[downloadWeeklyMonthly]-Data fetched for weekly download`,
        );
      } else if (type === 'monthly') {
        data = await qrRepo.monthlyDownload();
        logger.info(
          `[controllers/file.controller]-[downloadWeeklyMonthly]-Data fetched for monthly download`,
        );
      } else {
        logger.error(
          `[controllers/file.controller]-[downloadWeeklyMonthly]-Invalid type: ${type}`,
        );
        res.status(400).send('Invalid type. Use "weekly" or "monthly".');
        return;
      }
      const today = moment().format('YYYY-MM-DD');
      const excelBuffer = await weeklyMonthlyToExcel(data);

      logger.info(
        `[controllers/file.controller]-[downloadWeeklyMonthly]-Excel file generated successfully`,
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${type}_meal_data-${today}.xlsx`,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(excelBuffer);
    } catch (error) {
      logger.error(
        `[controllers/file.controller]-[downloadMealData]-Error: ${error}`,
      );
      res.status(500).send('Error generating Excel file');
    }
  }
}

export default FileController;
