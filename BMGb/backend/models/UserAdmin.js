const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');


// user_id,associated_tournament_id combination should be unique
const UserAdmin = sequelize.define('UserAdmins', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true, 
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  associated_tournament_id: {
    type: DataTypes.UUID,
    primaryKey: true,  
    allowNull: false,
    references: {
      model: 'Tournaments',
      key: 'tournament_id' 
    }
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'temp_admin'),
    allowNull: false 
  }
}, {
  timestamps: false
});

// Static method to check if user is a Super Admin
UserAdmin.isSuperAdmin = async function(userId, tournament_id) {
  const now = new Date();
  return await this.findOne({
    where: {
      user_id: userId,
      role: 'super_admin',
      associated_tournament_id: tournament_id,
      start_time: { [Op.lte]: now },
      end_time: { [Op.gt]: now }
    }
  });
};

// Static method to check if user is a Temp Admin
UserAdmin.isTempAdmin = async function(userId,tournament_id) {
  const now = new Date();
  return await this.findOne({
    where: {
      user_id: userId,
      role: 'temp_admin',
      associated_tournament_id: tournament_id,
      start_time: { [Op.lte]: now },
      end_time: { [Op.gt]: now }
    }
  });
};

module.exports = UserAdmin;
