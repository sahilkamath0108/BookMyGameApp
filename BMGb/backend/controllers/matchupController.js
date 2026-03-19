const { Tournament, TournamentMatchUp, TournamentTeam, UserAdmin, TournamentParticipant, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { sendRoomDetailsEmail } = require('../utils/emailService');

// Generate initial matchups for a tournament
const generateInitialMatchups = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Check if tournament exists
            const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
            if (!tournament) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Tournament not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: tournamentId,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can generate matchups'
                };
            }
            
            // Check if tournament status is appropriate
            if (tournament.Status !== 'Registrations Closed' && tournament.Status !== 'In Progress') {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Tournament must be in "Registrations Closed" or "In Progress" status to generate matchups'
                };
            }
            
            // Check if matchups already exist
            const existingMatchups = await TournamentMatchUp.findOne({
                where: { tournament_id: tournamentId },
                transaction: t
            });
            
            if (existingMatchups) {
                return {
                    error: true,
                    statusCode: 409,
                    message: 'Matchups have already been generated for this tournament'
                };
            }
            
            // Get all tournament teams with at least one member
            const teams = await TournamentTeam.findAll({
                where: {
                  Tournament_Id: tournamentId,
                  [Op.and]: [
                    sequelize.literal(`array_length("team_members", 1) > 0`)
                  ]
                },
                transaction: t
            });
            
            // Make sure we have enough teams
            if (teams.length < 2) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Not enough teams to generate matchups (minimum 2 required)'
                };
            }
            
            // Check if we have an even number of teams
            if (teams.length % 2 !== 0) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot generate matchups with an odd number of teams'
                };
            }
            
            // Shuffle the teams for random matchups
            const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
            
            // Filter out teams with no members (additional safety check)
            const teamsWithMembers = shuffledTeams.filter(team => 
                Array.isArray(team.team_members) && team.team_members.length > 0
            );
            
            // Check again if we have enough teams after filtering
            if (teamsWithMembers.length < 2) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Not enough teams with members to generate matchups (minimum 2 required)'
                };
            }
            
            // Check if we have an even number of teams
            if (teamsWithMembers.length % 2 !== 0) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot generate matchups with an odd number of teams. Please add another team or remove one.'
                };
            }
            
            // Create matchups
            const matchups = [];
            for (let i = 0; i < teamsWithMembers.length; i += 2) {
                matchups.push({
                    player1: teamsWithMembers[i].Team_id,
                    player2: teamsWithMembers[i + 1].Team_id,
                    tournament_id: tournamentId,
                    round_tag: 1, // Initial round tag as 1
                    scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // Schedule for tomorrow by default
                });
            }
            
            // Create all matchups in the database
            const createdMatchups = await TournamentMatchUp.bulkCreate(matchups, { transaction: t });
            
            // Update tournament status if needed
            if (tournament.Status === 'Registrations Closed') {
                await tournament.update({ Status: 'In Progress' }, { transaction: t });
            }
            
            return {
                error: false,
                matchups: createdMatchups,
                matchupCount: createdMatchups.length
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(201).json({
            status: 'success',
            message: 'Initial matchups generated successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Generate initial matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error generating initial matchups'
        });
    }
};

