import moment from 'moment';
import bcrypt from 'bcryptjs';
import { User } from '../types/custom.interface';
import { decryptData } from './encryption.util';
import { logger } from './logger.util';
import UserRepository from '../repositories/user.repository';

const userRepo = new UserRepository();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^[A-Za-z\s@\d0-9]{8,}$/;
const validRoles = ['admin', 'employee', 'manager', 'house-keeping', 'scanner'];

//Function to validate Link and expiry
const validateLink = async (link: string): Promise<boolean> => {
  try {
    const userId: string = await decryptData(link);
    if (!userId) {
      logger.error(
        '[utils/validation.util]-[validateLink]-Invalid link provided',
      );
      return false;
    }
    const user = await userRepo.getUserByLink(link);
    if (!user) {
      logger.error(
        '[utils/validation.util]-[validateLink]-User not found for the provided link',
      );
      return false;
    }
    const currentTime = moment().toDate();
    const linkExpiry = moment(user.linkExpiry).toDate();

    if (currentTime > linkExpiry && userId !== user.id) {
      logger.error('[utils/validation.util]-[validateLink]-Link has expired');
      return false;
    }
    return true;
  } catch (error) {
    logger.error(`[utils/validation.util]-[validateLink]-Error: ${error}`);
    return false;
  }
};

export const validateUserData = async (data: User): Promise<string> => {
  logger.info(
    '[utils/validation.util]-[validateUserData]-Validating user data',
  );
  if (!data) {
    logger.error(
      '[utils/validation.util]-[validateUserData]-No data provided for validation',
    );
    return 'No data provided';
  }
  if (typeof data !== 'object') {
    logger.error(
      '[utils/validation.util]-[validateUserData]-Invalid data type provided for validation',
    );
    return 'Invalid data type provided';
  }
  const { email, password, confirmPassword, role, link } = data;

  if (email && !emailRegex.test(email)) {
    logger.error(
      '[utils/validation.util]-[validateUserData]-Invalid email format',
    );
    return 'Invalid email format';
  }

  if (password && !passwordRegex.test(password)) {
    logger.error(
      '[utils/validation.util]-[validateUserData]-Invalid password format',
    );
    return 'Invalid password format';
  }

  if (role && !validRoles.includes(role)) {
    logger.error('[utils/validation.util]-[validateUserData]-Invalid role');
    return 'Invalid role';
  }

  if (password && confirmPassword && password !== confirmPassword) {
    logger.error(
      '[utils/validation.util]-[validateUserData]-Passwords do not match',
    );
    return 'Passwords do not match';
  }

  if (link) {
    const isLinkValid = await validateLink(link);
    if (!isLinkValid) {
      logger.error(
        '[utils/validation.util]-[validateUserData]-Invalid link or link has expired',
      );
      return 'Invalid link or link has expired';
    }
  }

  logger.info(
    '[utils/validation.util]-[validateUserData]-User data validation successful',
  );
  return 'Success';
};

export const validateLoginData = async (
  data: User,
  actualPassword: string,
): Promise<string> => {
  logger.info(
    '[utils/validation.util]-[validateLoginData]-Validating login data',
  );

  const { email, password } = data;
  logger.info(
    `[utils/validation.util]-[validateLoginData]-Email: ${email}, Actual Password: ${actualPassword}`,
  );
  const isCorrectPassword = await bcrypt.compare(
    password as string,
    actualPassword,
  );
  logger.info(
    `[utils/validation.util]-[validateLoginData]-Password comparison result: ${isCorrectPassword}`,
  );
  if (!data) {
    logger.error(
      '[utils/validation.util]-[validateLoginData]-No data provided for validation',
    );
    return 'No data provided';
  }
  if (typeof data !== 'object') {
    logger.error(
      '[utils/validation.util]-[validateLoginData]-Invalid data type provided for validation',
    );
    return 'Invalid data type provided';
  }
  if (email && !emailRegex.test(email)) {
    logger.error(
      '[utils/validation.util]-[validateLoginData]-Invalid email format',
    );
    return 'Invalid email format';
  }
  if (password && !passwordRegex.test(password)) {
    logger.error(
      '[utils/validation.util]-[validateLoginData]-Invalid password format',
    );
    return 'Invalid password format';
  }
  if (!isCorrectPassword) {
    logger.error(
      '[utils/validation.util]-[validateLoginData]-Incorrect password',
    );
    return 'Incorrect username or password';
  }

  logger.info(
    '[utils/validation.util]-[validateLoginData]-Login data validation successful',
  );
  return 'Success';
};
