import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';

const NotificationModel = sequelize.define<Model<any, any>>(
  'notification',
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
    notification_type: {
      type: DataTypes.ENUM('opt-in', 'opt-out-perm', 'opt-out-temp'),
      allowNull: false,
    },
    notification_details: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_admin_approved: {
      type: DataTypes.ENUM('approved', 'pending', 'rejected'),
      defaultValue: 'approved',
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

NotificationModel.sync({ alter: false });

export default NotificationModel;
