const {
  Tournament,
  TournamentParticipant,
  User,
  TournamentTeam,
  UserAdmin,
  TournamentPayment,
  TournamentContent,
  TournamentGameStat,
  TournamentPost,
  TournamentMatchUp,
  Sponsor
} = require("../models");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { 
  sendTournamentCreationEmail, 
  sendTeamCreationEmail, 
  sendTeamMemberJoinedEmail, 
  sendTournamentRegistrationEmail,
  sendTournamentNotificationEmail,
  sendTournamentApprovalEmail,
  sendRoomDetailsEmail
} = require("../utils/emailService");
const { uploadToS3, deleteFromS3, getKeyFromUrl, getPresignedUrl } = require('../utils/s3Service');

// Create tournament
const createTournament = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const tournamentData = req.body;
    let mainBannerKey = null;

    // Validate dates before proceeding (removed registration start time constraint)
    if (tournamentData.Registration_Start_Time && tournamentData.Registration_End_Time && 
        tournamentData.Event_Start_Time && tournamentData.Event_End_Time) {
      
      const regStart = new Date(tournamentData.Registration_Start_Time);
      const regEnd = new Date(tournamentData.Registration_End_Time);
      const evStart = new Date(tournamentData.Event_Start_Time);
      const evEnd = new Date(tournamentData.Event_End_Time);
      
      // Check chronological order only (removed past date validation)
      if (regEnd <= regStart) {
        return res.status(400).json({
          status: "fail",
          message: "Registration end time must be after registration start time"
        });
      }
      
      if (evStart <= regEnd) {
        return res.status(400).json({
          status: "fail",
          message: "Event start time must be after registration end time"
        });
      }
      
      if (evEnd <= evStart) {
        return res.status(400).json({
          status: "fail",
          message: "Event end time must be after event start time"
        });
      }
    }

    // Upload banner image to S3 if provided (only store the key)
    if (req.file) {
      
      const uploadResult = await uploadToS3(req.file, 'tournaments/banners');
      
      if (uploadResult.status === 'success') {
        mainBannerKey = uploadResult.key;
        
      } else {
        console.error('Failed to upload banner:', uploadResult.message);
        return res.status(500).json({
          status: "error",
          message: "Failed to upload tournament banner image"
        });
      }
    }

    // Parse Prize_Distribution if provided as JSON string
    if (tournamentData.Prize_Distribution && typeof tournamentData.Prize_Distribution === 'string') {
      try {
        tournamentData.Prize_Distribution = JSON.parse(tournamentData.Prize_Distribution);
      } catch (parseError) {
        console.error('Error parsing Prize_Distribution:', parseError);
        return res.status(400).json({
          status: "fail",
          message: "Invalid Prize_Distribution format"
        });
      }
    }

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // Create tournament (only store the key, not the URL)
      const tournament = await Tournament.create(
        {
          ...tournamentData,
          listed_by: userId,
          main_banner_key: mainBannerKey
        },
        { transaction: t }
      );

      const endTime = new Date(tournament.Event_End_Time);
      endTime.setFullYear(endTime.getFullYear() + 1);

      // Create temporary admin record for the tournament creator
      await UserAdmin.create(
        {
          user_id: userId,
          associated_tournament_id: tournament.tournament_id,
          start_time: new Date().toISOString(),
          end_time: endTime.toISOString(),
          role: "super_admin",
        },
        { transaction: t }
      );

      // Create team or individual slots based on tournament type
      if (tournament.Team_Size_Limit > 1) {
        // For team tournaments, create team slots
        const teamCount = Math.ceil(
          tournament.Max_Players_Allowed / tournament.Team_Size_Limit
        );
        const teamSlots = Array(teamCount)
          .fill()
          .map((_, index) => ({
            Tournament_Id: tournament.tournament_id,
            Team_Number: index + 1,
          }));
        await TournamentTeam.bulkCreate(teamSlots, { transaction: t });
      } else {
        // For individual tournaments, create individual slots
        const playerSlots = Array(tournament.Max_Players_Allowed)
          .fill()
          .map((_, index) => ({
            Tournament_Id: tournament.tournament_id,
            Team_Number: index + 1,
            team_members: [], // Initialize empty team_members array
          }));
        await TournamentTeam.bulkCreate(playerSlots, { transaction: t });
      }
      return tournament;
    });

    // Get user info for email
    const user = await User.findByPk(userId);
    
    // Send confirmation email to tournament creator
    if (user && user.email) {
      try {
        const eventDate = new Date(result.Event_Start_Time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const tournamentDetails = {
          tournamentId: result.tournament_id,
          gameName: result.GameName || 'Not specified',
          startDate: eventDate,
          currency: result.Currency || 'USD',
          prizeAmount: result.Prize_Amount || 0,
          registrationAmount: result.Registration_Amount || 0,
          teamSize: result.Team_Size_Limit || 1,
          maxPlayers: result.Max_Players_Allowed || 0,
          isBracket: result.Is_Bracket_Competition || false,
          status: result.Status || 'Coming Soon'
        };
        
        await sendTournamentCreationEmail(
          user.email,
          user.Name || 'Tournament Organizer',
          result.tournament_Name,
          eventDate,
          tournamentDetails
        );
        
      } catch (emailError) {
        console.error('Error sending tournament creation email:', emailError);
        // Continue with response even if email fails
      }
    }

    // Send notification to administrator about tournament that needs approval
    try {
      // Hard-coded admin email - in a production environment, this should come from an environment variable
      const adminEmail = process.env.ADMIN_EMAIL;
      
      // Format date for email
      const startDate = new Date(result.Event_Start_Time).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Ensure all tournament details are available and handle edge cases
      const tournamentDetails = {
        tournamentId: result.tournament_id,
        gameName: result.GameName || 'Not specified',
        startDate: startDate,
        currency: result.Currency || 'USD',
        prizeAmount: result.Prize_Amount || 0,
        teamSize: result.Team_Size_Limit || 1,
        maxPlayers: result.Max_Players_Allowed || 0
      };

      // Get creator's name from user record
      const creatorName = user ? (user.Name || 'Tournament Organizer') : 'Tournament Organizer';

      // Send notification to admin with all required details
      await sendTournamentNotificationEmail(
        adminEmail,
        {
          tournamentId: result.tournament_id,
          tournament_Name: result.tournament_Name,
          GameName: result.GameName,
          Event_Start_Time: result.Event_Start_Time,
          Currency: result.Currency,
          Prize_Amount: result.Prize_Amount,
          Registration_Amount: result.Registration_Amount,
          Team_Size_Limit: result.Team_Size_Limit,
          Max_Players_Allowed: result.Max_Players_Allowed,
          Is_Bracket_Competition: result.Is_Bracket_Competition,
          Status: result.Status
        }
      );
      
      
    } catch (notifyError) {
      console.error('Error sending tournament notification to admin:', notifyError);
      // Continue with response even if admin notification fails
    }

    
    
    res.status(201).json({
      status: "success",
      message: "Tournament created successfully",
      data: {
        tournament: result
      }
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    
    // Handle Sequelize validation and constraint errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status: "fail",
        message: error.errors.map(err => err.message).join(', ')
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Provide specific error messages for unique constraint violations
      const field = error.errors[0]?.path;
      let message = 'A tournament with this information already exists';
      
      if (field === 'tournament_Name') {
        message = 'A tournament with this name already exists. Please choose a different name.';
      } else if (field === 'Tournament_Code') {
        message = 'A tournament with this code already exists. Please choose a different code.';
      }
      
      return res.status(400).json({
        status: "fail",
        message: message
      });
    }
    
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create tournament"
    });
  }
};

// Get tournament details
const getTournamentDetails = async (req, res) => {
  try {
    const userId = req.user?.user_id; // Optional chaining in case user is not authenticated
    // Add a flag to check if the request is coming from the private code endpoint
    const isPrivateCodeAccess = req.query.accessedByCode === 'true';
    
    const tournament = await Tournament.findByPk(req.params.tournamentId, {
      include: [
        {
          model: User,
          as: "ListedByUser",
          attributes: ["user_id", "Name"],
        },
      ],
    });

    if (!tournament) {
      return res.status(404).json({
        status: "fail",
        message: "Tournament not found",
      });
    }
    
    // Check if the tournament is approved and not private
    // Only show if: 
    // 1. Tournament is approved AND not private, OR
    // 2. User is the tournament creator, OR
    // 3. User is an admin for this tournament, OR
    // 4. User has accessed via valid private code, OR
    // 5. User is a participant of this tournament
    const isCreator = userId && tournament.listed_by === userId;
    let isAdmin = false;
    let isParticipant = false;

    if (userId && !isCreator) {
      // Check if user is an admin
      isAdmin = await UserAdmin.findOne({
        where: {
          user_id: userId,
          associated_tournament_id: tournament.tournament_id,
        }
      });

      // Check if user is a participant
      if (!isAdmin) {
        const participant = await TournamentParticipant.findOne({
          where: {
            user_id: userId,
            tournament_id: tournament.tournament_id,
          }
        });
        
        isParticipant = !!participant;
      }
    }

    // Modified permission check to include isPrivateCodeAccess and isParticipant
    if (!tournament.is_approved || (tournament.Is_Private && !isPrivateCodeAccess)) {
      if (!isCreator && !isAdmin && !isParticipant) {
        return res.status(403).json({
          status: "fail",
          message: "You do not have permission to view this tournament",
        });
      }
    }

    // Get additional tournament data
    let availableSlots = 0;
    let leaderboard = null;
    let timeline = null;

    try {
      // Get available slots
      availableSlots = await tournament.getAvailableSlots();

      // Get leaderboard if tournament is in progress or ended
      if (["In Progress", "Ended"].includes(tournament.Status)) {
        leaderboard = await tournament.getLeaderboard();
      }

      // Get timeline for bracket tournaments
      if (tournament.Is_Bracket_Competition) {
        timeline = await tournament.getTimeline();
      }
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    }

    // Generate fresh presigned URLs for banner images
    // Refresh all banner URLs using the new model method
    const bannerRefreshResult = await tournament.refreshAllBanners();
    let mainBannerUrl = null;
    let additionalBannerUrls = [];
    
    if (bannerRefreshResult.status === 'success') {
      mainBannerUrl = bannerRefreshResult.mainBanner;
      additionalBannerUrls = bannerRefreshResult.additionalBanners;
    } else {
      console.error('Failed to refresh banner URLs:', bannerRefreshResult.message);
    }

    // Add a flag indicating if the user is the creator, admin, or participant
    // Also add a flag if they accessed via private code
    const tournamentData = {
      ...tournament.toJSON(),
      availableSlots,
      leaderboard,
      timeline,
      isCreator: !!isCreator,
      isAdmin: !!isAdmin,
      isParticipant: !!isParticipant,
      isPrivateCodeAccess: !!isPrivateCodeAccess,
      main_banner: mainBannerUrl,
      tournament_banners: additionalBannerUrls
    };

    res.status(200).json({
      status: "success",
      data: tournamentData,
    });
  } catch (error) {
    console.error("Tournament fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching tournament details",
    });
  }
};

