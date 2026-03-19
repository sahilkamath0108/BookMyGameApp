const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tournament = sequelize.define('Tournament', {
  tournament_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    unique: true
  },
  tournament_Name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  Is_Private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  Is_Sponsored: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // eg : UCI-1234, will be set later, once the tournament is created
  Tournament_Code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  // actual amount to collect from user at the time of registration
  Registration_Amount: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  Currency: {
    type: DataTypes.ENUM('USD', 'INR'),
    allowNull: false
  },
  Registration_Start_Time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  Registration_End_Time: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStart(value) {
        if (this.Registration_Start_Time && new Date(value) <= new Date(this.Registration_Start_Time)) {
          throw new Error('Registration end time must be after registration start time');
        }
      }
    }
  },
  Event_Start_Time: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterRegistrationEnd(value) {
        if (this.Registration_End_Time && new Date(value) <= new Date(this.Registration_End_Time)) {
          throw new Error('Event start time must be after registration end time');
        }
      }
    }
  },
  Event_End_Time: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterEventStart(value) {
        if (this.Event_Start_Time && new Date(value) <= new Date(this.Event_Start_Time)) {
          throw new Error('Event end time must be after event start time');
        }
      }
    }
  },
  Status: {
    type: DataTypes.ENUM('Coming Soon','Accepting Registrations', 'Registrations Closed', 'In Progress', 'Ended'),
    defaultValue: 'Coming Soon'
  },
  GameName: {
    type: DataTypes.ENUM('CallOfDuty', 'PUBG', 'BGMI', 'FIFA', 'Valorant','OverWatch')
  },
  // { "1": 50, "2": 30, "3": 20 } => 50% to 1st, 30% to 2nd, 20% to 3rd
  Payout_Structure: {
    type: DataTypes.JSONB
  },
  Team_Size_Limit: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Max_Players_Allowed: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Min_Players_Required: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  // if team_size is set to -1 then it is a solo tournament
  // calculate no of teams as Max_Players_Allowed / Team_Size_Limit
  Room_Code: {
    type: DataTypes.STRING
  },
  Room_Password: {
    type: DataTypes.STRING
  },
  // Is the amount fixed or variable based on the number of participants
  Tournament_Prize_Pool: {
    type: DataTypes.ENUM('Dynamic', 'Fixed')
  },
  Is_Offline: {
    type: DataTypes.BOOLEAN
  },
  Prize_Amount: {
    type: DataTypes.INTEGER
  },
  // Prize distribution for 1st, 2nd, 3rd place in actual amounts
  Prize_Distribution: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'JSON object containing first, second, third place prize amounts'
  },
  Include_Organizer_Fee: {
    type: DataTypes.BOOLEAN
  },
  Include_Platform_Fee: {
    type: DataTypes.BOOLEAN
  },
  Platform_fee: {
    type: DataTypes.DECIMAL(10,2)
  },
  Organizer_fee: {
    type: DataTypes.DECIMAL(10,2)
  },
  // final amount to collect from user : Registration_Amount + Platform_fee + Organizer_fee
  Is_Bracket_Competition: {
    type: DataTypes.BOOLEAN
  },
  listed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  listed_by: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Only store S3 keys for banner images (like user profile pics)
  tournament_banners: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of S3 keys for additional banner images'
  },
  main_banner_key: {
    type: DataTypes.TEXT,
    comment: 'S3 key for the main banner image'
  }
}, {
  timestamps: true,
  createdAt: 'listed_at',
  updatedAt: 'updated_at',
  // will have to create partial index on tournament_status clause where status is not 'Ended'
  indexes: [
   // will decide later after query profiling
  ]
});

// Get total registration amount including fees
Tournament.prototype.getTotalRegistrationAmount = function() {
  let total = parseFloat(this.Registration_Amount) || 0;
  
  // Add platform fee if it exists
  if (this.Platform_fee) {
    total += parseFloat(this.Platform_fee);
  }
  
  // Add organizer fee if it exists
  if (this.Organizer_fee) {
    total += parseFloat(this.Organizer_fee);
  }
  
  return total;
};

// Method to refresh main banner URL (like user profile pic)
Tournament.prototype.refreshMainBanner = async function() {
  try {
    if (!this.main_banner_key) {
      return { 
        status: 'error', 
        message: 'Tournament has no main banner',
        url: null
      };
    }
    
    const { getPresignedUrl } = require('../utils/s3Service');
    
    // Get a fresh presigned URL for the main banner key
    const presignedUrlResult = await getPresignedUrl(this.main_banner_key);
    
    if (presignedUrlResult.status !== 'success') {
      return { 
        status: 'error', 
        message: presignedUrlResult.message || 'Failed to generate presigned URL',
        url: null
      };
    }
    
    return {
      status: 'success',
      url: presignedUrlResult.url,
      key: this.main_banner_key
    };
  } catch (error) {
    console.error('Error refreshing main banner URL:', error);
    return { 
      status: 'error', 
      message: `Error refreshing main banner URL: ${error.message}`,
      url: null
    };
  }
};

