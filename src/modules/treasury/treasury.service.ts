const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'postgres',
});

const County = sequelize.define('County', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Other fields...
});

const Transaction = sequelize.define('Transaction', {
  countyId: {
    type: DataTypes.INTEGER,
    references: {
      model: County,
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // Other fields...
});