// Generate next round matchups based on previous round winners
const generateNextRoundMatchups = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Check if tournament exists
            const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
            if (!tournament) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Tournament not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: tournamentId,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can generate next round matchups'
                };
            }
            
            // Check if tournament is in progress
            if (tournament.Status !== 'In Progress') {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Tournament must be in "In Progress" status to generate next round matchups'
                };
            }
            
            // Find the latest round
            const latestRound = await TournamentMatchUp.max('round_tag', {
                where: { tournament_id: tournamentId },
                transaction: t
            });
            
            if (!latestRound) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'No previous matchups found'
                };
            }
            
            // Check if all matchups in the latest round have winners
            const incompleteMatchups = await TournamentMatchUp.findOne({
                where: {
                    tournament_id: tournamentId,
                    round_tag: latestRound,
                    winner: null
                },
                transaction: t
            });
            
            if (incompleteMatchups) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'All matchups in the current round must be completed before generating the next round'
                };
            }
            
            // Get winners from the latest round
            const previousMatchups = await TournamentMatchUp.findAll({
                where: {
                    tournament_id: tournamentId,
                    round_tag: latestRound
                },
                attributes: ['winner'],
                transaction: t
            });
            
            const winners = previousMatchups.map(match => match.winner);
            
            // Make sure we have enough winners for the next round
            if (winners.length < 2) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Not enough winners to generate next round (minimum 2 required)'
                };
            }
            
            // Check if next round already exists
            const nextRoundExists = await TournamentMatchUp.findOne({
                where: {
                    tournament_id: tournamentId,
                    round_tag: latestRound + 1
                },
                transaction: t
            });
            
            if (nextRoundExists) {
                return {
                    error: true,
                    statusCode: 409,
                    message: `Round ${latestRound + 1} matchups have already been generated`
                };
            }
            
            // Shuffle the winners for random matchups
            const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
            
            // Create matchups for the next round
            const matchups = [];
            for (let i = 0; i < shuffledWinners.length; i += 2) {
                // If we have an odd number of winners and this is the last one, they get a bye
                if (i + 1 >= shuffledWinners.length) {
                    matchups.push({
                        player1: shuffledWinners[i],
                        player2: null, // Bye
                        tournament_id: tournamentId,
                        round_tag: latestRound + 1,
                        scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // Schedule for tomorrow by default
                    });
                } else {
                    matchups.push({
                        player1: shuffledWinners[i],
                        player2: shuffledWinners[i + 1],
                        tournament_id: tournamentId,
                        round_tag: latestRound + 1,
                        scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000) // Schedule for tomorrow by default
                    });
                }
            }
            
            // Create all matchups in the database
            const createdMatchups = await TournamentMatchUp.bulkCreate(matchups, { transaction: t });
            
            // If only one matchup was created and we're in the final round
            if (createdMatchups.length === 1 && latestRound > 1) {
                // Update tournament status to indicate we're in the final round
                await tournament.update({
                    Status: 'Final Round',
                }, { transaction: t });
            }
            
            return {
                error: false,
                matchups: createdMatchups,
                round: latestRound + 1,
                matchupCount: createdMatchups.length
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(201).json({
            status: 'success',
            message: 'Next round matchups generated successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Generate next round matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error generating next round matchups'
        });
    }
};

// Get all matchups for a tournament
const getTournamentMatchups = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        
        // Check if tournament exists
        const tournament = await Tournament.findByPk(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                status: 'fail',
                message: 'Tournament not found'
            });
        }
        
        // Check if tournament is team-based or individual
        const isTeamBased = tournament.Team_Size_Limit > 1;
        
        // Get all matchups for this tournament, ordered by round and creation date
        const matchups = await TournamentMatchUp.findAll({
            where: { tournament_id: tournamentId },
            order: [
                ['round_tag', 'ASC'],
                ['created_at', 'ASC']
            ],
            include: [
                {
                    model: TournamentTeam,
                    as: 'Team1',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'Team2',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'WinnerTeam',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                }
            ]
        });
        
        // For solo tournaments, enhance team data with full user information
        if (!isTeamBased) {
            const enhancedMatchups = await Promise.all(matchups.map(async (matchup) => {
                const matchupJson = matchup.toJSON();
                
                // Helper function to enhance team data with user info
                const enhanceTeamData = async (team) => {
                    if (!team || !team.team_members || team.team_members.length === 0) {
                        return team;
                    }
                    
                    // Get user IDs from team_members
                    const userIds = team.team_members.map(member => member.id);
                    
                    // Fetch full user details
                    const users = await User.findAll({
                        where: { user_id: userIds },
                        attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
                    });
                    
                    // Add Members array with full user data
                    return {
                        ...team,
                        Members: users.map(user => user.toJSON())
                    };
                };
                
                // Enhance all team data
                if (matchupJson.Team1) {
                    matchupJson.Team1 = await enhanceTeamData(matchupJson.Team1);
                }
                if (matchupJson.Team2) {
                    matchupJson.Team2 = await enhanceTeamData(matchupJson.Team2);
                }
                if (matchupJson.WinnerTeam) {
                    matchupJson.WinnerTeam = await enhanceTeamData(matchupJson.WinnerTeam);
                }
                
                return matchupJson;
            }));
            
            return res.status(200).json({
                status: 'success',
                data: {
                    tournament: {
                        id: tournament.tournament_id,
                        name: tournament.tournament_Name,
                        status: tournament.Status,
                        isTeamBased: false
                    },
                    matchups: enhancedMatchups,
                    matchupCount: enhancedMatchups.length
                }
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: {
                tournament: {
                    id: tournament.tournament_id,
                    name: tournament.tournament_Name,
                    status: tournament.Status,
                    isTeamBased: true
                },
                matchups,
                matchupCount: matchups.length
            }
        });
        
    } catch (error) {
        console.error('Get tournament matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error retrieving tournament matchups'
        });
    }
};