// Method to refresh all banner URLs
Tournament.prototype.refreshAllBanners = async function() {
  try {
    const { getPresignedUrl } = require('../utils/s3Service');
    const bannerUrls = [];
    
    // Refresh main banner
    let mainBannerUrl = null;
    if (this.main_banner_key) {
      const mainBannerResult = await this.refreshMainBanner();
      if (mainBannerResult.status === 'success') {
        mainBannerUrl = mainBannerResult.url;
      }
    }
    
    // Refresh additional banners
    if (this.tournament_banners && this.tournament_banners.length > 0) {
      for (const bannerKey of this.tournament_banners) {
        if (bannerKey) {
          try {
            const presignedUrlResult = await getPresignedUrl(bannerKey);
            if (presignedUrlResult.status === 'success') {
              bannerUrls.push(presignedUrlResult.url);
            } else {
              console.error(`Failed to generate presigned URL for banner key ${bannerKey}:`, presignedUrlResult.message);
              bannerUrls.push(null); // Keep array length consistent
            }
          } catch (error) {
            console.error(`Error generating presigned URL for banner key ${bannerKey}:`, error);
            bannerUrls.push(null); // Keep array length consistent
          }
        } else {
          bannerUrls.push(null);
        }
      }
    }
    
    return {
      status: 'success',
      mainBanner: mainBannerUrl,
      additionalBanners: bannerUrls
    };
  } catch (error) {
    console.error('Error refreshing all banner URLs:', error);
    return { 
      status: 'error', 
      message: `Error refreshing banner URLs: ${error.message}`,
      mainBanner: null,
      additionalBanners: []
    };
  }
};

// Get available slots count
Tournament.prototype.getAvailableSlots = async function() {
  try {
    const { TournamentParticipant } = require('./index');
    
    // Validate tournament status
    if (this.Status === 'Ended') {
      return { status: 'fail', message: 'Tournament has already ended' };
    }

    if (this.Status === 'Registrations Closed') {
      return { status: 'fail', message: 'Tournament registrations are closed' };
    }

    const totalParticipants = await TournamentParticipant.count({
      where: { 
        tournament_id: this.tournament_id,
        participation_status: ['confirmed', 'soft_confirmed']
      }
    });

    const availableSlots = this.Max_Players_Allowed - totalParticipants;
    
    if (availableSlots < 0) {
      return { status: 'fail', message: 'Tournament participant count exceeds maximum allowed' };
    }

    return { status: 'success', availableSlots };
  } catch (error) {
    return { status: 'error', message: `Error checking available slots: ${error.message}` };
  }
};

// Get tournament leaderboard
Tournament.prototype.getLeaderboard = async function() {
  try {
    const { TournamentGameStat, User } = require('./index');
    
    // Validate tournament status
    if (this.Status !== 'In Progress' && this.Status !== 'Ended') {
      return { status: 'fail', message: 'Tournament has not started yet' };
    }

    const leaderboard = await TournamentGameStat.findAll({
      where: { tournament_id: this.tournament_id },
      include: [{
        model: User,
        attributes: ['user_id', 'Name', 'GamerTags']
      }],
      attributes: [
        'user_id',
        [sequelize.fn('jsonb_object_agg', sequelize.col('stats')), 'total_stats']
      ],
      group: ['user_id', 'User.user_id', 'User.Name', 'User.GamerTags'],
      order: [[sequelize.fn('jsonb_object_agg', sequelize.col('stats')), 'DESC']]
    });

    if (!leaderboard.length) {
      return { message: 'No statistics available yet', data: [] };
    }

    return { status: 'success', data: leaderboard };
  } catch (error) {
    return { status: 'error', message: `Error fetching leaderboard: ${error.message}` };
  }
};

