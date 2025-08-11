import { sequelize } from '../config/postgres.config';
import { DataTypes, Model } from 'sequelize';
import { Department } from '../types/custom.interface';

const DepartmentModel = sequelize.define<Model<Department>>(
  'department',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    department_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
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
  },
);

DepartmentModel.sync({ alter: true });

export default DepartmentModel;