// Get a specific matchup by ID
const getMatchupById = async (req, res) => {
    try {
        const { matchup_id } = req.params;
        
        const matchup = await TournamentMatchUp.findByPk(matchup_id, {
            include: [
                {
                    model: TournamentTeam,
                    as: 'Team1',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'Team2',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'WinnerTeam',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: Tournament,
                    attributes: ['tournament_id', 'tournament_Name', 'Status', 'Team_Size_Limit'],
                    as: 'Tournament'
                }
            ]
        });
        
        if (!matchup) {
            return res.status(404).json({
                status: 'fail',
                message: 'Matchup not found'
            });
        }
        
        // Check if tournament is team-based or individual
        const isTeamBased = matchup.Tournament.Team_Size_Limit > 1;
        
        // For solo tournaments, enhance team data with full user information
        if (!isTeamBased) {
            const matchupJson = matchup.toJSON();
            
            // Helper function to enhance team data with user info
            const enhanceTeamData = async (team) => {
                if (!team || !team.team_members || team.team_members.length === 0) {
                    return team;
                }
                
                // Get user IDs from team_members
                const userIds = team.team_members.map(member => member.id);
                
                // Fetch full user details
                const users = await User.findAll({
                    where: { user_id: userIds },
                    attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
                });
                
                // Add Members array with full user data
                return {
                    ...team,
                    Members: users.map(user => user.toJSON())
                };
            };
            
            // Enhance all team data
            if (matchupJson.Team1) {
                matchupJson.Team1 = await enhanceTeamData(matchupJson.Team1);
            }
            if (matchupJson.Team2) {
                matchupJson.Team2 = await enhanceTeamData(matchupJson.Team2);
            }
            if (matchupJson.WinnerTeam) {
                matchupJson.WinnerTeam = await enhanceTeamData(matchupJson.WinnerTeam);
            }
            
            return res.status(200).json({
                status: 'success',
                data: matchupJson
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: matchup
        });
        
    } catch (error) {
        console.error('Get matchup by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error retrieving matchup'
        });
    }
};

// Update a matchup with a winner
const updateMatchupWinner = async (req, res) => {
    try {
        const { matchup_id } = req.params;
        const { winner_id } = req.body;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Find the matchup
            const matchup = await TournamentMatchUp.findByPk(matchup_id, {
                transaction: t
            });
            
            if (!matchup) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Matchup not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: matchup.tournament_id,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can update matchup winners'
                };
            }
            
            // Handle resetting a winner (when winner_id is null)
            if (winner_id === null) {
                // If matchup has a winner, reset it
                if (matchup.winner) {
                    await matchup.update({
                        winner: null,
                        completed_at: null
                    }, { transaction: t });
                    
                    return {
                        error: false,
                        matchup: {
                            ...matchup.toJSON(),
                            isRoundComplete: false,
                            isLastRound: false
                        }
                    };
                }
                return {
                    error: false,
                    message: 'Matchup already has no winner',
                    matchup: matchup.toJSON()
                };
            }
            
            // Verify winner is one of the participants
            if (matchup.player1 !== winner_id && matchup.player2 !== winner_id) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Winner must be one of the matchup participants'
                };
            }
            
            // Update the matchup with the winner
            await matchup.update({
                winner: winner_id,
                completed_at: new Date()
            }, { transaction: t });
            
            // Get the tournament
            const tournament = await Tournament.findByPk(matchup.tournament_id, {
                transaction: t
            });
            
            // Check if all matchups in this round have winners
            const roundMatchupCount = await TournamentMatchUp.count({
                where: {
                    tournament_id: matchup.tournament_id,
                    round_tag: matchup.round_tag
                },
                transaction: t
            });
            
            const completedMatchupCount = await TournamentMatchUp.count({
                where: {
                    tournament_id: matchup.tournament_id,
                    round_tag: matchup.round_tag,
                    winner: { [Op.not]: null }
                },
                transaction: t
            });
            
            const isRoundComplete = roundMatchupCount === completedMatchupCount;
            
            // Check if this was the final match
            const isLastRound = await TournamentMatchUp.count({
                where: {
                    tournament_id: matchup.tournament_id,
                    round_tag: { [Op.gt]: matchup.round_tag }
                },
                transaction: t
            }) === 0;
            
            // If this is the last round and this round is complete, update tournament status
            // if (isLastRound && isRoundComplete && roundMatchupCount === 1) {
            //     await tournament.update({
            //         Status: 'Ended'
            //     }, { transaction: t });
            // }
            
            return {
                error: false,
                matchup: {
                    ...matchup.toJSON(),
                    isRoundComplete,
                    isLastRound
                },
                tournament: {
                    id: tournament.tournament_id,
                    name: tournament.tournament_Name,
                    status: tournament.Status
                }
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Matchup winner updated successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Update matchup winner error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error updating matchup winner'
        });
    }
};

