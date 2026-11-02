const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../config/database');
const { TournamentParticipant, TournamentPayment, TournamentTeam } = require('../../models');
const { cleanupExpiredReservations } = require('../../utils/cronService');
const {
  resetState,
  closeDb,
  createUser,
  bearer,
  createTournament,
  occupiedSlots,
  stripeMock
} = require('../helpers');

beforeEach(resetState);
afterAll(closeDb);

const post = (path, user, body = {}) =>
  request(app).post(path).set('Authorization', bearer(user)).send(body);

const reserve = (user, tournament) =>
  post(`/api/tournaments/${tournament.tournament_id}/player1`, user);

// created_at is managed by Sequelize, so backdating needs raw SQL.
async function ageAllPayments(minutes) {
  const { schema, tableName } = TournamentPayment.getTableName();
  await sequelize.query(
    `UPDATE "${schema}"."${tableName}" SET created_at = NOW() - INTERVAL '${Number(minutes)} minutes'`
  );
}

describe('cleanupExpiredReservations', () => {
  it('releases a reservation unpaid for more than 10 minutes', async () => {
    const user = await createUser();
    const tournament = await createTournament({ Max_Players_Allowed: 1 });
    await reserve(user, tournament);
    await ageAllPayments(11);

    const result = await cleanupExpiredReservations();

    expect(result.clearedCount).toBe(1);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(0);
    expect(await TournamentParticipant.count()).toBe(0);

    const payment = await TournamentPayment.findOne();
    expect(payment.payment_details.status).toBe('expired');
    expect(payment.payment_details.expired_at).toBeDefined();
  });

  it('makes the released slot available again', async () => {
    const [first, second] = [await createUser(), await createUser()];
    const tournament = await createTournament({ Max_Players_Allowed: 1 });
    await reserve(first, tournament);
    await ageAllPayments(11);
    await cleanupExpiredReservations();

    const res = await reserve(second, tournament);

    expect(res.status).toBe(200);
  });

  it('keeps a reservation younger than 10 minutes', async () => {
    const user = await createUser();
    const tournament = await createTournament();
    await reserve(user, tournament);
    await ageAllPayments(9);

    const result = await cleanupExpiredReservations();

    expect(result.clearedCount).toBe(0);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(1);
    expect((await TournamentPayment.findOne()).payment_details.status).toBe('pending');
  });

  it('keeps an old reservation that was paid', async () => {
    const user = await createUser();
    const tournament = await createTournament();
    const reserved = await reserve(user, tournament);
    const sessionId = reserved.body.data.session_id;
    stripeMock.markSessionPaid(sessionId);
    await post(`/api/tournaments/${tournament.tournament_id}/player2`, user, { sessionId });
    await ageAllPayments(60);

    await cleanupExpiredReservations();

    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(1);
    expect((await TournamentParticipant.findOne()).participation_status).toBe('confirmed');
    expect((await TournamentPayment.findOne()).payment_details.status).toBe('completed');
  });

  it('clears team name and password when releasing a team reservation', async () => {
    const leader = await createUser();
    const tournament = await createTournament({ Team_Size_Limit: 2, Max_Players_Allowed: 2 });
    await post(`/api/tournaments/${tournament.tournament_id}/team1`, leader, {
      teamName: 'Alpha',
      teamPassword: 'secret'
    });
    await ageAllPayments(11);

    await cleanupExpiredReservations();

    const slot = await TournamentTeam.findOne();
    expect(slot.team_members).toEqual([]);
    expect(slot.Team_Name).toBeNull();
    expect(slot.Team_Password).toBeNull();
  });

  // KNOWN BUG: cleanup empties the slot and deletes only the leader's participant row,
  // so a member who joined while the leader was unpaid stays "confirmed" with no team.
  // it.failing goes red once the bug is fixed; then change it to a plain it().
  it.failing('leaves no confirmed member without a team when a leader expires', async () => {
    const leader = await createUser();
    const member = await createUser();
    const tournament = await createTournament({ Team_Size_Limit: 2, Max_Players_Allowed: 2 });
    await post(`/api/tournaments/${tournament.tournament_id}/team1`, leader, {
      teamPassword: 'secret'
    });
    await post(`/api/tournaments/${tournament.tournament_id}/team/join`, member, {
      teamNumber: 1,
      teamPassword: 'secret'
    });
    await ageAllPayments(11);

    await cleanupExpiredReservations();

    expect(await TournamentParticipant.count()).toBe(0);
  });

  // KNOWN BUG: reservations expire at 10 minutes but Stripe sessions stay payable for 30,
  // so a customer can be charged for a slot that has already been released.
  it.failing('honours a payment completed after the reservation was released', async () => {
    const user = await createUser();
    const tournament = await createTournament();
    const reserved = await reserve(user, tournament);
    const sessionId = reserved.body.data.session_id;
    await ageAllPayments(11);
    await cleanupExpiredReservations();
    stripeMock.markSessionPaid(sessionId);

    const res = await post(`/api/tournaments/${tournament.tournament_id}/player2`, user, {
      sessionId
    });

    expect(res.status).toBe(200);
  });
});