// Update tournament status
const updateTournamentStatus = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;
    const now = new Date();

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: "fail",
        message: "Tournament not found",
      });
    }

    // Check if user is a tournament admin
    const adminRecord = await UserAdmin.findOne({
      where: {
        user_id: userId,
        associated_tournament_id: tournamentId,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gt]: now },
      },
    });

    if (!adminRecord) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to update tournament status",
      });
    }

    await tournament.update({ Status: status });

    res.status(200).json({
      status: "success",
      data: tournament,
    });
  } catch (error) {
    console.error("Tournament status update error:", error);
    res.status(500).json({
      status: "error",
      message: "Error updating tournament status",
    });
  }
};

// Search tournaments
const searchTournaments = async (req, res) => {
  try {
    const {
      status,
      gameName,
      isPrivate,
      isOffline,
      minPrize,
      maxPrize,
      startDate,
      endDate,
      includeUnapproved = "false",
      includePrivate = "false"
    } = req.query;

    const userId = req.user?.user_id; // Optional chaining in case user is not authenticated

    // Build where clause
    const where = {};
    if (status) where.Status = status;
    if (gameName) where.GameName = gameName;
    
    // Handle online/offline filter
    if (isOffline !== undefined) {
      where.Is_Offline = isOffline === "true";
    }
    
    // Handle isPrivate parameter - default to false unless explicitly overridden
    if (isPrivate !== undefined) {
      where.Is_Private = isPrivate === "true";
    } else if (includePrivate !== "true") {
      // Default behavior: exclude private tournaments
      where.Is_Private = false;
    }
    
    // By default, only show approved tournaments unless explicitly overridden
    if (includeUnapproved !== "true") {
      where.is_approved = true;
    }
    
    if (minPrize) where.Prize_Amount = { [Op.gte]: minPrize };
    if (maxPrize)
      where.Prize_Amount = { ...where.Prize_Amount, [Op.lte]: maxPrize };

    // Date filters
    if (startDate) where.Event_Start_Time = { [Op.gte]: new Date(startDate) };
    if (endDate) where.Event_End_Time = { [Op.lte]: new Date(endDate) };

    // If the user is logged in, include their private/unapproved tournaments
    if (userId) {
      // Create separate query for user's own tournaments
      const userWhere = { ...where };
      delete userWhere.Is_Private; // Remove private restriction for user's own tournaments
      delete userWhere.is_approved; // Remove approval restriction for user's own tournaments
      
      // Final query using OR condition to include user's own tournaments
      where[Op.or] = [
        { ...where }, // Original filtered tournaments (approved & public)
        {
          ...userWhere,
          listed_by: userId // User's own tournaments regardless of privacy/approval
        }
      ];
    }

    // Remove pagination - return all tournaments
    const tournaments = await Tournament.findAll({
      where,
      include: [
        {
          model: User,
          as: "ListedByUser",
          attributes: ["user_id", "Name"],
        },
      ],
      order: [["listed_at", "DESC"]],
    });

    // Add ownership flags to each tournament
    const enhancedTournaments = tournaments.map(tournament => {
      const tournamentJson = tournament.toJSON();
      return {
        ...tournamentJson,
        isCreator: userId && tournament.listed_by === userId,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        tournaments: enhancedTournaments,
        total: enhancedTournaments.length,
      },
    });
  } catch (error) {
    console.error("Tournament search error:", error);
    res.status(500).json({
      status: "error",
      message: "Error searching tournaments",
    });
  }
};

// Get upcoming tournaments
const getUpcomingTournaments = async (req, res) => {
  try {
    const { isOffline } = req.query;
    const userId = req.user?.user_id; // Optional chaining in case user is not authenticated

    // Base query for public, approved tournaments
    const baseWhere = {
      Status: ["Coming Soon", "Accepting Registrations"],
      // Event_Start_Time: {
      //   [Op.gt]: new Date(),
      // },
      is_approved: true,
      Is_Private: false
    };
    
    // Handle online/offline filter
    if (isOffline !== undefined) {
      baseWhere.Is_Offline = isOffline === "true";
    }
    
    let where = baseWhere;

    // If user is logged in, include their own tournaments (even if private/unapproved)
    if (userId) {
      const userWhere = {
        Status: ["Accepting Registrations", "Registrations Closed"],
        Event_Start_Time: {
          [Op.gt]: new Date(),
        },
        listed_by: userId // User's own tournaments
      };
      
      // Apply offline filter to user's tournaments too
      if (isOffline !== undefined) {
        userWhere.Is_Offline = isOffline === "true";
      }
      
      where = {
        [Op.or]: [
          baseWhere, // Public approved tournaments
          userWhere
        ]
      };
    }

    const tournaments = await Tournament.findAll({
      where,
      include: [
        {
          model: User,
          as: "ListedByUser",
          attributes: ["user_id", "Name"],
        },
      ],
      order: [["Event_Start_Time", "ASC"]],
    });

    // Add ownership flags to each tournament
    const enhancedTournaments = tournaments.map(tournament => {
      const tournamentJson = tournament.toJSON();
      return {
        ...tournamentJson,
        isCreator: userId && tournament.listed_by === userId,
      };
    });

    res.status(200).json({
      status: "success",
      data: enhancedTournaments,
    });
  } catch (error) {
    console.error("Upcoming tournaments fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching upcoming tournaments",
    });
  }
};

// Get past tournaments
const getPastTournaments = async (req, res) => {
  try {
    const { isOffline, limit = 10, page = 1 } = req.query;
    const userId = req.user?.user_id; // Optional chaining in case user is not authenticated
    const offset = (page - 1) * limit;

    // Base query for public, approved tournaments that have ended
    const baseWhere = {
      Status: ["Ended", "In Progress", "Registrations Closed"],
      // Event_Start_Time: {
      //   [Op.lt]: new Date(),
      // },
      // Event_End_Time: {
      //   [Op.lt]: new Date(),
      // },
      is_approved: true,
      Is_Private: false
    };
    
    // Handle online/offline filter
    if (isOffline !== undefined) {
      baseWhere.Is_Offline = isOffline === "true";
    }
    
    let where = baseWhere;

    // If user is logged in, include their own tournaments (even if private/unapproved)
    if (userId) {
      const userWhere = {
        Status: ["Ended"],
        Event_End_Time: {
          [Op.lt]: new Date(),
        },
        listed_by: userId // User's own tournaments
      };
      
      // Apply offline filter to user's tournaments too
      if (isOffline !== undefined) {
        userWhere.Is_Offline = isOffline === "true";
      }
      
      where = {
        [Op.or]: [
          baseWhere, // Public approved tournaments
          userWhere
        ]
      };
    }

    const tournaments = await Tournament.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "ListedByUser",
          attributes: ["user_id", "Name"],
        },
      ],
      // limit,
      // offset,
      order: [["Event_End_Time", "DESC"]],
    });

    // Add ownership flags to each tournament
    const enhancedTournaments = tournaments.rows.map(tournament => {
      const tournamentJson = tournament.toJSON();
      return {
        ...tournamentJson,
        isCreator: userId && tournament.listed_by === userId,
      };
    });

    res.status(200).json({
      status: "success",
      data: {
        tournaments: enhancedTournaments,
        pagination: {
          total: tournaments.count,
          currentPage: page,
          totalPages: Math.ceil(tournaments.count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Past tournaments fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching past tournaments",
    });
  }
};

// Delete tournament
const deleteTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const requestingUserId = req.user.user_id;

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // Check if tournament exists
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t,
      });
      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message: "Tournament not found",
        };
      }

      // Check if requesting user is a super admin
      const isSuperAdmin = await UserAdmin.isSuperAdmin(
        requestingUserId,
        tournamentId
      );
      if (!isSuperAdmin) {
        return {
          error: true,
          statusCode: 403,
          message: "Only super admins can delete tournaments",
        };
      }

      // Check if tournament can be deleted
      if (["In Progress", "Ended"].includes(tournament.Status)) {
        return {
          error: true,
          statusCode: 400,
          message:
            "Cannot delete tournaments that are in progress or have ended",
        };
      }

      // Delete related records in proper order to handle foreign key constraints
      await Promise.all([
        // Delete tournament posts and their comments first
        TournamentPost.destroy({
          where: { Tournament_Id: tournamentId },
          transaction: t,
        }),
        // Delete tournament game stats
        TournamentGameStat.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete tournament match-ups
        TournamentMatchUp.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete tournament content
        TournamentContent.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete sponsors
        Sponsor.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete payments - THIS WAS MISSING
        TournamentPayment.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete participants
        TournamentParticipant.destroy({
          where: { tournament_id: tournamentId },
          transaction: t,
        }),
        // Delete teams
        TournamentTeam.destroy({
          where: { Tournament_Id: tournamentId },
          transaction: t,
        }),
        // Delete admin records
        UserAdmin.destroy({
          where: { associated_tournament_id: tournamentId },
          transaction: t,
        }),
      ]);

      // Delete S3 banners before deleting tournament
      try {
        if (tournament.main_banner_key) {
          await deleteFromS3(tournament.main_banner_key);
          
        }
        
        if (tournament.tournament_banners && Array.isArray(tournament.tournament_banners)) {
          for (const bannerKey of tournament.tournament_banners) {
            if (bannerKey) {
              await deleteFromS3(bannerKey);
              
            }
          }
        }
      } catch (s3Error) {
        console.error('Error deleting tournament banners from S3:', s3Error);
        // Continue with tournament deletion even if S3 cleanup fails
      }

      // Delete tournament
      await tournament.destroy({ transaction: t });

      return {
        error: false,
        tournament: tournament.toJSON(),
      };
    });

    // Check if there was an error in the transaction
    if (result.error) {
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Tournament deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Delete tournament error:", error);
    res.status(error.message.includes("Tournament") ? 400 : 500).json({
      status: "fail",
      message: error.message || "Error deleting tournament",
    });
  }
};