// Delete a matchup
const deleteMatchup = async (req, res) => {
    try {
        const { matchup_id } = req.params;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Find the matchup
            const matchup = await TournamentMatchUp.findByPk(matchup_id, {
                transaction: t
            });
            
            if (!matchup) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Matchup not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: matchup.tournament_id,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can delete matchups'
                };
            }
            
            // Prevent deletion of matchups with winners or in completed tournaments
            if (matchup.winner) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete matchups that have already been completed'
                };
            }
            
            // Get the tournament to check its status
            const tournament = await Tournament.findByPk(matchup.tournament_id, {
                transaction: t
            });
            
            if (tournament.Status === 'Ended') {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete matchups from tournaments that have ended'
                };
            }
            
            // Delete the matchup
            await matchup.destroy({ transaction: t });
            
            return {
                error: false,
                message: 'Matchup deleted successfully',
                matchupId: matchup_id
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: result
        });
        
    } catch (error) {
        console.error('Delete matchup error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error deleting matchup'
        });
    }
};

// Delete all matchups for a tournament
const deleteAllTournamentMatchups = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Check if tournament exists
            const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
            if (!tournament) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Tournament not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: tournamentId,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can delete tournament matchups'
                };
            }
            
            // Check if tournament has ended
            if (tournament.Status === 'Ended') {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete matchups from tournaments that have ended'
                };
            }
            
            // Check if there are any completed matchups (with winners)
            const completedMatchups = await TournamentMatchUp.count({
                where: {
                    tournament_id: tournamentId,
                    winner: { [Op.not]: null }
                },
                transaction: t
            });
            
            if (completedMatchups > 0) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete all matchups as some have already been completed'
                };
            }
            
            // Count matchups before deletion for response
            const matchupCount = await TournamentMatchUp.count({
                where: { tournament_id: tournamentId },
                transaction: t
            });
            
            if (matchupCount === 0) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'No matchups found for this tournament'
                };
            }
            
            // Delete all matchups for this tournament
            await TournamentMatchUp.destroy({
                where: { tournament_id: tournamentId },
                transaction: t
            });
            
            // If tournament was in progress, update it back to "Registrations Closed"
            if (tournament.Status === 'In Progress' || tournament.Status === 'Final Round') {
                await tournament.update({ 
                    Status: 'Registrations Closed' 
                }, { transaction: t });
            }
            
            return {
                error: false,
                message: 'All tournament matchups deleted successfully',
                tournamentId: tournamentId,
                deletedCount: matchupCount,
                tournamentStatus: tournament.Status === 'In Progress' ? 'Registrations Closed' : tournament.Status
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: result
        });
        
    } catch (error) {
        console.error('Delete all tournament matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error deleting tournament matchups'
        });
    }
};

// Delete the latest round of matchups for a tournament
const deleteLatestRoundMatchups = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Check if tournament exists
            const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
            if (!tournament) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Tournament not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: tournamentId,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can delete tournament matchups'
                };
            }
            
            // Check if tournament has ended
            if (tournament.Status === 'Ended') {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete matchups from tournaments that have ended'
                };
            }
            
            // Find the latest round
            const latestRound = await TournamentMatchUp.max('round_tag', {
                where: { tournament_id: tournamentId },
                transaction: t
            });
            
            if (!latestRound) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'No matchups found for this tournament'
                };
            }
            
            // Check if there are any completed matchups (with winners) in the latest round
            const completedMatchups = await TournamentMatchUp.count({
                where: {
                    tournament_id: tournamentId,
                    round_tag: latestRound,
                    winner: { [Op.not]: null }
                },
                transaction: t
            });
            
            if (completedMatchups > 0) {
                return {
                    error: true,
                    statusCode: 400,
                    message: 'Cannot delete the latest round as some matchups have already been completed'
                };
            }
            
            // Count matchups in the latest round before deletion for response
            const matchupCount = await TournamentMatchUp.count({
                where: { 
                    tournament_id: tournamentId,
                    round_tag: latestRound
                },
                transaction: t
            });
            
            // Delete all matchups for the latest round
            await TournamentMatchUp.destroy({
                where: { 
                    tournament_id: tournamentId,
                    round_tag: latestRound
                },
                transaction: t
            });
            
            // If this was the only round, update tournament status back to "Registrations Closed"
            if (latestRound === 1) {
                await tournament.update({ 
                    Status: 'Registrations Closed' 
                }, { transaction: t });
            }
            
            return {
                error: false,
                message: 'Latest round matchups deleted successfully',
                tournamentId: tournamentId,
                deletedRound: latestRound,
                deletedCount: matchupCount
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        res.status(200).json({
            status: 'success',
            data: result
        });
        
    } catch (error) {
        console.error('Delete latest round matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error deleting latest round matchups'
        });
    }
};

