import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import UserRepository from '../repositories/user.repository';
import { logger } from './logger.util';
import { User } from '../types/custom.interface'; // Adjust the path as needed
import QRRepository from '../repositories/qr.repository';
import NotificationRepository from '../repositories/notification.repository';

const userRepo = new UserRepository();
const qr = new QRRepository();
const notificationRepo = new NotificationRepository();
dotenv.config();

export const generateRefreshToken = (user: User) => {
  logger.info(
    `[utils/auth.util]-[generateAccessToken]-Generating access token for user: ${user.email}`,
  );
  const { access_token, opt_out_date, ...userWithoutToken } = user;
  return jwt.sign(userWithoutToken, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
};

export const generateAccessToken = async (user: User) => {
  const { id }: User = user;
  const { access_token, ...userWithoutToken } = user;
  const accessToken: string = await jwt.sign(
    userWithoutToken,
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: '2d',
    },
  );
  logger.info(
    `[utils/auth.util]-[generateRefreshToken]-Generating refresh token for user: ${user.email}`,
  );
  await userRepo.addAccessToken(id as string, accessToken);
  return true;
};

export const getCurrentUser = async (req: any) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    logger.error(
      `[utils/auth.util]-[getCurrentUser]-No refresh token found in cookies`,
    );
    return null;
  }
  try {
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    );
    const user: User | null = await userRepo.getUserById(decoded.id);
    if (!user) {
      logger.error(
        `[utils/auth.util]-[getCurrentUser]-User not found with ID: ${decoded.id}`,
      );
      return null;
    }
    const optOutData =
      (await qr.getPivotAvailableData(user.id as string)) || null;
    logger.info(
      `[utils/auth.util]-[getCurrentUser]-Opt-out data : ${JSON.stringify(
        optOutData,
      )}`,
    );

    let is_admin_approved;
    if (user.opt_status === 'opt-out-perm') {
      logger.info(
        `[utils/auth.util]-[getCurrentUser]-Fetching latest notification for user: ${user.email}`,
      );
      is_admin_approved =
        (await notificationRepo.getLatestNotification(user.id))
          ?.is_admin_approved ?? null;
    } else {
      logger.info(
        `[utils/auth.util]-[getCurrentUser]-User is not opted out permanently, setting is_admin_approved to null`,
      );
      is_admin_approved = null;
    }

    const date = optOutData ? (optOutData as any).date : null;
    const userDetails = {
      id: user.id,
      employee_id: user.employee_id,
      email: user.email,
      role: user.role,
      is_deleted: user.is_deleted,
      opt_status: user.opt_status,
      access_token: user.access_token,
      opt_out_date: date || null,
      opt_out_notif_status: is_admin_approved || null,
      counter: user.counter,
    };
    const isAccessTokenAdded = await generateAccessToken(userDetails as User);
    if (!isAccessTokenAdded) {
      logger.error(
        `[utils/auth.util]-[getCurrentUser]-Failed to add access token for user: ${user.email}`,
      );
      return null;
    }
    logger.info(
      `[utils/auth.util]-[getCurrentUser]-Access token generated successfully for user: ${user.email}`,
    );
    return userDetails;
  } catch (error) {
    logger.error(
      `[utils/auth.util]-[getCurrentUser]-Error in verifying refresh token: ${error}`,
    );
    return null;
  }
};
