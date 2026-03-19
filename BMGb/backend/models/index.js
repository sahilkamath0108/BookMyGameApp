const { sequelize } = require('../config/database');
const User = require('./User');
const Tournament = require('./Tournament');
const TournamentParticipant = require('./TournamentParticipant');
const UserAdmin = require('./UserAdmin');
const TournamentTeam = require('./TournamentTeam');
const TournamentPost = require('./TournamentPost');
const TournamentPostComment = require('./TournamentPostComment');
const Sponsor = require('./Sponsor');
const TournamentPayment = require('./TournamentPayment');
const TournamentMatchUp = require('./TournamentMatchUp');
const TournamentGameStat = require('./TournamentGameStat');
const TournamentContent = require('./TournamentContent');
const UserVote = require('./UserVote');

// User relationships
User.hasMany(TournamentPost, { foreignKey: 'Author_id', as: 'Posts' });
User.hasMany(TournamentPostComment, { foreignKey: 'Author_id', as: 'Comments' });
User.hasMany(TournamentPayment, { foreignKey: 'user_id', as: 'Payments' });
User.hasMany(TournamentGameStat, { foreignKey: 'user_id', as: 'GameStats' });
User.hasMany(TournamentContent, { foreignKey: 'author_id', as: 'CreatedContent' });
User.hasMany(UserVote, { foreignKey: 'user_id', as: 'Votes' });
User.hasMany(TournamentParticipant, { foreignKey: 'user_id', as: 'Participations' });
// user has many tournament teams ?? 
// user has many tournament participants ??
// user has many UserAdmins ??


// Tournament relationships
Tournament.belongsTo(User, { foreignKey: 'listed_by', as: 'ListedByUser' });
Tournament.hasMany(TournamentParticipant, { 
  foreignKey: 'tournament_id',
  as: 'TournamentParticipants'
});
Tournament.belongsToMany(User, {
  through: TournamentParticipant,
  foreignKey: 'tournament_id',
  otherKey: 'user_id',
  as: 'Participants'
});
Tournament.hasMany(TournamentPost, { foreignKey: 'Tournament_Id', as: 'Posts' });
Tournament.hasMany(TournamentTeam, { foreignKey: 'Tournament_Id', as: 'Teams' });
Tournament.hasMany(TournamentMatchUp, { foreignKey: 'tournament_id', as: 'Matchups' });
Tournament.hasMany(TournamentGameStat, { foreignKey: 'tournament_id', as: 'GameStats' });
Tournament.hasMany(TournamentContent, { foreignKey: 'tournament_id', as: 'Content' });
Tournament.hasMany(Sponsor, { foreignKey: 'tournament_id', as: 'Sponsors' });

// TournamentParticipant relationships
TournamentParticipant.belongsTo(User, { foreignKey: 'user_id' });
TournamentParticipant.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// TournamentPost relationships
TournamentPost.belongsTo(User, { foreignKey: 'Author_id', as: 'Author' });
TournamentPost.belongsTo(Tournament, { foreignKey: 'Tournament_Id', as: 'Tournament' });
TournamentPost.hasMany(TournamentPostComment, { foreignKey: 'Post_Id', as: 'Comments' });
TournamentPost.hasMany(UserVote, { foreignKey: 'post_id', as: 'Votes' });

// UserVote relationships
UserVote.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
UserVote.belongsTo(TournamentPost, { foreignKey: 'post_id', as: 'Post' });

// TournamentPostComment relationships
TournamentPostComment.belongsTo(TournamentPost, { foreignKey: 'Post_Id', as: 'Post' });
TournamentPostComment.belongsTo(User, { foreignKey: 'Author_id', as: 'Author' });
TournamentPostComment.belongsTo(TournamentPostComment, { foreignKey: 'Parent_Comment_Id', as: 'ParentComment' });
TournamentPostComment.hasMany(TournamentPostComment, { foreignKey: 'Parent_Comment_Id', as: 'Replies' });

// TournamentTeam relationships
TournamentTeam.belongsTo(Tournament, { foreignKey: 'Tournament_Id', as: 'Tournament' });
TournamentTeam.belongsToMany(User, {
  through: 'TeamMembers',
  foreignKey: 'Team_id',
  otherKey: 'user_id',
  as: 'Members'
});

// TournamentMatchUp relationships
TournamentMatchUp.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'Tournament' });
TournamentMatchUp.belongsTo(TournamentTeam, { foreignKey: 'player1', as: 'Team1' });
TournamentMatchUp.belongsTo(TournamentTeam, { foreignKey: 'player2', as: 'Team2' });
TournamentMatchUp.belongsTo(TournamentTeam, { foreignKey: 'winner', as: 'WinnerTeam' });
TournamentMatchUp.hasMany(TournamentGameStat, { foreignKey: 'matchup_id', as: 'GameStats' });

// Admin relationships
User.hasMany(UserAdmin, { foreignKey: 'user_id', as: 'AdminRole' });
Tournament.hasMany(UserAdmin, { foreignKey: 'associated_tournament_id', as: 'UserAdmins' });

// Sponsor relationships
Sponsor.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'Tournament' });

// TournamentContent relationships
TournamentContent.belongsTo(User, { foreignKey: 'author_id', as: 'Author' });
TournamentContent.belongsTo(Tournament, { foreignKey: 'tournament_id', as: 'Tournament' });

module.exports = {
  sequelize,
  User,
  Tournament,
  TournamentParticipant,
  UserAdmin,
  TournamentTeam,
  TournamentPost,
  TournamentPostComment,
  Sponsor,
  TournamentPayment,
  TournamentMatchUp,
  TournamentGameStat,
  TournamentContent,
  UserVote
}; 