const cron = require('node-cron');
const { sequelize } = require('../config/database');
const { TournamentParticipant, TournamentTeam, TournamentPayment } = require('../models');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stops a reservation's checkout session from being paid, so nobody is charged for
 * a slot that has been released. Stripe sessions must stay open for at least 30
 * minutes when created, which is longer than the 10-minute reservation window.
 * Returns false if the customer has already paid. Throws if Stripe refuses, which
 * includes the customer paying at this moment, so the reservation is retried later.
 */
const closeCheckoutSession = async (sessionId) => {
  if (!sessionId) {
    return true;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === 'complete' || session.payment_status === 'paid') {
    return false;
  }
  if (session.status === 'open') {
    await stripe.checkout.sessions.expire(sessionId);
  }
  return true;
};

/**
 * Cleanup expired tournament reservations
 * This function finds and removes pending tournament reservations that have timed out
 * (10 minutes after creation), closing their Stripe sessions first
 */
const cleanupExpiredReservations = async () => {


  try {
    const now = new Date();

    // Changed from 30 minutes to 10 minutes to match new payment window
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const expiredPayments = await TournamentPayment.findAll({
      where: {
        payment_details: {
          status: 'pending'
        },
        created_at: { [Op.lt]: tenMinutesAgo }
      }
    });

    // Stripe is called before the transaction so no database connection waits on it.
    const releasablePayments = [];
    for (const payment of expiredPayments) {
      try {
        if (await closeCheckoutSession(payment.payment_details.session_id)) {
          releasablePayments.push(payment);
        }
      } catch (error) {
        console.error(`Could not close checkout session for payment ${payment.payment_id}:`, error);
      }
    }

    const result = await sequelize.transaction(async (t) => {
      if (releasablePayments.length === 0) {

        return { clearedCount: 0 };
      }



      // Extract user IDs and tournament IDs from expired payments
      const reservationData = releasablePayments.map(payment => ({
        userId: payment.user_id,
        tournamentId: payment.tournament_id,
        paymentId: payment.payment_id,
        paymentType: payment.payment_details.payment_type
      }));
      
      let clearedCount = 0;
      
      for (const { userId, tournamentId, paymentId, paymentType } of reservationData) {
        try {
          // The user may have canceled while Stripe was being called
          const currentPayment = await TournamentPayment.findByPk(paymentId, {
            lock: t.LOCK.UPDATE,
            transaction: t
          });
          if (!currentPayment || currentPayment.payment_details.status !== 'pending') {
            continue;
          }

          // 1. Delete pending participation record
          const participant = await TournamentParticipant.findOne({
            where: {
              user_id: userId,
              tournament_id: tournamentId,
              participation_status: 'pending'
            },
            transaction: t
          });
          
          if (participant) {
            await participant.destroy({ transaction: t });
            
          }

          // 2. Find and reset team slot
          const allTeamSlots = await TournamentTeam.findAll({
            where: {
              Tournament_Id: tournamentId
            },
            transaction: t
          });
          
          let userSlot = null;
          for (const slot of allTeamSlots) {
            if (slot.team_members && Array.isArray(slot.team_members)) {
              const hasMember = slot.team_members.some(member => {
                if (typeof member === 'object' && member !== null) {
                  return member.id === userId;
                }
                return String(member) === String(userId);
              });
              
              if (hasMember) {
                userSlot = slot;
                break;
              }
            }
          }
          
          if (userSlot) {
            // Members who joined before the leader's reservation expired lose their team too
            if (paymentType === 'team_registration') {
              const memberIds = userSlot.team_members.map(member =>
                typeof member === 'object' && member !== null ? member.id : member
              );
              await TournamentParticipant.destroy({
                where: {
                  tournament_id: tournamentId,
                  user_id: memberIds
                },
                transaction: t
              });
            }

            userSlot.team_members = [];

            // Only reset team-specific data for team registrations
            if (paymentType === 'team_registration') {
              userSlot.Team_Password = null;
              userSlot.Team_Name = null;
            }
            
            await userSlot.save({ transaction: t });
            
          }
          
          // 3. Update payment records to 'expired'
          const payments = await TournamentPayment.findAll({
            where: {
              user_id: userId,
              tournament_id: tournamentId,
              payment_details: {
                status: 'pending'
              }
            },
            transaction: t
          });
          
          for (const payment of payments) {
            payment.payment_details = {
              ...payment.payment_details,
              status: 'expired',
              expired_at: now.toISOString()
            };
            await payment.save({ transaction: t });
            
          }
          
          clearedCount++;
        } catch (error) {
          console.error(`Error processing reservation for user ${userId} in tournament ${tournamentId}:`, error);
        }
      }
      
      return { clearedCount };
    });
    
    
    return result;
  } catch (error) {
    console.error('Error in cleanup job:', error);
    return { error: true, message: error.message };
  }
};

const initCronJobs = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await cleanupExpiredReservations();
    } catch (error) {
      console.error('Error running cleanup cron job:', error);
    }
  });
  
  
};

module.exports = {
  initCronJobs,
  cleanupExpiredReservations 
}; 