// Get global leaderboard data
const getGlobalLeaderboard = async (req, res) => {
    try {
        // Get query parameters for pagination and filtering
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const days = parseInt(req.query.days) || 30; // Default to last 30 days
        
        // Calculate date for filtering recent matches
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get all matchups with winners from all tournaments, ordered by completion date
        const matchups = await TournamentMatchUp.findAll({
            where: {
                winner: { [Op.not]: null },
                completed_at: { [Op.gte]: startDate }
            },
            include: [
                {
                    model: TournamentTeam,
                    as: 'Team1',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'Team2',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'WinnerTeam',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: Tournament,
                    attributes: ['tournament_id', 'tournament_Name', 'Status', 'GameName', 'Prize_Amount', 'Team_Size_Limit'],
                    as: 'Tournament'
                }
            ],
            order: [['completed_at', 'DESC']],
            limit,
            offset
        });
        
        // Get the count of all matchups with winners
        const totalMatchupsCount = await TournamentMatchUp.count({
            where: {
                winner: { [Op.not]: null },
                completed_at: { [Op.gte]: startDate }
            }
        });
        
        // Process matchups to count wins per team and aggregate tournament data
        const teamStats = {};
        const recentWinners = [];
        
        // Helper function to enhance team data with user info for single-player tournaments
        const enhanceTeamWithUserInfo = async (team, tournament) => {
            if (!team || !team.team_members || team.team_members.length === 0) {
                return team;
            }
            
            // Check if this is a single-player tournament
            // Use multiple indicators: Team_Size_Limit === 1 OR team has only 1 member
            const isSinglePlayer = (tournament && tournament.Team_Size_Limit === 1) || 
                                   (team.team_members && team.team_members.length === 1);
            
            if (isSinglePlayer) {
                // Get user IDs from team_members (team_members is an array of {id, leader} objects)
                const userIds = team.team_members.map(member => member.id);
                
                // Fetch full user details
                const users = await User.findAll({
                    where: { user_id: userIds },
                    attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
                });
                
                // Add user info to team data
                const enhancedTeam = {
                    ...team.toJSON ? team.toJSON() : team,
                    Members: users.map(user => user.toJSON()),
                    isSinglePlayer: true,
                    playerName: users.length > 0 ? users[0].Name : null,
                    playerGamerTag: users.length > 0 ? users[0].GamerTag : null
                };
                return enhancedTeam;
            }
            
            return {
                ...team.toJSON ? team.toJSON() : team,
                isSinglePlayer: false
            };
        };
        
        // Process the matchups to extract winner data
        for (const matchup of matchups) {
            const winnerId = matchup.winner;
            const winnerTeam = matchup.winner === matchup.player1 ? matchup.Team1 : matchup.Team2;
            const tournamentId = matchup.tournament_id;
            const tournamentName = matchup.Tournament?.tournament_Name || 'Unknown Tournament';
            const gameName = matchup.Tournament?.GameName || 'Unknown Game';
            
            // Skip if winner team not found
            if (!winnerTeam) continue;
            
            // Enhance team data with user info if needed
            const enhancedWinnerTeam = await enhanceTeamWithUserInfo(winnerTeam, matchup.Tournament);
            
            // Process for recent winners list (most recent first)
            recentWinners.push({
                matchup_id: matchup.matchup_id,
                team_id: winnerId,
                team: enhancedWinnerTeam,
                round: matchup.round_tag,
                tournament_id: tournamentId,
                tournament_name: tournamentName,
                game_name: gameName,
                completed_at: matchup.completed_at,
                tournament_type: matchup.Tournament?.Team_Size_Limit === 1 ? 'single' : 'team'
            });
            
            // Process for team stats aggregation
            if (!teamStats[winnerId]) {
                teamStats[winnerId] = {
                    team_id: winnerId,
                    team: enhancedWinnerTeam,
                    total_wins: 0,
                    tournaments: new Set(),
                    tournament_details: [],
                    highest_round: 0,
                    tournament_type: matchup.Tournament?.Team_Size_Limit === 1 ? 'single' : 'team'
                };
            }
            
            teamStats[winnerId].total_wins += 1;
            teamStats[winnerId].tournaments.add(tournamentId);
            
            // Add tournament details if not already added
            if (!teamStats[winnerId].tournament_details.some(t => t.id === tournamentId)) {
                teamStats[winnerId].tournament_details.push({
                    id: tournamentId,
                    name: tournamentName,
                    game: gameName
                });
            }
            
            // Update highest round if this is higher
            if (matchup.round_tag > teamStats[winnerId].highest_round) {
                teamStats[winnerId].highest_round = matchup.round_tag;
            }
        }
        
        // Convert to array and sort by total wins
        const topTeams = Object.values(teamStats)
            .map(team => ({
                ...team,
                tournaments: Array.from(team.tournaments),
                tournament_count: team.tournaments.size
            }))
            .sort((a, b) => {
                // Sort by number of wins first
                if (b.total_wins !== a.total_wins) {
                    return b.total_wins - a.total_wins;
                }
                // Then by highest round reached
                if (b.highest_round !== a.highest_round) {
                    return b.highest_round - a.highest_round;
                }
                // Finally by number of tournaments participated in
                return b.tournament_count - a.tournament_count;
            })
            .slice(0, limit);
        
        res.status(200).json({
            status: 'success',
            data: {
                recentWinners: recentWinners.slice(0, 10), // Only return top 10 most recent
                topTeams,
                totalMatchups: totalMatchupsCount,
                timeFrame: `Last ${days} days`,
                processedTeams: Object.keys(teamStats).length
            }
        });
        
    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error retrieving global leaderboard data'
        });
    }
};