// Create Tournament Team
const createTournamentTeam = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamPassword, teamName } = req.body;
    const userId = req.user.user_id;

    const result = await sequelize.transaction(async (t) => {
      // 1. Check if tournament is accepting registrations
      const tournament = await Tournament.findOne({
        where: {
          tournament_id: tournamentId,
          Status: "Accepting Registrations",
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message: "Tournament not found or not accepting registrations",
        };
      }

      // 2. Check if user already in a team for this tournament
      const existingTeam = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          team_members: { [Op.overlap]: [{ id: userId }] },
        },
        transaction: t,
      });

      if (existingTeam) {
        return {
          error: true,
          statusCode: 409,
          message: "User is already in a team for this tournament",
        };
      }

      // 3. Check for existing slot membership using manual approach
      const allTeamSlots = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });
      
      // Manually check if user is in any team
      let existingSlotMembership = null;
      for (const slot of allTeamSlots) {
        if (slot.team_members && Array.isArray(slot.team_members)) {
          const userExists = slot.team_members.some(member => {
            if (typeof member === 'object' && member !== null) {
              return String(member.id) === String(userId);
            }
            return String(member) === String(userId);
          });
          
          if (userExists) {
            existingSlotMembership = slot;
            break;
          }
        }
      }

      if (existingSlotMembership) {
        return {
          error: true,
          statusCode: 409,
          message: "You already have a slot reserved in this tournament",
        };
      }

      // 4. Check if user is already a participant
      const existingParticipant = await TournamentParticipant.findOne({
        where: {
          tournament_id: tournamentId,
          user_id: userId,
        },
        transaction: t,
      });

      if (existingParticipant) {
        // Check if it's a pending reservation that hasn't expired
        if (existingParticipant.participation_status === "pending") {
          const reservationTime = new Date(existingParticipant.last_update_at);
          const now = new Date();
          const timeDiff = now.getTime() - reservationTime.getTime();
          const tenMinutes = 10 * 60 * 1000;

          if (timeDiff < tenMinutes) {
            return {
              error: true,
              statusCode: 409,
              message: "You already have a pending reservation for this tournament. Please complete payment or wait for it to expire.",
            };
          }
        } else {
          return {
            error: true,
            statusCode: 409,
            message: "User is already a participant in this tournament",
          };
        }
      }

      // 5. Create or find an available team slot
      const availableTeam = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          [Op.or]: [{ team_members: { [Op.eq]: [] } }, { team_members: null }],
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!availableTeam) {
        return {
          error: true,
          statusCode: 400,
          message: "No available team slots",
        };
      }

      if (!availableTeam.team_members) availableTeam.team_members = [];

      // 6. Reserve the team slot and create Stripe session
      availableTeam.team_members = [
        ...availableTeam.team_members,
        { id: userId, leader: true },
      ];

      // Set team password if provided
      if (teamPassword) {
        availableTeam.Team_Password = teamPassword;
      }
      
      // Set team name if provided
      if (teamName) {
        // Check if team name is already taken in this tournament
        const teamNameExists = await TournamentTeam.findOne({
          where: {
            Tournament_Id: tournamentId,
            Team_Name: teamName,
            Team_id: { [Op.ne]: availableTeam.Team_id } // Exclude current team
          },
          transaction: t
        });
        
        if (teamNameExists) {
          return {
            error: true,
            statusCode: 409,
            message: "Team name is already taken in this tournament"
          };
        }
        
        availableTeam.Team_Name = teamName;
      }
      
      // Save the team slot with the user
      await availableTeam.save({ transaction: t });

      // Create a temporary reservation record with expiration info
      await TournamentParticipant.create({
        user_id: userId,
        tournament_id: tournamentId,
        participation_status: "pending",
        last_update_at: new Date().toISOString(),
      }, { transaction: t });

      // Calculate total registration amount including fees
      const totalAmount = tournament.getTotalRegistrationAmount();

      // 7. Create Stripe Checkout session for payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: tournament.Currency,
              product_data: {
                name: `Tournament Slot for ${tournament.tournament_Name}`,
              },
              unit_amount: Math.round(totalAmount * 100), // Stripe requires amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:4000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:4000/payment-cancel`,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes from now
        metadata: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_type: 'team_registration'
        }
      });

      // Create a payment record with pending status
      await TournamentPayment.create({
        user_id: userId,
        tournament_id: tournamentId,
        amount: totalAmount,
        currency: tournament.Currency,
        payment_mode: 'STRIPE',
        payment_details: {
          session_id: session.id,
          payment_intent: session.payment_intent,
          status: 'pending',
          checkout_url: session.url,
          payment_type: 'team_registration',
          created_at: new Date().toISOString()
        }
      }, { transaction: t });

      return { 
        checkoutUrl: session.url,
        team_id: availableTeam.Team_id,
        session_id: session.id
      };
    });

    if (result.error) {
      return res
        .status(result.statusCode)
        .json({ status: "fail", message: result.message });
    }

    // 8. Send redirect URL to frontend
    res.status(200).json({
      status: "success",
      message: "Team slot reserved. Please proceed to payment.",
      data: result,
    });
  } catch (error) {
    console.error("Error creating tournament team:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating tournament team",
    });
  }
};

// Confirm slot payment
const confirmSlotPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const { tournamentId } = req.params;
    const userId = req.user.user_id;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure session is successful
    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ status: "fail", message: "Payment not completed" });
    }

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // 1. Find the team slot for this user
      const teamSlot = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          team_members: { [Op.contains]: [{ id: userId, leader: true }] },
        },
        transaction: t
      });

      if (!teamSlot) {
        return {
          error: true,
          statusCode: 404,
          message: "No team reservation found for this user."
        };
      }

      // 2. Find and update the participant record from pending to confirmed
      const participant = await TournamentParticipant.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "pending",
        },
        transaction: t
      });

      if (!participant) {
        return {
          error: true,
          statusCode: 404,
          message: "No pending reservation found for this user."
        };
      }

      // Update the participation status to confirmed
      await participant.update({
        participation_status: "confirmed",
        last_update_at: new Date().toISOString(),
      }, { transaction: t });

      // Find the tournament to get payment details
      const tournament = await Tournament.findByPk(tournamentId, { transaction: t });
      
      // Calculate total amount including fees
      const totalAmount = tournament.getTotalRegistrationAmount();
      
      // Find the existing payment record and update it to completed
      const paymentRecord = await TournamentPayment.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_details: {
            session_id: sessionId
          }
        },
        transaction: t
      });

      if (paymentRecord) {
        // Update the existing payment record
        paymentRecord.payment_details = {
          ...paymentRecord.payment_details,
          status: 'completed',
          payment_intent: session.payment_intent,
          completed_at: new Date().toISOString()
        };
        paymentRecord.amount = totalAmount; // Update with correct total amount
        await paymentRecord.save({ transaction: t });
      } else {
        // Create a new payment record if none exists
        await TournamentPayment.create({
          user_id: userId,
          tournament_id: tournamentId,
          amount: totalAmount,
          currency: tournament.Currency,
          payment_mode: 'STRIPE',
          payment_details: {
            session_id: sessionId,
            payment_intent: session.payment_intent,
            status: 'completed',
            payment_type: 'team_registration',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          }
        }, { transaction: t });
      }

      // Get user details
      const userDetails = await User.findByPk(userId, {
        attributes: ["user_id", "Name", "GamerTag", "email"],
        transaction: t
      });

      return {
        error: false,
        participant: participant.toJSON(),
        user: userDetails.toJSON(),
        team: {
          Team_id: teamSlot.Team_id,
          Team_Number: teamSlot.Team_Number,
          Team_Name: teamSlot.Team_Name,
          Team_Password: teamSlot.Team_Password
        },
        tournament: tournament
      };
    });

    if (result.error) {
      return res
        .status(result.statusCode)
        .json({ status: "fail", message: result.message });
    }
    
    // Send email to team leader after successful team creation
    if (result.user && result.user.email) {
      try {
        const tournamentDate = new Date(result.tournament.Event_Start_Time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const tournamentDetails = {
          tournamentId: result.tournament.tournament_id,
          gameName: result.tournament.GameName || 'Not specified',
          startDate: tournamentDate,
          currency: result.tournament.Currency || 'USD',
          prizeAmount: result.tournament.Prize_Amount || 0,
          registrationAmount: result.tournament.Registration_Amount || 0,
          platformFee: result.tournament.Platform_fee || 0,
          organizerFee: result.tournament.Organizer_fee || 0,
          totalAmount: result.tournament.getTotalRegistrationAmount(),
          teamSize: result.tournament.Team_Size_Limit || 1,
          maxPlayers: result.tournament.Max_Players_Allowed || 0,
          isBracket: result.tournament.Is_Bracket_Competition || false,
          status: result.tournament.Status || 'Accepting Registrations'
        };
        
        await sendTeamCreationEmail(
          result.user.email,
          result.user.Name || 'Team Leader',
          result.team.Team_Name || `Team #${result.team.Team_Number}`,
          result.tournament.tournament_Name,
          result.team.Team_Password,
          tournamentDetails
        );
        
      } catch (emailError) {
        console.error('Error sending team creation email:', emailError);
        // Continue with response even if email fails
      }
      
      // Also send tournament registration confirmation email
      try {
        const tournamentDate = new Date(result.tournament.Event_Start_Time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const tournamentDetails = {
          tournamentId: result.tournament.tournament_id,
          gameName: result.tournament.GameName || 'Not specified',
          startDate: tournamentDate,
          currency: result.tournament.Currency || 'USD',
          prizeAmount: result.tournament.Prize_Amount || 0,
          registrationAmount: result.tournament.Registration_Amount || 0,
          platformFee: result.tournament.Platform_fee || 0,
          organizerFee: result.tournament.Organizer_fee || 0,
          totalAmount: result.tournament.getTotalRegistrationAmount(),
          teamSize: result.tournament.Team_Size_Limit || 1,
          maxPlayers: result.tournament.Max_Players_Allowed || 0,
          isBracket: result.tournament.Is_Bracket_Competition || false,
          status: result.tournament.Status || 'Accepting Registrations'
        };
        
        await sendTournamentRegistrationEmail(
          result.user.email,
          result.user.Name || 'Player',
          result.tournament.tournament_Name,
          tournamentDate,
          true,
          result.team.Team_Name || `Team #${result.team.Team_Number}`,
          tournamentDetails
        );
      } catch (emailError) {
        console.error('Error sending tournament registration email:', emailError);
      }
    }

    // 3. Respond with successful booking
    res.status(200).json({
      status: "success",
      message: "Team slot booked successfully.",
      data: {
        participant: result.participant,
        user: {
          user_id: result.user.user_id,
          Name: result.user.Name,
          GamerTag: result.user.GamerTag
        },
        team: {
          Team_id: result.team.Team_id,
          Team_Number: result.team.Team_Number,
          Team_Name: result.team.Team_Name,
          Team_Password: result.team.Team_Password
        }
      }
    });
  } catch (error) {
    console.error("Error during slot confirmation:", error);
    res.status(500).json({ status: "fail", message: "Error confirming slot." });
  }
};