// Get tournament timeline
Tournament.prototype.getTimeline = async function() {
  try {
    const { TournamentMatchUp, User } = require('./index');
    
    // For bracket competitions only
    if (!this.Is_Bracket_Competition) {
      return { status: 'fail', message: 'Timeline is only available for bracket competitions' };
    }

    const matches = await TournamentMatchUp.findAll({
      where: { tournament_id: this.tournament_id },
      include: [
        { model: User, as: 'Player1', attributes: ['Name', 'GamerTags'] },
        { model: User, as: 'Player2', attributes: ['Name', 'GamerTags'] }
      ],
      order: [['scheduled_time', 'ASC']] // DSC, people will be more interested in recent results than old ones
    });

    if (!matches.length) {
      return { message: 'No matches scheduled yet', data: [] };
    }

    return { status: 'success', data: matches };
  } catch (error) {
    return { status: 'error', message: `Error fetching tournament timeline: ${error.message}` };
  }
};

// Static method to validate tournament dates
Tournament.validateDates = function(registrationStart, registrationEnd, eventStart, eventEnd) {
  const errors = [];
  
  // Convert string dates to Date objects if needed
  const regStart = new Date(registrationStart);
  const regEnd = new Date(registrationEnd);
  const evStart = new Date(eventStart);
  const evEnd = new Date(eventEnd);
  
  // Check if dates are valid
  if (isNaN(regStart.getTime())) {
    errors.push('Registration start time is invalid');
  }
  if (isNaN(regEnd.getTime())) {
    errors.push('Registration end time is invalid');
  }
  if (isNaN(evStart.getTime())) {
    errors.push('Event start time is invalid');
  }
  if (isNaN(evEnd.getTime())) {
    errors.push('Event end time is invalid');
  }
  
  if (errors.length > 0) {
    return { status: 'fail', message: errors.join(', ') };
  }
  
  // Check chronological order only (removed past date checks)
  if (regEnd <= regStart) {
    errors.push('Registration end time must be after registration start time');
  }
  
  if (evStart <= regEnd) {
    errors.push('Event start time must be after registration end time');
  }
  
  if (evEnd <= evStart) {
    errors.push('Event end time must be after event start time');
  }
  
  if (errors.length > 0) {
    return { status: 'fail', message: errors.join(', ') };
  }
  
  return { status: 'success', message: 'All dates are valid' };
};

// Static method to validate tournament dates for updates (more lenient)
Tournament.validateDatesForUpdate = function(registrationStart, registrationEnd, eventStart, eventEnd, previousValues) {
  const errors = [];
  
  // Convert string dates to Date objects if needed
  const regStart = new Date(registrationStart);
  const regEnd = new Date(registrationEnd);
  const evStart = new Date(eventStart);
  const evEnd = new Date(eventEnd);
  
  // Check if dates are valid
  if (isNaN(regStart.getTime())) {
    errors.push('Registration start time is invalid');
  }
  if (isNaN(regEnd.getTime())) {
    errors.push('Registration end time is invalid');
  }
  if (isNaN(evStart.getTime())) {
    errors.push('Event start time is invalid');
  }
  if (isNaN(evEnd.getTime())) {
    errors.push('Event end time is invalid');
  }
  
  if (errors.length > 0) {
    return { status: 'fail', message: errors.join(', ') };
  }
  
  // Check chronological order only (removed past date validation)
  if (regEnd <= regStart) {
    errors.push('Registration end time must be after registration start time');
  }
  
  if (evStart <= regEnd) {
    errors.push('Event start time must be after registration end time');
  }
  
  if (evEnd <= evStart) {
    errors.push('Event end time must be after event start time');
  }
  
  if (errors.length > 0) {
    return { status: 'fail', message: errors.join(', ') };
  }
  
  return { status: 'success', message: 'All dates are valid' };
};

// Add hooks for date validation
Tournament.beforeCreate(async (tournament) => {
  const validationResponse = Tournament.validateDates(
    tournament.Registration_Start_Time,
    tournament.Registration_End_Time,
    tournament.Event_Start_Time,
    tournament.Event_End_Time
  );
  if (validationResponse && validationResponse.status === 'fail') {
    throw new Error(validationResponse.message);
  }
});

Tournament.beforeUpdate(async (tournament) => {
  if (tournament.changed('Registration_Start_Time') ||
      tournament.changed('Registration_End_Time') ||
      tournament.changed('Event_Start_Time') ||
      tournament.changed('Event_End_Time')) {
    
    // For updates, use a modified validation that allows existing past dates
    const validationResponse = Tournament.validateDatesForUpdate(
      tournament.Registration_Start_Time,
      tournament.Registration_End_Time,
      tournament.Event_Start_Time,
      tournament.Event_End_Time,
      tournament._previousDataValues // Previous values before update
    );
    if (validationResponse && validationResponse.status === 'fail') {
      throw new Error(validationResponse.message);
    }
  }
});

module.exports = Tournament; 