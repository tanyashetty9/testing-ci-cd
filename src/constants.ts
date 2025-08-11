export const statusCode = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const statusMessage = {
  SUCCESS: 'Successfully Completed',
  CREATED: 'Created Successfully',
  BAD_REQUEST: 'Bad Request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not Found',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
};

export const userRole: object = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  HOUSE_KEEPING: 'house-keeping',
  SCANNER: 'scanner',
};

export const mailBodyHtmlPath = {
  INVITE_USER: 'src/templates/inviteUser.html',
  RESET_PASSWORD: 'src/templates/resetPassword.html',
  WARNING_MAIL: 'src/templates/warningMail.html',
};
