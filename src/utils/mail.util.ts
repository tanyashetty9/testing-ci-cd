import fs from 'fs';
import path from 'path';
import transporter from '../config/mail.config';
import { logger } from './logger.util';
import { MailOptions } from 'nodemailer/lib/sendmail-transport';
import { mailBodyHtmlPath } from '../constants';
import { MailBody } from '../types/custom.interface';

const sendmail = async (mailOptions: MailOptions): Promise<void> => {
  try {
    logger.info(
      `[utils/mail.util]-[sendmail]-Sending email to ${mailOptions.to}`,
    );
    await transporter.sendMail(mailOptions);
    logger.info(
      `[utils/mail.util]-[sendmail]-Email sent successfully to ${mailOptions.to}`,
    );
  } catch (error) {
    logger.error(`[utils/mail.util]-[sendmail]-Error sending email: ${error}`);
    throw new Error('Error sending email');
  }
};

const writeMailTemplate = (
  templateKey: keyof typeof mailBodyHtmlPath,
  data: MailBody,
): string => {
  const templatePath: string = path.resolve(mailBodyHtmlPath[templateKey]);

  try {
    const templateContent: string = fs.readFileSync(templatePath, 'utf8');
    let updatedContent: string = templateContent;

    if (templateKey === 'INVITE_USER' || templateKey === 'RESET_PASSWORD') {
      updatedContent = templateContent
        .replace('{{username}}', data.username || '')
        .replace('{{link}}', data.link || '');
    } else if (templateKey === 'WARNING_MAIL') {
      updatedContent = templateContent
        .replace('{{full_name}}', data.full_name || '')
        .replace('{{employee_number}}', data.employee_number || '')
        .replace('{{time_to_food}}', data.time_to_food || '')
        .replace('{{absent_count}}', data.absent_count?.toString() || '')
        .replace('{{period}}', data.period || '')
        .replace('{{content_finish}}', data.content_finish || '')
        .replace('{{content_start}}', data.content_start || '');
    }

    return updatedContent;
  } catch (error) {
    logger.error(
      `[utils/mail.util]-[writeMailTemplate()]- Error processing template: ${error}`,
    );
    throw new Error('Error processing email template');
  }
};

export { sendmail, writeMailTemplate };
