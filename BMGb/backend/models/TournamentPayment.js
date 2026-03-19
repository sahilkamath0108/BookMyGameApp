const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentPayment = sequelize.define('TournamentPayment', {
  payment_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  tournament_id: {
    type: DataTypes.UUID,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payment_details: {
    type: DataTypes.JSONB,
    comment: 'Payment amount and other meta_data information provided by payment gateway'
  },
  payment_mode:{
    type:DataTypes.ENUM('STRIPE','RAZORPAY'),
    allowNull:false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
   
  ]
});

// Static method to get tournament total payments
TournamentPayment.getTournamentTotal = async function(tournamentId) {
  const result = await this.findAll({
    where: { tournament_id: tournamentId },
    attributes: [
      'currency',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    group: ['currency']
  });
  return result;
};

// Get payment receipt details
TournamentPayment.prototype.getReceiptDetails = async function() {
  const { User, Tournament } = require('./index');
  return TournamentPayment.findOne({
    where: { payment_id: this.payment_id },
    include: [
      { 
        model: User,
        attributes: ['Name', 'email']
      },
      {
        model: Tournament,
        attributes: ['Tournament_Name', 'Registration_fee']
      }
    ]
  });
};

// Generate payment receipt
TournamentPayment.prototype.generateReceipt = async function() {
  const details = await this.getReceiptDetails();
  return {
    receipt_id: this.payment_id,
    tournament_name: details.Tournament.Tournament_Name,
    player_name: details.User.Name,
    player_email: details.User.email,
    amount_paid: this.amount,
    currency: this.currency,
    payment_date: this.created_at,
    payment_details: this.payment_details,
    registration_fee: details.Tournament.Registration_fee
  };
};

module.exports = TournamentPayment; 