// Join Tournament Team
const joinTournamentTeam = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.user_id;
    const { teamPassword, teamNumber } = req.body;

    if (!teamPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Team password is required",
      });
    }

    if (!teamNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Team number is required",
      });
    }

    const result = await sequelize.transaction(async (t) => {
      // Check if tournament exists and is accepting registrations
      const tournament = await Tournament.findOne({
        where: {
          tournament_id: tournamentId,
          Status: "Accepting Registrations",
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message: "Tournament not found or not accepting registrations",
        };
      }

      // Check if user is already in any team for this tournament
      const existingTeam = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          team_members: {
            [Op.overlap]: [
              {
                id: userId,
                leader: null,
              },
            ],
          },
        },
        transaction: t,
      });

      if (existingTeam) {
        return {
          error: true,
          statusCode: 409,
          message: "User is already in a team for this tournament",
        };
      }

      // Check if user is already a participant
      const existingParticipant = await TournamentParticipant.findOne({
        where: {
          tournament_id: tournamentId,
          user_id: userId,
        },
        transaction: t,
      });

      if (existingParticipant) {
        return {
          error: true,
          statusCode: 409,
          message: "User is already a participant in this tournament",
        };
      }

      // Find the team with matching team number and password
      const team = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          Team_Number: teamNumber,
          Team_Password: teamPassword,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!team) {
        return {
          error: true,
          statusCode: 404,
          message: "Invalid team number or password",
        };
      }

      // Check if team is full
      if (team.team_members.length >= tournament.Team_Size_Limit) {
        return {
          error: true,
          statusCode: 400,
          message: "Team is already full",
        };
      }

      // Get info about the joining user
      const joiningUser = await User.findByPk(userId, {
        attributes: ["user_id", "Name", "GamerTag", "email"],
        transaction: t
      });
      
      if (!joiningUser) {
        return {
          error: true,
          statusCode: 404,
          message: "User not found",
        };
      }
      
      // Find the team leader
      const teamLeader = team.team_members.find(member => member.leader === true);
      let teamLeaderUser = null;
      
      if (teamLeader) {
        teamLeaderUser = await User.findByPk(teamLeader.id, {
          attributes: ["user_id", "Name", "GamerTag", "email"],
          transaction: t
        });
      }

      // Add user to team_members array
      team.team_members = [...team.team_members, { id: userId, leader: false }];

      // Save the team updates
      await team.save({ transaction: t });

      // Create participant record
      const participant = await TournamentParticipant.create(
        {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "confirmed",
          last_update_at: new Date().toISOString(),
        },
        { transaction: t }
      );

      // Get all team members' details
      const teamMemberIds = team.team_members.map((member) => member.id);
      const allMemberDetails = await User.findAll({
        where: {
          user_id: teamMemberIds,
        },
        attributes: ["user_id", "Name", "GamerTag"],
        transaction: t,
      });

      // Prepare the response without circular references
      const teamResponse = {
        Team_id: team.Team_id,
        Tournament_Id: team.Tournament_Id,
        Team_Number: team.Team_Number,
        Team_Name: team.Team_Name,
        team_members: team.team_members,
        Team_Password: team.Team_Password,
        Members: allMemberDetails.map((member) => ({
          user_id: member.user_id,
          Name: member.Name,
          GamerTag: member.GamerTag,
          isLeader: team.team_members.some(
            (tm) => tm.id === member.user_id && tm.leader
          ),
        })),
      };

      return {
        error: false,
        team: teamResponse,
        participant: participant.toJSON(),
        joiningUser,
        teamLeaderUser,
        tournament
      };
    });

    // Check if there was an error in the transaction
    if (result.error) {
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message,
      });
    }
    
    // Send email to the joining user
    if (result.joiningUser && result.joiningUser.email) {
      try {
        const tournamentDate = new Date(result.tournament.Event_Start_Time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const tournamentDetails = {
          tournamentId: result.tournament.tournament_id,
          gameName: result.tournament.GameName || 'Not specified',
          startDate: tournamentDate,
          currency: result.tournament.Currency || 'USD',
          prizeAmount: result.tournament.Prize_Amount || 0,
          registrationAmount: result.tournament.Registration_Amount || 0,
          teamSize: result.tournament.Team_Size_Limit || 1,
          maxPlayers: result.tournament.Max_Players_Allowed || 0,
          isBracket: result.tournament.Is_Bracket_Competition || false,
          status: result.tournament.Status || 'Accepting Registrations'
        };
        
        await sendTournamentRegistrationEmail(
          result.joiningUser.email,
          result.joiningUser.Name || 'Player',
          result.tournament.tournament_Name,
          tournamentDate,
          true,
          `Team #${result.team.Team_Number}`,
          tournamentDetails
        );
        
      } catch (emailError) {
        console.error('Error sending tournament registration email to new member:', emailError);
      }
    }
    
    // Send notification email to team leader
    if (result.teamLeaderUser && result.teamLeaderUser.email && result.joiningUser) {
      try {
        await sendTeamMemberJoinedEmail(
          result.teamLeaderUser.email,
          result.teamLeaderUser.Name || 'Team Leader',
          result.joiningUser.Name || 'New Player',
          result.team.Team_Name || `Team #${result.team.Team_Number}`,
          result.tournament.tournament_Name
        );
        
      } catch (emailError) {
        console.error('Error sending notification email to team leader:', emailError);
      }
    }

    res.status(200).json({
      status: "success",
      message: "Successfully joined the team",
      data: {
        team: result.team,
        participant: result.participant
      }
    });
  } catch (error) {
    console.error("Join tournament team error:", error);
    res
      .status(
        error.message.includes("Tournament") ||
          error.message.includes("Team") ||
          error.message.includes("User")
          ? 400
          : 500
      )
      .json({
        status: "fail",
        message: error.message || "Error joining tournament team",
      });
  }
};

