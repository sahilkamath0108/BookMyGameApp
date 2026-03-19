const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sponsor = sequelize.define('Sponsor', {
  sponsor_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tournament_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sponsorship_level: {
    type: DataTypes.ENUM('platinum', 'gold', 'silver', 'bronze'),
    allowNull: true
  },
  sponsorship_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  sponsorship_currency: {
    type: DataTypes.ENUM('USD', 'INR', 'EUR', 'GBP'),
    defaultValue: 'USD'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  benefits_provided: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Benefits provided to the sponsor (e.g., logo placement, booth space)'
  },
  display_content: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Content to render on tournament page'
  },
  // Image fields for sponsor content
  banner_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL for sponsor banner image'
  },
  promotional_image1_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL for promotional image 1'
  },
  promotional_image2_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL for promotional image 2'
  },
  promotional_image3_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL for promotional image 3'
  },
  promotional_image4_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL for promotional image 4'
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of image URLs for sponsor'
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tournament_id']
    },
    {
      fields: ['name']
    },
    {
      fields: ['sponsorship_level']
    }
  ]
});

module.exports = Sponsor; 