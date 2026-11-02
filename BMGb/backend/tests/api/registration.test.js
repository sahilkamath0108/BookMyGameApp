const request = require('supertest');
const app = require('../../app');
const { TournamentParticipant, TournamentPayment, TournamentTeam } = require('../../models');
const {
  resetState,
  closeDb,
  createUser,
  createUsers,
  bearer,
  createTournament,
  occupiedSlots,
  stripeMock
} = require('../helpers');

beforeEach(resetState);
afterAll(closeDb);

const post = (path, user, body = {}) =>
  request(app).post(path).set('Authorization', bearer(user)).send(body);
const reservePlayer = (user, id, body) => post(`/api/tournaments/${id}/player1`, user, body);
const confirmPlayer = (user, id, sessionId) =>
  post(`/api/tournaments/${id}/player2`, user, { sessionId });
const reserveTeam = (user, id, body) => post(`/api/tournaments/${id}/team1`, user, body);
const confirmTeam = (user, id, sessionId) =>
  post(`/api/tournaments/${id}/team2`, user, { sessionId });
const joinTeam = (user, id, body) => post(`/api/tournaments/${id}/team/join`, user, body);

const participantOf = (user, tournament) =>
  TournamentParticipant.findOne({
    where: { user_id: user.user_id, tournament_id: tournament.tournament_id }
  });

