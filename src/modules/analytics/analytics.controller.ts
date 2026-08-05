   // Example using Sequelize for a SQL database
   const User = sequelize.define('User', {
       username: {
           type: Sequelize.STRING,
           allowNull: false,
           unique: true
       },
       password: {
           type: Sequelize.STRING,
           allowNull: false
       },
       role: {
           type: Sequelize.STRING,
           allowNull: false
       }
   });

   const Transaction = sequelize.define('Transaction', {
       countyId: {
           type: Sequelize.INTEGER,
           allowNull: false
       },
       amount: {
           type: Sequelize.FLOAT,
           allowNull: false
       },
       // other fields...
   });