// Join Single Player Tournament
const reserveSinglePlayerSlot = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.user_id;
    const { teamName } = req.body;

    const result = await sequelize.transaction(async (t) => {
      // Lock the tournament record to handle race conditions for slots
      const tournament = await Tournament.findOne({
        where: {
          tournament_id: tournamentId,
          Status: "Accepting Registrations",
          Team_Size_Limit: 1, // Ensure it's a single player tournament
        },
        lock: t.LOCK.UPDATE, // Apply row-level lock for concurrency control
        transaction: t,
      });

      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message:
            "Tournament not found, not accepting registrations, or not a single player tournament",
        };
      }

      // Check for existing slot membership using manual approach
      const allTeamSlots = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });
      
      // Manually check if user is in any slot
      let existingSlotMembership = null;
      for (const slot of allTeamSlots) {
        if (slot.team_members && Array.isArray(slot.team_members)) {
          const userExists = slot.team_members.some(member => {
            if (typeof member === 'object' && member !== null) {
              return String(member.id) === String(userId);
            }
            return String(member) === String(userId);
          });
          
          if (userExists) {
            existingSlotMembership = slot;
            break;
          }
        }
      }

      if (existingSlotMembership) {
        return {
          error: true,
          statusCode: 409,
          message: "You already have a slot reserved in this tournament",
        };
      }

      // Check if user is already a participant
      const existingParticipant = await TournamentParticipant.findOne({
        where: {
          tournament_id: tournamentId,
          user_id: userId,
        },
        transaction: t,
      });

      if (existingParticipant) {
        // Check if it's a pending reservation that hasn't expired
        if (existingParticipant.participation_status === "pending") {
          const reservationTime = new Date(existingParticipant.last_update_at);
          const now = new Date();
          const timeDiff = now.getTime() - reservationTime.getTime();
          const tenMinutes = 10 * 60 * 1000;

          if (timeDiff < tenMinutes) {
            return {
              error: true,
              statusCode: 409,
              message: "You already have a pending reservation for this tournament. Please complete payment or wait for it to expire.",
            };
          }
        } else {
          return {
            error: true,
            statusCode: 409,
            message: "User is already registered for this tournament",
          };
        }
      }

      // Count current participants to check for slot availability
      const currentParticipantsCount = await TournamentParticipant.count({
        where: {
          tournament_id: tournamentId,
          participation_status: "confirmed",
        },
        transaction: t,
      });

      if (currentParticipantsCount >= tournament.Max_Players_Allowed) {
        return {
          error: true,
          statusCode: 400,
          message: "Tournament is already full",
        };
      }

      // Find an available slot from TournamentTeam
      const availableSlot = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          [Op.or]: [{ team_members: { [Op.eq]: [] } }, { team_members: null }],
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!availableSlot) {
        return {
          error: true,
          statusCode: 400,
          message: "No available slots for this tournament",
        };
      }

      // Update the slot with the user's information
      availableSlot.team_members = [{ id: userId, leader: true }];
      
      // Set team name if provided
      if (teamName) {
        // Check if team name is already taken in this tournament
        const teamNameExists = await TournamentTeam.findOne({
          where: {
            Tournament_Id: tournamentId,
            Team_Name: teamName,
            Team_id: { [Op.ne]: availableSlot.Team_id } // Exclude current team
          },
          transaction: t
        });
        
        if (teamNameExists) {
          return {
            error: true,
            statusCode: 409,
            message: "Team name is already taken in this tournament"
          };
        }
        
        availableSlot.Team_Name = teamName;
      }
      
      await availableSlot.save({ transaction: t });

      // Create participant record with pending status
      const participant = await TournamentParticipant.create(
        {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "pending",
          last_update_at: new Date().toISOString(),
        },
        { transaction: t }
      );

      // Calculate total registration amount including fees
      const totalAmount = tournament.getTotalRegistrationAmount();

      // Create Stripe Checkout session for payment
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: tournament.Currency,
              product_data: {
                name: `Single Player Entry for ${tournament.tournament_Name}`,
              },
              unit_amount: Math.round(totalAmount * 100), // Stripe requires amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:4000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:4000/payment-cancel`,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes from now
        metadata: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_type: 'player_registration'
        }
      });

      // Create a payment record for this reservation
      await TournamentPayment.create({
        user_id: userId,
        tournament_id: tournamentId,
        amount: totalAmount,
        currency: tournament.Currency,
        payment_mode: 'STRIPE',
        payment_details: {
          session_id: session.id,
          payment_intent: session.payment_intent,
          status: 'pending',
          checkout_url: session.url,
          payment_type: 'player_registration',
          created_at: new Date().toISOString()
        }
      }, { transaction: t });

      return {
        error: false,
        checkoutUrl: session.url,
        team_id: availableSlot.Team_id,
        tournament_id: tournament.tournament_id,
        session_id: session.id
      };
    });

    // Check if there was an error in the transaction
    if (result.error) {
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: "Slot reserved. Please proceed to payment.",
      data: result,
    });
  } catch (error) {
    console.error("Reserve single player slot error:", error);
    let statusCode = 500;
    if (
      error.message.includes("Tournament") ||
      error.message.includes("registered") ||
      error.message.includes("full") ||
      error.message.includes("slot")
    ) {
      statusCode = 400;
    }
    res.status(statusCode).json({
      status: "fail",
      message: error.message || "Error reserving tournament slot",
    });
  }
};

// Confirm Single Player Slot Payment
const confirmSinglePlayerSlot = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { sessionId } = req.body;
    const userId = req.user.user_id;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Ensure session is successful
    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json({ status: "fail", message: "Payment not completed" });
    }

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // 1. Find the tournament to verify it still exists and is accepting registrations
      const tournament = await Tournament.findOne({
        where: {
          tournament_id: tournamentId,
          Status: "Accepting Registrations",
          Team_Size_Limit: 1, // Ensure it's a single player tournament
        },
        transaction: t,
      });

      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message: "Tournament not found or not accepting registrations",
        };
      }

      // 2. Find the team slot for this user
      const teamSlot = await TournamentTeam.findOne({
        where: {
          Tournament_Id: tournamentId,
          team_members: { [Op.contains]: [{ id: userId, leader: true }] },
        },
        transaction: t
      });

      if (!teamSlot) {
        return {
          error: true,
          statusCode: 404,
          message: "No slot reservation found for this user."
        };
      }

      // 3. Find and update the participant record from pending to confirmed
      const participant = await TournamentParticipant.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "pending",
        },
        transaction: t
      });

      if (!participant) {
        return {
          error: true,
          statusCode: 404,
          message: "No pending reservation found for this user."
        };
      }

      // Update the participation status to confirmed
      await participant.update({
        participation_status: "confirmed",
        last_update_at: new Date().toISOString(),
      }, { transaction: t });

      // Calculate total amount including fees
      const totalAmount = tournament.getTotalRegistrationAmount();

      // Find the existing payment record and update it to completed
      const paymentRecord = await TournamentPayment.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_details: {
            session_id: sessionId
          }
        },
        transaction: t
      });

      if (paymentRecord) {
        // Update the existing payment record
        paymentRecord.payment_details = {
          ...paymentRecord.payment_details,
          status: 'completed',
          payment_intent: session.payment_intent,
          completed_at: new Date().toISOString()
        };
        paymentRecord.amount = totalAmount; // Update with correct total amount
        await paymentRecord.save({ transaction: t });
      } else {
        // Create a new payment record if none exists
        await TournamentPayment.create({
          user_id: userId,
          tournament_id: tournamentId,
          amount: totalAmount,
          currency: tournament.Currency,
          payment_mode: 'STRIPE',
          payment_details: {
            session_id: sessionId,
            payment_intent: session.payment_intent,
            status: 'completed',
            payment_type: 'player_registration',
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          }
        }, { transaction: t });
      }

      // Get user details
      const userDetails = await User.findByPk(userId, {
        attributes: ["user_id", "Name", "GamerTag", "email"],
        transaction: t
      });

      // Calculate remaining slots
      const currentParticipantsCount = await TournamentParticipant.count({
        where: {
          tournament_id: tournamentId,
          participation_status: "confirmed",
        },
        transaction: t,
      });
      
      const remainingSlots = tournament.Max_Players_Allowed - currentParticipantsCount;

      return {
        error: false,
        participant: participant.toJSON(),
        user: userDetails.toJSON(),
        team: {
          Team_id: teamSlot.Team_id,
          Team_Number: teamSlot.Team_Number,
          Team_Name: teamSlot.Team_Name,
          team_members: teamSlot.team_members,
        },
        tournamentDetails: {
          tournamentId: tournament.tournament_id,
          tournament_Name: tournament.tournament_Name,
          Event_Start_Time: tournament.Event_Start_Time,
          Event_End_Time: tournament.Event_End_Time,
          GameName: tournament.GameName,
          Registration_Amount: tournament.Registration_Amount,
          Platform_fee: tournament.Platform_fee,
          Organizer_fee: tournament.Organizer_fee,
          totalAmount: totalAmount,
          Currency: tournament.Currency,
        },
        remainingSlots,
        payment_status: 'completed'
      };
    });

    if (result.error) {
      return res
        .status(result.statusCode)
        .json({ status: "fail", message: result.message });
    }
    
    // Send tournament registration confirmation email to player
    if (result.user && result.user.email) {
      try {
        const tournamentDate = new Date(result.tournamentDetails.Event_Start_Time).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const tournamentDetails = {
          tournamentId: result.tournamentDetails.tournamentId,
          gameName: result.tournamentDetails.GameName || 'Not specified',
          startDate: tournamentDate,
          currency: result.tournamentDetails.Currency || 'USD',
          prizeAmount: result.tournamentDetails.prizeAmount || 0,
          registrationAmount: result.tournamentDetails.Registration_Amount || 0,
          platformFee: result.tournamentDetails.Platform_fee || 0,
          organizerFee: result.tournamentDetails.Organizer_fee || 0,
          totalAmount: result.tournamentDetails.totalAmount,
          teamSize: result.tournamentDetails.teamSize || 1,
          maxPlayers: result.tournamentDetails.maxPlayers || 0,
          isBracket: result.tournamentDetails.isBracket || false,
          status: result.tournamentDetails.status || 'Coming Soon'
        };
        
        await sendTournamentRegistrationEmail(
          result.user.email,
          result.user.Name || 'Player',
          result.tournamentDetails.tournament_Name,
          tournamentDate,
          false,
          tournamentDetails
        );
        
      } catch (emailError) {
        console.error('Error sending tournament registration email:', emailError);
        // Continue with response even if email fails
      }
    }

    // 4. Respond with successful booking
    res.status(200).json({
      status: "success",
      message: "Tournament entry confirmed successfully.",
      data: result
    });
  } catch (error) {
    console.error("Error during single player slot confirmation:", error);
    res.status(500).json({ status: "fail", message: "Error confirming tournament entry." });
  }
};