// Get matchups for specific team in a tournament
const getTeamMatchups = async (req, res) => {
    try {
        const { tournamentId, teamId } = req.params;
        
        // Check if tournament exists
        const tournament = await Tournament.findByPk(tournamentId);
        if (!tournament) {
            return res.status(404).json({
                status: 'fail',
                message: 'Tournament not found'
            });
        }
        
        // Check if team exists
        const team = await TournamentTeam.findOne({
            where: { 
                Team_id: teamId,
                Tournament_Id: tournamentId
            }
        });
        
        if (!team) {
            return res.status(404).json({
                status: 'fail',
                message: 'Team not found in this tournament'
            });
        }
        
        // Get all matchups for this team, ordered by round and creation date
        const matchups = await TournamentMatchUp.findAll({
            where: { 
                tournament_id: tournamentId,
                [Op.or]: [
                    { player1: teamId },
                    { player2: teamId }
                ]
            },
            order: [
                ['round_tag', 'ASC'],
                ['created_at', 'ASC']
            ],
            include: [
                {
                    model: TournamentTeam,
                    as: 'Team1',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'Team2',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'WinnerTeam',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                }
            ]
        });
        
        // Check if tournament is team-based or individual
        const isTeamBased = tournament.Team_Size_Limit > 1;
        
        // For solo tournaments, enhance team data with full user information
        let enhancedMatchups = matchups;
        if (!isTeamBased) {
            enhancedMatchups = await Promise.all(matchups.map(async (matchup) => {
                const matchupJson = matchup.toJSON();
                
                // Helper function to enhance team data with user info
                const enhanceTeamData = async (team) => {
                    if (!team || !team.team_members || team.team_members.length === 0) {
                        return team;
                    }
                    
                    // Get user IDs from team_members
                    const userIds = team.team_members.map(member => member.id);
                    
                    // Fetch full user details
                    const users = await User.findAll({
                        where: { user_id: userIds },
                        attributes: ['user_id', 'Name', 'email', 'GamerTag', 'profile_pic']
                    });
                    
                    // Add Members array with full user data
                    return {
                        ...team,
                        Members: users.map(user => user.toJSON())
                    };
                };
                
                // Enhance all team data
                if (matchupJson.Team1) {
                    matchupJson.Team1 = await enhanceTeamData(matchupJson.Team1);
                }
                if (matchupJson.Team2) {
                    matchupJson.Team2 = await enhanceTeamData(matchupJson.Team2);
                }
                if (matchupJson.WinnerTeam) {
                    matchupJson.WinnerTeam = await enhanceTeamData(matchupJson.WinnerTeam);
                }
                
                return matchupJson;
            }));
        }
        
        // Categorize matchups
        const pastMatchups = enhancedMatchups.filter(matchup => matchup.winner !== null);
        const upcomingMatchups = enhancedMatchups.filter(matchup => matchup.winner === null);
        
        // Count wins and losses
        const wins = pastMatchups.filter(matchup => matchup.winner === teamId).length;
        const losses = pastMatchups.length - wins;
        
        res.status(200).json({
            status: 'success',
            data: {
                tournament: {
                    id: tournament.tournament_id,
                    name: tournament.tournament_Name,
                    status: tournament.Status,
                    isTeamBased: isTeamBased
                },
                team: {
                    id: team.Team_id,
                    number: team.Team_Number
                },
                stats: {
                    total: enhancedMatchups.length,
                    wins,
                    losses,
                    winRate: pastMatchups.length > 0 ? Math.round((wins / pastMatchups.length) * 100) : 0
                },
                matchups: enhancedMatchups,
                pastMatchups,
                upcomingMatchups
            }
        });
        
    } catch (error) {
        console.error('Get team matchups error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error retrieving team matchups'
        });
    }
};

