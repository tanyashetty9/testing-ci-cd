import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';

/**
 * Represents the User Opting Pivot model, which tracks user opt-out preferences
 * and administrative approval status.
 *
 * @model UserOptingPivotModel
 *
 * @property {UUID} id - The unique identifier for the record. Defaults to a generated UUID.
 * @property {UUID} user_id - The unique identifier of the user. Cannot be null.
 * @property {Date | null} opt_out_time_from - The start time of the user's opt-out period. Can be null.
 * @property {Date | null} opt_out_time_to - The end time of the user's opt-out period. Can be null.
 * @property {'approved' | 'pending' | 'rejected'} is_admin_approved - The administrative approval status of the opt-out. Defaults to 'approved'.
 * @property {boolean} is_active - Indicates whether the record is active. Defaults to true.
 *
 * @remarks
 * - Timestamps are enabled with custom field names: `created_at` and `updated_at`.
 * - Soft deletes are disabled (`paranoid: false`).
 * - This model does not include a `deletedAt` field.
 */
const UserOptingPivotModel = sequelize.define<Model<any, any>>(
  'user_opting_pivot',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    opt_out_pivot_status: {
      type: DataTypes.ENUM(
        'opt-out-permanently',
        'opt-out-temporarily',
        'opt-in-temporarily',
      ),
      allowNull: false,
    },
    opt_out_time_from: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    opt_out_time_to: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    meal_opted_out: {
      type: DataTypes.SMALLINT,
      defaultValue: 0,
    },
    is_admin_approved: {
      type: DataTypes.ENUM('approved', 'pending', 'rejected'),
      defaultValue: 'approved',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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

UserOptingPivotModel.sync({ alter: false });

export default UserOptingPivotModel;