// Update tournament (PATCH)
const updateTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const requestingUserId = req.user.user_id;
    const updateData = req.body;
    let mainBannerUrl = null;
    let mainBannerKey = null;

    // Check if room details are being updated
    const isRoomDetailsUpdate = updateData.Room_Code !== undefined || updateData.Room_Password !== undefined;
    let previousRoomCode = null;
    let previousRoomPassword = null;

    // Start transaction
    const result = await sequelize.transaction(async (t) => {
      // Check if tournament exists
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t,
      });
      if (!tournament) {
        return {
          error: true,
          statusCode: 404,
          message: "Tournament not found",
        };
      }

      // Store previous room details for comparison
      if (isRoomDetailsUpdate) {
        previousRoomCode = tournament.Room_Code;
        previousRoomPassword = tournament.Room_Password;
      }

      // Check if requesting user is a tournament admin
      const isAdmin = await UserAdmin.findOne({
        where: {
          user_id: requestingUserId,
          associated_tournament_id: tournamentId,
          role: { [Op.in]: ["super_admin", "temp_admin"] },
        },
        transaction: t,
      });

      if (!isAdmin) {
        return {
          error: true,
          statusCode: 403,
          message: "Only tournament admins can update tournament details",
        };
      }

      // Handle banner image update if provided
      if (req.file) {
        
        
        // Upload new banner to S3
        const uploadResult = await uploadToS3(req.file, 'tournaments/banners');
        
        if (uploadResult.status === 'success') {
          mainBannerUrl = uploadResult.url;
          mainBannerKey = uploadResult.key;
          
          
          // Add banner info to update data
          updateData.main_banner = mainBannerUrl;
          updateData.main_banner_key = mainBannerKey;
          
          // Delete old banner if it exists
          if (tournament.main_banner_key) {
            try {
              
              await deleteFromS3(tournament.main_banner_key);
            } catch (deleteError) {
              console.error('Error deleting old banner:', deleteError);
              // Continue with update even if deletion fails
            }
          }
        } else {
          return {
            error: true,
            statusCode: 500,
            message: "Failed to upload new tournament banner image"
          };
        }
      }

      // Parse Prize_Distribution if provided as JSON string
      if (updateData.Prize_Distribution && typeof updateData.Prize_Distribution === 'string') {
        try {
          updateData.Prize_Distribution = JSON.parse(updateData.Prize_Distribution);
        } catch (parseError) {
          console.error('Error parsing Prize_Distribution:', parseError);
          return {
            error: true,
            statusCode: 400,
            message: "Invalid Prize_Distribution format"
          };
        }
      }

      // Check if max players or team size is being updated
      const isMaxPlayersUpdated = updateData.Max_Players_Allowed !== undefined && 
                                 updateData.Max_Players_Allowed !== tournament.Max_Players_Allowed;
      
      const isTeamSizeUpdated = updateData.Team_Size_Limit !== undefined &&
                               updateData.Team_Size_Limit !== tournament.Team_Size_Limit;
                               
      const needsTeamSlotAdjustment = isMaxPlayersUpdated || isTeamSizeUpdated;
      
      // Store original values for comparison
      const originalMaxPlayers = tournament.Max_Players_Allowed;
      const originalTeamSize = tournament.Team_Size_Limit;
      
      // Update tournament first
      await tournament.update(updateData, { transaction: t });
      
      // Handle team slot adjustments if max players or team size changed
      if (needsTeamSlotAdjustment) {
        // Get the updated values, falling back to original values if not updated
        const newMaxPlayers = updateData.Max_Players_Allowed !== undefined 
          ? updateData.Max_Players_Allowed 
          : tournament.Max_Players_Allowed;
          
        const newTeamSize = updateData.Team_Size_Limit !== undefined
          ? updateData.Team_Size_Limit
          : tournament.Team_Size_Limit;
          
        const isTeamBased = newTeamSize > 1;
        
        // Calculate current number of team slots
        const currentTeamSlots = await TournamentTeam.count({
          where: { Tournament_Id: tournamentId },
          transaction: t
        });
        
        // Calculate target number of team slots
        const targetTeamSlots = isTeamBased 
          ? Math.ceil(newMaxPlayers / newTeamSize)
          : newMaxPlayers;
        
        if (targetTeamSlots > currentTeamSlots) {
          // Need to add more team slots
          const slotsToAdd = targetTeamSlots - currentTeamSlots;
          
          
          const newTeamSlots = Array(slotsToAdd).fill().map((_, index) => ({
            Tournament_Id: tournamentId,
            Team_Number: currentTeamSlots + index + 1,
            team_members: []
          }));
          
          await TournamentTeam.bulkCreate(newTeamSlots, { transaction: t });
        } 
        else if (targetTeamSlots < currentTeamSlots) {
          // Need to remove excess team slots - only remove empty ones
          const emptyTeamSlots = await TournamentTeam.findAll({
            where: { 
              Tournament_Id: tournamentId,
              [Op.or]: [
                { team_members: { [Op.eq]: [] } },
                { team_members: null }
              ]
            },
            order: [['Team_Number', 'DESC']],
            transaction: t
          });
          
          const slotsToRemove = currentTeamSlots - targetTeamSlots;
          
          if (emptyTeamSlots.length >= slotsToRemove) {
            // We have enough empty slots to remove
            const slotsToDelete = emptyTeamSlots.slice(0, slotsToRemove);
            
            
            for (const slot of slotsToDelete) {
              await slot.destroy({ transaction: t });
            }
          } else {
            console.warn(`Cannot remove ${slotsToRemove} team slots as only ${emptyTeamSlots.length} empty slots are available`);
          }
        }
      }

      return {
        error: false,
        tournament: tournament.toJSON(),
        isRoomDetailsUpdate,
        roomDetailsChanged: isRoomDetailsUpdate && (
          updateData.Room_Code !== previousRoomCode || 
          updateData.Room_Password !== previousRoomPassword
        ),
        teamSlotAdjustment: needsTeamSlotAdjustment ? {
          maxPlayersUpdated: isMaxPlayersUpdated,
          teamSizeUpdated: isTeamSizeUpdated,
          originalMaxPlayers,
          newMaxPlayers: updateData.Max_Players_Allowed !== undefined ? updateData.Max_Players_Allowed : tournament.Max_Players_Allowed,
          originalTeamSize,
          newTeamSize: updateData.Team_Size_Limit !== undefined ? updateData.Team_Size_Limit : tournament.Team_Size_Limit
        } : null
      };
    });

    // Check if there was an error in the transaction
    if (result.error) {
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message,
      });
    }

    // Send email notifications for room details update (non-bracket tournaments only)
    if (result.roomDetailsChanged && !result.tournament.Is_Bracket_Competition) {
      try {
        // Get all participants for this tournament
        const participants = await TournamentParticipant.findAll({
          where: {
            tournament_id: tournamentId,
            participation_status: 'confirmed'
          },
          include: [
            {
              model: User,
              attributes: ['user_id', 'Name', 'email']
            }
          ]
        });

        if (participants.length > 0) {
          const emailPromises = participants
            .filter(participant => participant.User && participant.User.email)
            .map(participant => 
              sendRoomDetailsEmail(
                participant.User.email,
                participant.User.Name,
                result.tournament.tournament_Name,
                result.tournament.Room_Code,
                result.tournament.Room_Password,
                false // isMatchupSpecific = false for tournament-wide room details
              )
            );

          // Send all emails concurrently
          if (emailPromises.length > 0) {
            await Promise.allSettled(emailPromises);
            
          }
        }
      } catch (emailError) {
        console.error('Error sending tournament room details emails:', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // Prepare response with additional information about team slot adjustments
    const responseData = {
      status: "success",
      message: "Tournament updated successfully",
      data: result.tournament
    };
    
    // Add information about team slot adjustments if needed
    if (result.teamSlotAdjustment) {
      responseData.teamSlots = {
        updated: true,
        maxPlayersUpdated: result.teamSlotAdjustment.maxPlayersUpdated,
        teamSizeUpdated: result.teamSlotAdjustment.teamSizeUpdated,
        previousMaxPlayers: result.teamSlotAdjustment.originalMaxPlayers,
        newMaxPlayers: result.teamSlotAdjustment.newMaxPlayers,
        previousTeamSize: result.teamSlotAdjustment.originalTeamSize,
        newTeamSize: result.teamSlotAdjustment.newTeamSize
      };
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Tournament update error:", error);

    // Handle Sequelize validation and constraint errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: "fail",
        message: error.errors.map(err => err.message).join(', ')
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Provide specific error messages for unique constraint violations
      const field = error.errors[0]?.path;
      let message = 'A tournament with this information already exists';
      
      if (field === 'tournament_Name') {
        message = 'A tournament with this name already exists. Please choose a different name.';
      } else if (field === 'Tournament_Code') {
        message = 'A tournament with this code already exists. Please choose a different code.';
      }
      
      return res.status(400).json({
        status: "fail",
        message: message
      });
    }

    res.status(500).json({
      status: "error",
      message: error.message || "Error updating tournament",
    });
  }
};

// Cancel Team Reservation (when payment is canceled or failed)
const cancelTeamReservation = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.user_id;
    
    

    const result = await sequelize.transaction(async (t) => {
      // Find all team slots for this tournament first
      const teamSlots = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });

      
      
      // Find the specific slot containing this user as leader - using a more flexible approach
      let teamSlot = null;
      for (const slot of teamSlots) {
        if (slot.team_members && Array.isArray(slot.team_members)) {
          const isLeader = slot.team_members.some(member => {
            // Check if member is object with id property and leader flag
            if (typeof member === 'object' && member !== null) {
              return member.id === userId && member.leader === true;
            }
            return false;
          });
          
          if (isLeader) {
            teamSlot = slot;
            
            break;
          }
        }
      }

      if (!teamSlot) {
        // Try again without requiring leader status
        for (const slot of teamSlots) {
          if (slot.team_members && Array.isArray(slot.team_members)) {
            const isMember = slot.team_members.some(member => {
              // Check if member is object with id property
              if (typeof member === 'object' && member !== null) {
                return member.id === userId;
              }
              // If member is a string/number, check direct equality
              return String(member) === String(userId);
            });
            
            if (isMember) {
              teamSlot = slot;
              
              break;
            }
          }
        }
      }

      if (!teamSlot) {
        
        return {
          error: true,
          statusCode: 404,
          message: "No team reservation found for this user"
        };
      }

      // Find the pending participation record
      const participationRecord = await TournamentParticipant.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "pending"
        },
        transaction: t
      });

      if (participationRecord) {
        
        // Delete the participation record
        await participationRecord.destroy({ transaction: t });
        
      } else {
        
      }

      // Reset the team slot
      
      teamSlot.team_members = [];
      teamSlot.Team_Password = null;
      await teamSlot.save({ transaction: t });
      

      // Find all pending payment records for this user and tournament
      const pendingPayments = await TournamentPayment.findAll({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_details: {
            status: 'pending',
            payment_type: 'team_registration'
          }
        },
        transaction: t
      });

      // Update all pending payment records to 'canceled'
      for (const payment of pendingPayments) {
        payment.payment_details = {
          ...payment.payment_details,
          status: 'canceled',
          canceled_at: new Date().toISOString()
        };
        await payment.save({ transaction: t });
        
      }

      return {
        error: false,
        message: "Team reservation canceled successfully",
        payments_updated: pendingPayments.length
      };
    });

    if (result.error) {
      
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message
      });
    }

    
    res.status(200).json({
      status: "success",
      message: "Team reservation canceled successfully"
    });
  } catch (error) {
    console.error("Error canceling team reservation:", error);
    res.status(500).json({
      status: "fail",
      message: "Error canceling reservation"
    });
  }
};

