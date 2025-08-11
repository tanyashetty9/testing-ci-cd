import { Response } from 'express';

export const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: object | null,
): void => {
  res.status(statusCode).json({
    success: statusCode < 400,
    status: statusCode,
    message,
    data,
  });
};