describe('solo registration: reserve (player1)', () => {
  it('holds a slot, records a pending participant and payment, and returns a checkout URL', async () => {
    const user = await createUser();
    const tournament = await createTournament();

    const res = await reservePlayer(user, tournament.tournament_id);

    expect(res.status).toBe(200);
    expect(res.body.data.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.test\//);

    const participant = await participantOf(user, tournament);
    expect(participant.participation_status).toBe('pending');

    const [slot, ...others] = await occupiedSlots(tournament.tournament_id);
    expect(others).toHaveLength(0);
    expect(slot.team_members).toEqual([{ id: user.user_id, leader: true }]);

    const payment = await TournamentPayment.findOne();
    expect(payment.payment_details.status).toBe('pending');
    expect(payment.payment_details.session_id).toBe(res.body.data.session_id);
  });

  it('charges registration plus platform and organizer fees, in minor units', async () => {
    const user = await createUser();
    const tournament = await createTournament({
      Registration_Amount: '10.00',
      Platform_fee: '1.50',
      Organizer_fee: '0.25'
    });

    await reservePlayer(user, tournament.tournament_id);

    const [params] = stripeMock.client.checkout.sessions.create.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(1175);
    expect(params.metadata).toMatchObject({
      user_id: user.user_id,
      tournament_id: tournament.tournament_id,
      payment_type: 'player_registration'
    });
    expect((await TournamentPayment.findOne()).amount).toBe(11.75);
  });

  it('returns 404 when the tournament is not accepting registrations', async () => {
    const user = await createUser();
    const tournament = await createTournament({ Status: 'Registrations Closed' });

    const res = await reservePlayer(user, tournament.tournament_id);

    expect(res.status).toBe(404);
    expect(stripeMock.client.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a team tournament', async () => {
    const user = await createUser();
    const tournament = await createTournament({ Team_Size_Limit: 2 });

    const res = await reservePlayer(user, tournament.tournament_id);

    expect(res.status).toBe(404);
  });

  it('rejects a second reservation by the same user with 409', async () => {
    const user = await createUser();
    const tournament = await createTournament();
    await reservePlayer(user, tournament.tournament_id);

    const res = await reservePlayer(user, tournament.tournament_id);

    expect(res.status).toBe(409);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(1);
  });

  it('rejects a reservation when every slot is taken', async () => {
    const [first, second] = await createUsers(2);
    const tournament = await createTournament({ Max_Players_Allowed: 1 });
    await reservePlayer(first, tournament.tournament_id);

    const res = await reservePlayer(second, tournament.tournament_id);

    expect(res.status).toBe(400);
    expect(await participantOf(second, tournament)).toBeNull();
  });

  it('rolls everything back when Stripe fails, leaving the slot free', async () => {
    const user = await createUser();
    const tournament = await createTournament({ Max_Players_Allowed: 1 });
    stripeMock.client.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe is down'));

    const res = await reservePlayer(user, tournament.tournament_id);

    expect(res.status).toBe(500);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(0);
    expect(await TournamentParticipant.count()).toBe(0);
    expect(await TournamentPayment.count()).toBe(0);
  });

  it('rejects a team name already used in the tournament, keeping the slot free', async () => {
    const [first, second] = await createUsers(2);
    const tournament = await createTournament();
    await reservePlayer(first, tournament.tournament_id, { teamName: 'Taken' });

    const res = await reservePlayer(second, tournament.tournament_id, { teamName: 'Taken' });

    expect(res.status).toBe(409);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(1);
    expect(await participantOf(second, tournament)).toBeNull();
  });
});

describe('solo registration: confirm (player2)', () => {
  async function reserved() {
    const user = await createUser();
    const tournament = await createTournament();
    const res = await reservePlayer(user, tournament.tournament_id);
    return { user, tournament, sessionId: res.body.data.session_id };
  }

  it('refuses to confirm while the session is unpaid', async () => {
    const { user, tournament, sessionId } = await reserved();

    const res = await confirmPlayer(user, tournament.tournament_id, sessionId);

    expect(res.status).toBe(400);
    expect((await participantOf(user, tournament)).participation_status).toBe('pending');
    expect((await TournamentPayment.findOne()).payment_details.status).toBe('pending');
  });

  it('confirms the participant and completes the payment once paid', async () => {
    const { user, tournament, sessionId } = await reserved();
    stripeMock.markSessionPaid(sessionId);

    const res = await confirmPlayer(user, tournament.tournament_id, sessionId);

    expect(res.status).toBe(200);
    expect(res.body.data.remainingSlots).toBe(tournament.Max_Players_Allowed - 1);
    expect((await participantOf(user, tournament)).participation_status).toBe('confirmed');

    const payments = await TournamentPayment.findAll();
    expect(payments).toHaveLength(1);
    expect(payments[0].payment_details.status).toBe('completed');
    expect(payments[0].payment_details.payment_intent).toBe(`pi_${sessionId}`);
  });

  it('returns 404 on a repeat confirm and does not duplicate the payment', async () => {
    const { user, tournament, sessionId } = await reserved();
    stripeMock.markSessionPaid(sessionId);
    await confirmPlayer(user, tournament.tournament_id, sessionId);

    const res = await confirmPlayer(user, tournament.tournament_id, sessionId);

    expect(res.status).toBe(404);
    expect(await TournamentPayment.count()).toBe(1);
  });

  it('returns 404 for a user with no reservation', async () => {
    const { tournament, sessionId } = await reserved();
    const stranger = await createUser();
    stripeMock.markSessionPaid(sessionId);

    const res = await confirmPlayer(stranger, tournament.tournament_id, sessionId);

    expect(res.status).toBe(404);
  });

  // KNOWN BUG: confirm checks payment_status but never session.metadata, so a paid
  // session for one tournament can confirm a reservation in another.
  // it.failing goes red once the bug is fixed; then change it to a plain it().
  it.failing('rejects a paid session that belongs to a different tournament', async () => {
    const user = await createUser();
    const cheap = await createTournament({ Registration_Amount: '1.00' });
    const expensive = await createTournament({ Registration_Amount: '500.00' });

    const cheapRes = await reservePlayer(user, cheap.tournament_id);
    await reservePlayer(user, expensive.tournament_id);
    stripeMock.markSessionPaid(cheapRes.body.data.session_id);

    await confirmPlayer(user, expensive.tournament_id, cheapRes.body.data.session_id);

    expect((await participantOf(user, expensive)).participation_status).toBe('pending');
  });

  // KNOWN BUG: same missing check, across users.
  it.failing("rejects another user's paid session", async () => {
    const [payer, freeloader] = await createUsers(2);
    const tournament = await createTournament();

    const paid = await reservePlayer(payer, tournament.tournament_id);
    await reservePlayer(freeloader, tournament.tournament_id);
    stripeMock.markSessionPaid(paid.body.data.session_id);

    await confirmPlayer(freeloader, tournament.tournament_id, paid.body.data.session_id);

    expect((await participantOf(freeloader, tournament)).participation_status).toBe('pending');
  });
});

describe('solo registration: cancel', () => {
  it('frees the slot, removes the participant, and marks the payment canceled', async () => {
    const user = await createUser();
    const tournament = await createTournament();
    await reservePlayer(user, tournament.tournament_id);

    const res = await request(app)
      .delete(`/api/tournaments/${tournament.tournament_id}/player/cancel`)
      .set('Authorization', bearer(user));

    expect(res.status).toBe(200);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(0);
    expect(await participantOf(user, tournament)).toBeNull();
    expect((await TournamentPayment.findOne()).payment_details.status).toBe('canceled');
  });

  it('lets the freed slot be reserved by someone else', async () => {
    const [first, second] = await createUsers(2);
    const tournament = await createTournament({ Max_Players_Allowed: 1 });
    await reservePlayer(first, tournament.tournament_id);
    await request(app)
      .delete(`/api/tournaments/${tournament.tournament_id}/player/cancel`)
      .set('Authorization', bearer(first));

    const res = await reservePlayer(second, tournament.tournament_id);

    expect(res.status).toBe(200);
  });

  it('returns 404 when the user has no reservation', async () => {
    const user = await createUser();
    const tournament = await createTournament();

    const res = await request(app)
      .delete(`/api/tournaments/${tournament.tournament_id}/player/cancel`)
      .set('Authorization', bearer(user));

    expect(res.status).toBe(404);
  });
});

describe('team registration', () => {
  const teamTournament = (overrides) =>
    createTournament({ Team_Size_Limit: 2, Max_Players_Allowed: 4, ...overrides });

  it('reserves a team slot with the creator as leader', async () => {
    const leader = await createUser();
    const tournament = await teamTournament();

    const res = await reserveTeam(leader, tournament.tournament_id, {
      teamName: 'Alpha',
      teamPassword: 'secret'
    });

    expect(res.status).toBe(200);
    const slot = await TournamentTeam.findByPk(res.body.data.team_id);
    expect(slot.team_members).toEqual([{ id: leader.user_id, leader: true }]);
    expect(slot.Team_Name).toBe('Alpha');
    expect((await participantOf(leader, tournament)).participation_status).toBe('pending');
  });

  it('rejects a team name already taken in the tournament', async () => {
    const [first, second] = await createUsers(2);
    const tournament = await teamTournament();
    await reserveTeam(first, tournament.tournament_id, { teamName: 'Alpha' });

    const res = await reserveTeam(second, tournament.tournament_id, { teamName: 'Alpha' });

    expect(res.status).toBe(409);
  });

  it('rejects a reservation when no team slots remain', async () => {
    const [first, second] = await createUsers(2);
    const tournament = await teamTournament({ Max_Players_Allowed: 2 });
    await reserveTeam(first, tournament.tournament_id);

    const res = await reserveTeam(second, tournament.tournament_id);

    expect(res.status).toBe(400);
  });

  it('confirms the leader only after payment', async () => {
    const leader = await createUser();
    const tournament = await teamTournament();
    const reserved = await reserveTeam(leader, tournament.tournament_id);
    const sessionId = reserved.body.data.session_id;

    const unpaid = await confirmTeam(leader, tournament.tournament_id, sessionId);
    expect(unpaid.status).toBe(400);

    stripeMock.markSessionPaid(sessionId);
    const paid = await confirmTeam(leader, tournament.tournament_id, sessionId);

    expect(paid.status).toBe(200);
    expect((await participantOf(leader, tournament)).participation_status).toBe('confirmed');
    expect((await TournamentPayment.findOne()).payment_details.status).toBe('completed');
  });

  describe('joining', () => {
    async function teamWithLeader(overrides) {
      const leader = await createUser();
      const tournament = await teamTournament(overrides);
      await reserveTeam(leader, tournament.tournament_id, { teamPassword: 'secret' });
      return { leader, tournament };
    }

    it('adds a member with the right password', async () => {
      const { tournament } = await teamWithLeader();
      const member = await createUser();

      const res = await joinTeam(member, tournament.tournament_id, {
        teamNumber: 1,
        teamPassword: 'secret'
      });

      expect(res.status).toBe(200);
      const [slot] = await occupiedSlots(tournament.tournament_id);
      expect(slot.team_members).toContainEqual({ id: member.user_id, leader: false });
      expect((await participantOf(member, tournament)).participation_status).toBe('confirmed');
    });

    it('rejects a wrong password with 404', async () => {
      const { tournament } = await teamWithLeader();
      const member = await createUser();

      const res = await joinTeam(member, tournament.tournament_id, {
        teamNumber: 1,
        teamPassword: 'wrong'
      });

      expect(res.status).toBe(404);
      expect(await participantOf(member, tournament)).toBeNull();
    });

    it.each([
      ['password', { teamNumber: 1 }],
      ['team number', { teamPassword: 'secret' }]
    ])('requires a %s', async (_field, body) => {
      const { tournament } = await teamWithLeader();
      const member = await createUser();

      const res = await joinTeam(member, tournament.tournament_id, body);

      expect(res.status).toBe(400);
    });

    it('rejects joining a full team', async () => {
      const { tournament } = await teamWithLeader();
      const [second, third] = await createUsers(2);
      const body = { teamNumber: 1, teamPassword: 'secret' };
      await joinTeam(second, tournament.tournament_id, body);

      const res = await joinTeam(third, tournament.tournament_id, body);

      expect(res.status).toBe(400);
      expect(await participantOf(third, tournament)).toBeNull();
    });

    it('rejects a user joining twice', async () => {
      const { tournament } = await teamWithLeader({ Team_Size_Limit: 3, Max_Players_Allowed: 6 });
      const member = await createUser();
      const body = { teamNumber: 1, teamPassword: 'secret' };
      await joinTeam(member, tournament.tournament_id, body);

      const res = await joinTeam(member, tournament.tournament_id, body);

      expect(res.status).toBe(409);
      const [slot] = await occupiedSlots(tournament.tournament_id);
      expect(slot.team_members).toHaveLength(2);
    });
  });
});