// Get the latest matchup for a user's team in a tournament
const getUserLatestMatchup = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user.user_id;
        
        
        
        // Check if tournament exists
        const tournament = await Tournament.findByPk(tournamentId);
        if (!tournament) {
            
            return res.status(404).json({
                status: 'fail',
                message: 'Tournament not found'
            });
        }
        
        
        
        // Find the user's team in this tournament
        // For single player tournaments, users might be in teams with just themselves
        // For team tournaments, users should be in teams with multiple members
        let userTeam = await TournamentTeam.findOne({
            where: {
                Tournament_Id: tournamentId,
                team_members: {
                    [Op.contains]: [{ id: userId }]
                }
            }
        });
        
        
        
        if (!userTeam) {
            // If no team found, check if user is a direct participant (for single player tournaments)
            const directParticipant = await TournamentParticipant.findOne({
                where: {
                    user_id: userId,
                    tournament_id: tournamentId,
                    participation_status: 'confirmed'
                }
            });
            
            
            
            if (!directParticipant) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'You are not participating in this tournament'
                });
            }
            
            // For single players, try to find any team that might represent them
            // or look for matchups where they might be directly referenced
            const allTeams = await TournamentTeam.findAll({
                where: {
                    Tournament_Id: tournamentId
                }
            });
            
            
            
            // Check if any team has this user (in case of data inconsistency)
            const foundTeam = allTeams.find(team => 
                team.team_members && team.team_members.some(member => member.id === userId)
            );
            
            
            
            if (!foundTeam) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'No team record found for your participation in this tournament'
                });
            }
            
            // Use the found team
            userTeam = foundTeam;
        }
        
        
        
        // Find the latest matchup for this team (highest round_tag, most recent created_at)
        const latestMatchup = await TournamentMatchUp.findOne({
            where: {
                tournament_id: tournamentId,
                [Op.or]: [
                    { player1: userTeam.Team_id },
                    { player2: userTeam.Team_id }
                ]
            },
            order: [
                ['round_tag', 'DESC'],
                ['created_at', 'DESC']
            ],
            include: [
                {
                    model: TournamentTeam,
                    as: 'Team1',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'Team2',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                },
                {
                    model: TournamentTeam,
                    as: 'WinnerTeam',
                    attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                }
            ]
        });
        
        
        
        if (!latestMatchup) {
            return res.status(404).json({
                status: 'fail',
                message: 'No matchups found for your team in this tournament'
            });
        }
        
        // Determine if user's team is player1 or player2
        const isPlayer1 = latestMatchup.player1 === userTeam.Team_id;
        const opponentTeam = isPlayer1 ? latestMatchup.Team2 : latestMatchup.Team1;
        
        
        
        res.status(200).json({
            status: 'success',
            data: {
                matchup: {
                    matchup_id: latestMatchup.matchup_id,
                    round: latestMatchup.round_tag,
                    scheduled_time: latestMatchup.scheduled_time,
                    completed_at: latestMatchup.completed_at,
                    room_code: latestMatchup.room_code,
                    room_password: latestMatchup.room_password,
                    winner: latestMatchup.winner,
                    status: latestMatchup.winner ? 'completed' : 'upcoming'
                },
                userTeam: {
                    id: userTeam.Team_id,
                    number: userTeam.Team_Number,
                    name: userTeam.Team_Name,
                    isPlayer1: isPlayer1
                },
                opponentTeam: opponentTeam ? {
                    id: opponentTeam.Team_id,
                    number: opponentTeam.Team_Number,
                    name: opponentTeam.Team_Name
                } : null,
                tournament: {
                    id: tournament.tournament_id,
                    name: tournament.tournament_Name,
                    status: tournament.Status
                }
            }
        });
        
    } catch (error) {
        console.error('Get user latest matchup error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error retrieving latest matchup'
        });
    }
};