// Cancel Single Player Reservation (when payment is canceled or failed)
const cancelSinglePlayerReservation = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.user_id;
    
    

    const result = await sequelize.transaction(async (t) => {
      // Find all team slots for this tournament first
      const teamSlots = await TournamentTeam.findAll({
        where: {
          Tournament_Id: tournamentId
        },
        transaction: t
      });

      
      
      // Find the specific slot containing this user - using a more flexible approach
      let playerSlot = null;
      for (const slot of teamSlots) {
        if (slot.team_members && Array.isArray(slot.team_members)) {
          const hasUser = slot.team_members.some(member => {
            // Check if member is object with id property
            if (typeof member === 'object' && member !== null) {
              return member.id === userId;
            }
            // If member is a string/number, check direct equality
            return String(member) === String(userId);
          });
          
          if (hasUser) {
            playerSlot = slot;
            
            break;
          }
        }
      }

      if (!playerSlot) {
        
        return {
          error: true,
          statusCode: 404,
          message: "No player reservation found for this user"
        };
      }

      // Find the pending participation record
      const participationRecord = await TournamentParticipant.findOne({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          participation_status: "pending"
        },
        transaction: t
      });

      if (participationRecord) {
        
        // Delete the participation record
        await participationRecord.destroy({ transaction: t });
        
      } else {
        
      }

      // Reset the player slot
      
      playerSlot.team_members = [];
      await playerSlot.save({ transaction: t });
      

      // Find all pending payment records for this user and tournament
      const pendingPayments = await TournamentPayment.findAll({
        where: {
          user_id: userId,
          tournament_id: tournamentId,
          payment_details: {
            status: 'pending',
            payment_type: 'player_registration'
          }
        },
        transaction: t
      });

      // Update all pending payment records to 'canceled'
      for (const payment of pendingPayments) {
        payment.payment_details = {
          ...payment.payment_details,
          status: 'canceled',
          canceled_at: new Date().toISOString()
        };
        await payment.save({ transaction: t });
        
      }

      return {
        error: false,
        message: "Player reservation canceled successfully",
        payments_updated: pendingPayments.length
      };
    });

    if (result.error) {
      
      return res.status(result.statusCode).json({
        status: "fail",
        message: result.message
      });
    }

    
    res.status(200).json({
      status: "success",
      message: "Player reservation canceled successfully"
    });
  } catch (error) {
    console.error("Error canceling player reservation:", error);
    res.status(500).json({
      status: "fail",
      message: "Error canceling reservation"
    });
  }
};

// Get User Tournaments
const getUserTournaments = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get confirmed tournament participations for this user
    const userParticipations = await TournamentParticipant.findAll({
      where: {
        user_id: userId,
        participation_status: 'confirmed'
      },
      attributes: ['tournament_id']
    });

    // Extract tournament IDs where the user is a confirmed participant
    const participatedTournamentIds = userParticipations.map(p => p.tournament_id);

    // If user has no confirmed participations, return empty array
    if (participatedTournamentIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    // Get user's tournaments where they are a confirmed participant
    const userTournaments = await Tournament.findAll({
      where: {
        tournament_id: {
          [Op.in]: participatedTournamentIds
        }
      },
      include: [
        {
          model: User,
          as: 'ListedByUser',
          attributes: ['user_id', 'Name']
        }
      ]
    });

    // Get all teams the user is part of
    const teams = await TournamentTeam.findAll({
      where: {
        Tournament_Id: {
          [Op.in]: participatedTournamentIds
        },
        team_members: { 
          [Op.contains]: [{ id: userId }] 
        }
      }
    });

    // Prepare response with user role in each tournament
    const tournamentsData = userTournaments.map(tournament => {
      // Find the team for this tournament
      const team = teams.find(t => t.Tournament_Id === tournament.tournament_id);
      
      // Determine user role in this tournament
      let userRole = 'participant';
      if (team) {
        const userMember = team.team_members.find(member => member.id === userId);
        if (userMember && userMember.leader) {
          userRole = 'leader';
        } else {
          userRole = 'member';
        }
      }

      return {
        tournament: tournament,
        userRole,
        teamInfo: team || null
      };
    });

    res.status(200).json({
      status: 'success',
      data: tournamentsData
    });
  } catch (error) {
    console.error('Get user tournaments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user tournaments'
    });
  }
};

// Get User Hosted Tournaments
const getUserHostedTournaments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Get current timestamp for checking admin validity
    const now = new Date();
    
    // Find all tournament IDs where user is/was an admin
    const adminRecords = await UserAdmin.findAll({
      where: {
        user_id: userId
      },
      attributes: ['associated_tournament_id', 'role', 'start_time', 'end_time']
    });
    
    if (!adminRecords || adminRecords.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          tournaments: [],
          pagination: {
            total: 0,
            currentPage: parseInt(page),
            totalPages: 0
          }
        }
      });
    }
    
    // Extract tournament IDs
    const tournamentIds = adminRecords.map(record => record.associated_tournament_id);
    
    // Build where clause for tournament search
    const where = {
      tournament_id: { [Op.in]: tournamentIds }
    };
    
    // Add status filter if provided
    if (status) {
      where.Status = status;
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Find tournaments with pagination
    const tournaments = await Tournament.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'ListedByUser',
          attributes: ['user_id', 'Name']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['listed_at', 'DESC']]
    });
    
    // Add admin role info to each tournament
    const tournamentsWithRole = tournaments.rows.map(tournament => {
      const adminRecord = adminRecords.find(
        record => record.associated_tournament_id === tournament.tournament_id
      );
      
      // Check if admin role is currently active
      const isActive = adminRecord.start_time <= now && adminRecord.end_time > now;
      
      return {
        ...tournament.toJSON(),
        adminRole: adminRecord.role,
        isActiveAdmin: isActive
      };
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        tournaments: tournamentsWithRole,
        pagination: {
          total: tournaments.count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(tournaments.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user hosted tournaments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching hosted tournaments'
    });
  }
};

const approveTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { isApproved, organizer_fee, platform_fee } = req.body;
    const userId = req.user.user_id;

    // Find tournament and creator details
    const tournament = await Tournament.findByPk(tournamentId, {
      include: [
        {
          model: User,
          as: 'ListedByUser',
          attributes: ['user_id', 'Name', 'email']
        }
      ]
    });

    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Update tournament approval status and fees
    await tournament.update({ 
      is_approved: isApproved,
      Status: isApproved ? 'Accepting Registrations' : 'Coming Soon', // Update status based on approval
      Organizer_fee: organizer_fee || tournament.Organizer_fee,
      Platform_fee: platform_fee || tournament.Platform_fee
    });

    // Get tournament details for logging
    const tournamentName = tournament.tournament_Name;
    const creatorEmail = tournament.ListedByUser?.email;
    const creatorName = tournament.ListedByUser?.Name || 'Tournament Organizer';

    // Log the approval action
    

    // Send approval/rejection email to tournament creator
    if (creatorEmail) {
      try {
        const tournamentDetails = {
          tournamentId: tournament.tournament_id,
          gameName: tournament.GameName || 'Not specified',
          startDate: new Date(tournament.Event_Start_Time).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          currency: tournament.Currency || 'USD',
          prizeAmount: tournament.Prize_Amount || 0,
          registrationAmount: tournament.Registration_Amount || 0,
          organizer_fee: tournament.Organizer_fee || 0,
          platform_fee: tournament.Platform_fee || 0,
          teamSize: tournament.Team_Size_Limit || 1,
          maxPlayers: tournament.Max_Players_Allowed || 0,
          isBracket: tournament.Is_Bracket_Competition || false,
          status: tournament.Status || 'Coming Soon'
        };
        
        await sendTournamentApprovalEmail(
          creatorEmail,
          creatorName,
          tournamentName,
          isApproved,
          tournamentDetails
        );
        
      } catch (emailError) {
        console.error(`Error sending tournament ${isApproved ? 'approval' : 'rejection'} email:`, emailError);
        // Continue with response even if email fails
      }
    } else {
      console.warn(`No email found for tournament creator (ID: ${tournament.ListedByUser?.user_id}). Approval notification email not sent.`);
    }

    // Format event date for response
    const eventDate = new Date(tournament.Event_Start_Time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.status(200).json({
      status: 'success',
      message: `Tournament ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: {
        tournament_id: tournament.tournament_id,
        tournament_Name: tournamentName,
        is_approved: tournament.is_approved,
        status: tournament.Status,
        event_date: eventDate,
        organizer_fee: tournament.Organizer_fee,
        platform_fee: tournament.Platform_fee,
        notification_sent: !!creatorEmail
      }
    });
  } catch (error) {
    console.error('Tournament approval error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating tournament approval status'
    });
  }
};

// Get joinable teams for a tournament
const getJoinableTeams = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    // Find tournament
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if tournament is team-based
    if (tournament.Team_Size_Limit <= 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'This is not a team-based tournament'
      });
    }

    // Get all teams for this tournament that have at least one member
    const teams = await TournamentTeam.findAll({
      where: { 
        Tournament_Id: tournamentId,
        team_members: { 
          [Op.and]: [
            { [Op.ne]: [] },    // Not empty
            { [Op.ne]: null }   // Not null
          ]
        }
      }
    });

    // Collect all user IDs from all teams
    let allUserIds = [];
    teams.forEach(team => {
      if (team.team_members && Array.isArray(team.team_members)) {
        team.team_members.forEach(member => {
          if (member && member.id) {
            allUserIds.push(member.id);
          }
        });
      }
    });

    // Remove duplicates
    allUserIds = [...new Set(allUserIds)];

    // Fetch user details for all team members at once
    const users = await User.findAll({
      where: { user_id: allUserIds },
      attributes: ['user_id', 'Name', 'profile_pic']
    });

    // Refresh profile images for all users using the same pattern as other controllers
    const refreshedUsers = await Promise.all(
      users.map(async (user) => {
        if (!user || !user.profile_pic) return user.toJSON();
        
        try {
          // Use the instance method to refresh profile image
          const refreshResult = await user.refreshProfileImage();
          
          if (refreshResult && refreshResult.status === 'success') {
            return {
              ...user.toJSON(),
              profile_pic_url: refreshResult.url,
              profile_pic_key: refreshResult.key
            };
          }
        } catch (error) {
          console.error(`Error refreshing profile image for user ${user.user_id}:`, error);
        }
        
        return user.toJSON();
      })
    );

    // Create a map for quick lookup
    const userMap = {};
    refreshedUsers.forEach(user => {
      userMap[user.user_id] = {
        id: user.user_id,
        name: user.Name,
        profile_pic_url: user.profile_pic_url || null
      };
    });

    // Format the team data with user details
    const formattedTeams = teams.map(team => {
      // Get member details
      const members = team.team_members.map(member => {
        const user = userMap[member.id] || { id: member.id, name: 'Unknown User' };
        return {
          ...user,
          isLeader: member.leader
        };
      });

      // Check if team is full
      const isFull = team.team_members.length >= tournament.Team_Size_Limit;

      return {
        id: team.Team_id,
        number: team.Team_Number,
        name: team.Team_Name || `Team #${team.Team_Number}`,
        members: members,
        memberCount: team.team_members.length,
        maxMembers: tournament.Team_Size_Limit,
        isFull: isFull,
        canJoin: !isFull
      };
    });

    return res.status(200).json({
      status: 'success',
      data: formattedTeams
    });
  } catch (error) {
    console.error('Error fetching joinable teams:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Failed to fetch joinable teams',
      error: error.message
    });
  }
};

// Upload tournament banners
const uploadTournamentBanners = async (req, res) => {
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

    // Check if user is authorized to update this tournament
    if (tournament.listed_by !== userId) {
      // Check if user is an admin for this tournament
      const isAdmin = await UserAdmin.findOne({
        where: {
          user_id: userId,
          associated_tournament_id: tournamentId,
          start_time: { [Op.lte]: new Date() },
          end_time: { [Op.gt]: new Date() }
        }
      });

      if (!isAdmin) {
        return res.status(403).json({
          status: 'fail',
          message: 'You are not authorized to upload banners for this tournament'
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No banner files provided'
      });
    }

    // Upload each file to S3
    const uploadPromises = req.files.map(file => 
      uploadToS3(file, `tournaments/${tournamentId}/banners`)
    );
    
    const uploadResults = await Promise.all(uploadPromises);
    
    // Check if any uploads failed
    const failedUploads = uploadResults.filter(result => result.status !== 'success');
    if (failedUploads.length > 0) {
      // Attempt to clean up any successful uploads
      const successfulUploads = uploadResults.filter(result => result.status === 'success');
      for (const upload of successfulUploads) {
        await deleteFromS3(upload.key);
      }
      
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to upload one or more banner images'
      });
    }

    // Get URLs from successful uploads
    const bannerUrls = uploadResults.map(result => result.url);
    
    // Update tournament with new banner URLs
    const currentBanners = tournament.tournament_banners || [];
    const updatedBanners = [...currentBanners, ...bannerUrls];
    
    await tournament.update({ tournament_banners: updatedBanners });

    res.status(200).json({
      status: 'success',
      data: {
        bannerUrls: updatedBanners
      }
    });
  } catch (error) {
    console.error('Error uploading tournament banners:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading tournament banners'
    });
  }
};

// Delete tournament banner
const deleteTournamentBanner = async (req, res) => {
  try {
    const { tournamentId, bannerIndex } = req.params;
    const userId = req.user.user_id;

    // Check if tournament exists
    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tournament not found'
      });
    }

    // Check if user is authorized to update this tournament
    if (tournament.listed_by !== userId) {
      // Check if user is an admin for this tournament
      const isAdmin = await UserAdmin.findOne({
        where: {
          user_id: userId,
          associated_tournament_id: tournamentId,
          start_time: { [Op.lte]: new Date() },
          end_time: { [Op.gt]: new Date() }
        }
      });

      if (!isAdmin) {
        return res.status(403).json({
          status: 'fail',
          message: 'You are not authorized to delete banners for this tournament'
        });
      }
    }

    // Get current banners
    const currentBanners = tournament.tournament_banners || [];
    
    // Check if banner index is valid
    const index = parseInt(bannerIndex, 10);
    if (isNaN(index) || index < 0 || index >= currentBanners.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid banner index'
      });
    }

    // Get banner URL to delete
    const bannerToDelete = currentBanners[index];
    
    // Delete from S3
    const imageKey = getKeyFromUrl(bannerToDelete);
    if (imageKey) {
      await deleteFromS3(imageKey);
    }
    
    // Remove from banners array
    const updatedBanners = [...currentBanners.slice(0, index), ...currentBanners.slice(index + 1)];
    
    // Update tournament
    await tournament.update({ tournament_banners: updatedBanners });

    res.status(200).json({
      status: 'success',
      message: 'Banner deleted successfully',
      data: {
        bannerUrls: updatedBanners
      }
    });
  } catch (error) {
    console.error('Error deleting tournament banner:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting tournament banner'
    });
  }
};

// Get private tournament by code
const getPrivateTournamentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?.user_id; // Optional chaining in case user is not authenticated
    
    if (!code) {
      return res.status(400).json({
        status: "fail",
        message: "Tournament code is required"
      });
    }

    // Find the tournament by code
    const tournament = await Tournament.findOne({
      where: {
        Tournament_Code: code,
        Is_Private: true
      },
      include: [
        {
          model: User,
          as: "ListedByUser",
          attributes: ["user_id", "Name"],
        },
      ],
    });

    if (!tournament) {
      return res.status(404).json({
        status: "fail",
        message: "Private tournament not found or code is invalid"
      });
    }

    // Check if the tournament is approved
    if (!tournament.is_approved) {
      return res.status(403).json({
        status: "fail",
        message: "Tournament has not been approved yet"
      });
    }

    // This is an authorized private tournament access through code
    // We'll fetch the details using the standard tournament details endpoint
    // but pass a flag to indicate it was accessed through a valid code
    
    // Option 1: Return the tournament ID and a redirect flag
    return res.status(200).json({
      status: "success",
      data: {
        tournament_id: tournament.tournament_id,
        shouldRedirect: true,
        tournament_Name: tournament.tournament_Name,
        GameName: tournament.GameName
      }
    });

    // Option 2 (alternative): Return full tournament details directly
    // We're skipping this for now as it would duplicate the code from getTournamentDetails
    // Instead, the frontend will make a second request with the tournament ID
    
    // Full details would be added here if we chose this approach
  } catch (error) {
    console.error("Private tournament fetch error:", error);
    res.status(500).json({
      status: "error",
      message: "Error fetching private tournament details"
    });
  }
};

// Delete main tournament banner
const deleteMainBanner = async (req, res) => {
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

    // Check if user is authorized to update this tournament
    if (tournament.listed_by !== userId) {
      // Check if user is an admin for this tournament
      const isAdmin = await UserAdmin.findOne({
        where: {
          user_id: userId,
          associated_tournament_id: tournamentId,
          start_time: { [Op.lte]: new Date() },
          end_time: { [Op.gt]: new Date() }
        }
      });

      if (!isAdmin) {
        return res.status(403).json({
          status: 'fail',
          message: 'You are not authorized to delete banner for this tournament'
        });
      }
    }

    // Check if tournament has a main banner
    if (!tournament.main_banner_key) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tournament does not have a main banner'
      });
    }

    // Delete from S3
    const deleteResult = await deleteFromS3(tournament.main_banner_key);
    if (deleteResult.status !== 'success') {
      console.error('Error deleting banner from S3:', deleteResult.message);
      // Continue with update even if S3 deletion fails
    }
    
    // Update tournament to remove banner references
    await tournament.update({
      main_banner: null,
      main_banner_key: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Main banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting main banner:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting main banner'
    });
  }
};

module.exports = {
  createTournament,
  getTournamentDetails,
  updateTournamentStatus,
  searchTournaments,
  getUpcomingTournaments,
  getPastTournaments,
  deleteTournament,
  createTournamentTeam,
  confirmSlotPayment,
  joinTournamentTeam,
  reserveSinglePlayerSlot,
  confirmSinglePlayerSlot,
  updateTournament,
  getUserTournaments,
  getUserHostedTournaments,
  cancelTeamReservation,
  cancelSinglePlayerReservation,
  approveTournament,
  getJoinableTeams,
  uploadTournamentBanners,
  deleteTournamentBanner,
  getPrivateTournamentByCode,
  deleteMainBanner
};
