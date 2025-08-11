import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';

/**
 * Represents the User model definition for the application.
 * This model is used to manage user-related data in the database.
 *
 * Properties:
 * - `id` (UUID): The unique identifier for the user. Defaults to a generated UUID (UUIDv4).
 * - `employee_id` (UUID): A unique identifier for the employee. Cannot be null.
 * - `email` (string): The email address of the user. Must be unique and cannot be null.
 * - `password` (string | null): The password for the user. Can be null.
 * - `opt_status` ('opt-in' | 'opt-out-temp' | 'opt-out-perm'): The opt-in/opt-out status of the user. Defaults to 'opt-in'.
 * - `role` ('admin' | 'employee' | 'manager' | 'house-keeping' | 'scanner' | 'hr-executive'): The role assigned to the user. Cannot be null.
 * - `link` (string | null): A link associated with the user. Can be null.
 * - `link_expiry` (Date | null): The expiration date of the associated link. Can be null.
 * - `is_deleted` (boolean): Indicates whether the user is marked as deleted. Defaults to `false`.
 * - `access_token` (text | null): A token for user access. Can be null.
 * - `counter` (number): A counter for user-specific operations. Defaults to `3`.
 * - `is_active` (boolean): Indicates whether the user is active. Defaults to `false`.
 *
 * Configuration:
 * - Timestamps are enabled with custom field names:
 *   - `created_at` for creation timestamp.
 *   - `updated_at` for update timestamp.
 * - Soft deletes are disabled (`deletedAt: false`).
 * - Paranoid mode is disabled (`paranoid: false`).
 */
const UserModel = sequelize.define<Model<any, any>>(
  'user',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    opt_status: {
      type: DataTypes.ENUM('opt-in', 'opt-out-temp', 'opt-out-perm'),
      allowNull: false,
      defaultValue: 'opt-in',
    },
    role: {
      type: DataTypes.ENUM(
        'admin',
        'employee',
        'manager',
        'house-keeping',
        'scanner',
        'hr-executive',
      ),
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    link_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    counter: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    absent_warning_counter: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: false,
    paranoid: false,
  },
);

UserModel.sync({ alter: true });

export default UserModel;