// Update matchup room details (room code and password)
const updateMatchupRoomDetails = async (req, res) => {
    try {
        const { matchup_id } = req.params;
        const { room_code, room_password } = req.body;
        const userId = req.user.user_id;
        
        const result = await sequelize.transaction(async (t) => {
            // Find the matchup with team information
            const matchup = await TournamentMatchUp.findByPk(matchup_id, {
                include: [
                    {
                        model: TournamentTeam,
                        as: 'Team1',
                        attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                    },
                    {
                        model: TournamentTeam,
                        as: 'Team2',
                        attributes: ['Team_id', 'Team_Number', 'Team_Name', 'team_members']
                    },
                    {
                        model: Tournament,
                        as: 'Tournament',
                        attributes: ['tournament_id', 'tournament_Name', 'Team_Size_Limit']
                    }
                ],
                transaction: t
            });
            
            if (!matchup) {
                return {
                    error: true,
                    statusCode: 404,
                    message: 'Matchup not found'
                };
            }
            
            // Check if user is a super admin or temp admin for this tournament
            const isAdmin = await UserAdmin.findOne({
                where: {
                    user_id: userId,
                    associated_tournament_id: matchup.tournament_id,
                    role: { [Op.in]: ['super_admin', 'temp_admin'] },
                    start_time: { [Op.lte]: new Date() },
                    end_time: { [Op.gt]: new Date() }
                },
                transaction: t
            });
            
            if (!isAdmin) {
                return {
                    error: true,
                    statusCode: 403,
                    message: 'Only tournament admins can update matchup room details'
                };
            }
            
            // Update the matchup with room details
            await matchup.update({
                room_code: room_code || null,
                room_password: room_password || null
            }, { transaction: t });
            
            return {
                error: false,
                matchup: {
                    matchup_id: matchup.matchup_id,
                    room_code: matchup.room_code,
                    room_password: matchup.room_password,
                    round: matchup.round_tag,
                    tournament_id: matchup.tournament_id
                },
                tournament: matchup.Tournament,
                team1: matchup.Team1,
                team2: matchup.Team2
            };
        });
        
        // Check if there was an error in the transaction
        if (result.error) {
            return res.status(result.statusCode).json({
                status: 'fail',
                message: result.message
            });
        }
        
        // Send email notifications to team leaders if room details were provided
        if ((room_code || room_password) && result.tournament && (result.team1 || result.team2)) {
            try {
                const emailPromises = [];
                
                // Helper function to get team leader email
                const getTeamLeaderEmail = async (team) => {
                    if (!team || !team.team_members || !Array.isArray(team.team_members)) {
                        return null;
                    }
                    
                    // Find the leader in team members
                    const leader = team.team_members.find(member => 
                        member && typeof member === 'object' && member.leader === true
                    );
                    
                    if (!leader || !leader.id) {
                        return null;
                    }
                    
                    // Get user details
                    const user = await User.findByPk(leader.id, {
                        attributes: ['user_id', 'Name', 'email']
                    });
                    
                    return user;
                };
                
                // Helper function to get team display name
                const getTeamDisplayName = (team) => {
                    if (!team) return 'Unknown Team';
                    if (team.Team_Name) return team.Team_Name;
                    if (team.Team_Number) return `Team #${team.Team_Number}`;
                    return `Team ${team.Team_id.slice(-4)}`;
                };
                
                // Get team leaders and send emails
                const team1Leader = result.team1 ? await getTeamLeaderEmail(result.team1) : null;
                const team2Leader = result.team2 ? await getTeamLeaderEmail(result.team2) : null;
                
                const matchupDetails = {
                    round: result.matchup.round || 'Unknown',
                    opponentTeam: null
                };
                
                // Send email to Team 1 leader
                if (team1Leader && team1Leader.email) {
                    matchupDetails.opponentTeam = result.team2 ? getTeamDisplayName(result.team2) : 'TBD';
                    
                    emailPromises.push(
                        sendRoomDetailsEmail(
                            team1Leader.email,
                            team1Leader.Name,
                            result.tournament.tournament_Name,
                            room_code,
                            room_password,
                            true, // isMatchupSpecific
                            matchupDetails
                        )
                    );
                }
                
                // Send email to Team 2 leader
                if (team2Leader && team2Leader.email) {
                    matchupDetails.opponentTeam = result.team1 ? getTeamDisplayName(result.team1) : 'TBD';
                    
                    emailPromises.push(
                        sendRoomDetailsEmail(
                            team2Leader.email,
                            team2Leader.Name,
                            result.tournament.tournament_Name,
                            room_code,
                            room_password,
                            true, // isMatchupSpecific
                            matchupDetails
                        )
                    );
                }
                
                // Send all emails concurrently
                if (emailPromises.length > 0) {
                    await Promise.allSettled(emailPromises);
                    
                }
                
            } catch (emailError) {
                console.error('Error sending room details emails:', emailError);
                // Don't fail the request if email sending fails
            }
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Matchup room details updated successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Update matchup room details error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Error updating matchup room details'
        });
    }
};

module.exports = {
    generateInitialMatchups,
    generateNextRoundMatchups,
    getTournamentMatchups,
    getMatchupById,
    updateMatchupWinner,
    deleteMatchup,
    deleteAllTournamentMatchups,
    deleteLatestRoundMatchups,
    getGlobalLeaderboard,
    getTeamMatchups,
    getUserLatestMatchup,
    updateMatchupRoomDetails
}; 