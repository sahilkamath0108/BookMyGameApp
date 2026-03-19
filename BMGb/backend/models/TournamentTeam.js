const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const TournamentTeam = sequelize.define('TournamentTeam', {
  Team_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  Tournament_Id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tournaments',
      key: 'tournament_id'
    }
  },
  Team_Number: {
    type: DataTypes.INTEGER
  },
  Team_Name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  team_members: {
    type: DataTypes.ARRAY(DataTypes.JSONB),
    defaultValue: [],
    allowNull: false,
    validate: {
      isValidTeamMembers(value) {
        if (!Array.isArray(value)) {
          throw new Error('team_members must be an array');
        }
        value.forEach(member => {
          if (!member.id || !member.hasOwnProperty('leader')) {
            throw new Error('Each team member must have id and leader properties');
          }
        });
      }
    }
  },
  Team_Password: {
    type: DataTypes.STRING
  }
}, {
  timestamps: false,
  indexes: [
    {
      fields: ['Tournament_Id', 'Team_Number'],
      unique: true
    },
    {
      fields: ['Tournament_Id', 'Team_Name'],
      unique: true,
      where: {
        Team_Name: {
          [Op.ne]: null
        }
      }
    }
  ]
});

// Get team members with their stats
TournamentTeam.prototype.getTeamWithStats = async function() {
  const { User, TournamentGameStat } = require('./index');
  
  // Extract user IDs from team_members
  const userIds = this.team_members.map(member => member.id);
  
  return User.findAll({
    where: { 
      user_id: userIds 
    },
    include: [{
      model: TournamentGameStat,
      where: { tournament_id: this.Tournament_Id },
      required: false
    }]
  });
};

// Check if team is full
TournamentTeam.prototype.isFull = async function() {
  const { Tournament } = require('./index');
  const tournament = await Tournament.findByPk(this.Tournament_Id);
  return this.team_members.length >= tournament.Team_Size_Limit;
};

// Static method to find available team number  
TournamentTeam.findAvailableTeamNumber = async function(tournamentId, transaction) {
  const teams = await this.findAll({
    where: { Tournament_Id: tournamentId },
    order: [['Team_Number', 'ASC']],
    transaction
  });

  let teamNumber = 1;
  for (const team of teams) {
    if (team.Team_Number !== teamNumber) {
      break;
    }
    teamNumber++;
  }
  return teamNumber;
};

// Add a team member
TournamentTeam.prototype.addMember = async function(userId, isLeader = false) {
  if (await this.isFull()) {
    throw new Error('Team is already full');
  }

  const newMember = {
    id: userId,
    leader: isLeader
  };

  // Initialize team_members if it's null
  if (!this.team_members) {
    this.team_members = [];
  }

  this.team_members = [...this.team_members, newMember];
  await this.save();
};

// Remove a team member
TournamentTeam.prototype.removeMember = async function(userId) {
  this.team_members = this.team_members.filter(member => member.id !== userId);
  await this.save();
};

// Change team leader
TournamentTeam.prototype.changeLeader = async function(newLeaderId) {
  if (!this.team_members.some(member => member.id === newLeaderId)) {
    throw new Error('New leader must be a team member');
  }

  this.team_members = this.team_members.map(member => ({
    ...member,
    leader: member.id === newLeaderId
  }));
  await this.save();
};

module.exports = TournamentTeam; 