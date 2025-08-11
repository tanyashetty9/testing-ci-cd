import moment from 'moment';
import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';

/**
 * Represents the QR Master model in the database.
 * This model is used to store information about QR codes, including their
 * association with users, scan status, and active status.
 *
 * @model QRMasterModel
 *
 * @property {UUID} id - The unique identifier for the QR code. Automatically generated using UUIDv4.
 * @property {UUID} user_id - The unique identifier of the user associated with the QR code. This field is required.
 * @property {boolean} is_scanned - Indicates whether the QR code has been scanned. Defaults to `false`.
 * @property {boolean} is_active - Indicates whether the QR code is active. Defaults to `true`.
 *
 * @timestamps
 * @property {Date} created_at - The timestamp when the QR code record was created.
 * @property {Date} updated_at - The timestamp when the QR code record was last updated.
 *
 * @options
 * - `timestamps`: Enables automatic management of `created_at` and `updated_at` fields.
 * - `createdAt`: Maps the `created_at` field to the creation timestamp.
 * - `updatedAt`: Maps the `updated_at` field to the update timestamp.
 * - `deletedAt`: Disabled, as soft deletion is not used.
 * - `paranoid`: Disabled, as soft deletion is not used.
 */
const QRMasterModel = sequelize.define<Model<any, any>>(
  'qr_master',
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
    date_of_use: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    qr_opt_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_scanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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

QRMasterModel.sync({ alter: false });

export default QRMasterModel;
