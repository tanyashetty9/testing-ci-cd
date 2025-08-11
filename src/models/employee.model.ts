import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';

/**
 * Represents the Employee model definition for the database.
 *
 * This model defines the structure of the `employee` table, including its fields,
 * data types, constraints, and default values.
 *
 * Fields:
 * - `id` (UUID): The primary key for the employee, automatically generated using UUIDv4.
 * - `employee_number` (string): A unique identifier for the employee, required.
 * - `first_name` (string): The first name of the employee, required.
 * - `middle_name` (string | null): The middle name of the employee, optional.
 * - `last_name` (string | null): The last name of the employee, optional.
 * - `department` (string | null): The department of the employee, optional, defaults to `null`.
 * - `time_to_food` ('lunch' | 'dinner' | 'lunch-dinner'): Indicates the employee's meal preference, required.
 * - `is_deleted` (boolean): A flag indicating whether the employee is marked as deleted, defaults to `false`.
 *
 * Configuration:
 * - Timestamps are enabled with custom field names:
 *   - `created_at` for creation timestamp.
 *   - `updated_at` for update timestamp.
 * - Soft deletes are disabled (`paranoid: false`).
 * - The `deletedAt` field is not used.
 */
const EmployeeModel = sequelize.define<Model<any, any>>(
  'employee',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    employee_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: true,
      // references: {
      //   model: 'department',
      //   key: 'id',
      // },
      // onDelete: 'SET NULL',
      // onUpdate: 'CASCADE',
    },
    time_to_food: {
      type: DataTypes.ENUM('lunch', 'dinner', 'lunch-dinner'),
      allowNull: false,
    },
    is_wfh: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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

EmployeeModel.sync({ alter: true });

export default EmployeeModel;
