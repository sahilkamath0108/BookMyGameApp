/**
 * Fires parallel requests through a real HTTP server at a real PostgreSQL database.
 * These only mean something against Postgres: the behaviour under test is row locking.
 */
const request = require('supertest');
const app = require('../../app');
const { TournamentParticipant, TournamentPayment } = require('../../models');
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

const CONTENDERS = 20;
let server;

beforeAll((done) => {
  server = app.listen(0, done);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
});

beforeEach(async () => {
  await resetState();
  // Holding each winner in its transaction makes overlap between requests certain.
  const realCreate = stripeMock.client.checkout.sessions.create.getMockImplementation();
  stripeMock.client.checkout.sessions.create.mockImplementation(async (params) => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return realCreate(params);
  });
});

const post = (path, user, body = {}) =>
  request(server).post(path).set('Authorization', bearer(user)).send(body);

const statuses = (responses) => responses.map((res) => res.status);
const count = (responses, status) => statuses(responses).filter((s) => s === status).length;

function expectNoServerErrors(responses) {
  expect(statuses(responses).filter((status) => status >= 500)).toEqual([]);
}

describe('solo reservations (player1)', () => {
  it(`gives the last slot to exactly one of ${CONTENDERS} parallel requests`, async () => {
    const users = await createUsers(CONTENDERS);
    const tournament = await createTournament({ Max_Players_Allowed: 1 });

    const responses = await Promise.all(
      users.map((user) => post(`/api/tournaments/${tournament.tournament_id}/player1`, user))
    );

    expectNoServerErrors(responses);
    expect(count(responses, 200)).toBe(1);
    expect(count(responses, 400)).toBe(CONTENDERS - 1);

    const winner = users[statuses(responses).indexOf(200)];
    const slots = await occupiedSlots(tournament.tournament_id);
    expect(slots).toHaveLength(1);
    expect(slots[0].team_members).toEqual([{ id: winner.user_id, leader: true }]);

    const participants = await TournamentParticipant.findAll();
    expect(participants.map((p) => p.user_id)).toEqual([winner.user_id]);
    expect(await TournamentPayment.count()).toBe(1);
    expect(stripeMock.client.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('never oversells when several slots are open', async () => {
    const slotCount = 3;
    const users = await createUsers(CONTENDERS);
    const tournament = await createTournament({ Max_Players_Allowed: slotCount });

    const responses = await Promise.all(
      users.map((user) => post(`/api/tournaments/${tournament.tournament_id}/player1`, user))
    );

    expectNoServerErrors(responses);
    expect(count(responses, 200)).toBe(slotCount);

    const slots = await occupiedSlots(tournament.tournament_id);
    const holders = slots.map((slot) => slot.team_members[0].id);
    expect(slots).toHaveLength(slotCount);
    expect(new Set(holders).size).toBe(slotCount);
    expect(await TournamentParticipant.count()).toBe(slotCount);
  });

  it('gives one user a single slot when they double-submit', async () => {
    const user = await createUser();
    const tournament = await createTournament({ Max_Players_Allowed: 5 });

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        post(`/api/tournaments/${tournament.tournament_id}/player1`, user)
      )
    );

    expectNoServerErrors(responses);
    expect(count(responses, 200)).toBe(1);
    expect(count(responses, 409)).toBe(9);
    expect(await occupiedSlots(tournament.tournament_id)).toHaveLength(1);
    expect(await TournamentParticipant.count()).toBe(1);
    expect(await TournamentPayment.count()).toBe(1);
  });
});

describe('team reservations (team1)', () => {
  it(`gives the last team slot to exactly one of ${CONTENDERS} parallel requests`, async () => {
    const users = await createUsers(CONTENDERS);
    const tournament = await createTournament({ Team_Size_Limit: 4, Max_Players_Allowed: 4 });

    const responses = await Promise.all(
      users.map((user) => post(`/api/tournaments/${tournament.tournament_id}/team1`, user))
    );

    expectNoServerErrors(responses);
    expect(count(responses, 200)).toBe(1);
    expect(count(responses, 400)).toBe(CONTENDERS - 1);

    const slots = await occupiedSlots(tournament.tournament_id);
    expect(slots).toHaveLength(1);
    expect(slots[0].team_members).toHaveLength(1);
    expect(await TournamentParticipant.count()).toBe(1);
  });
});

describe('joining a team (team/join)', () => {
  it(`gives the last seat to exactly one of ${CONTENDERS} parallel requests`, async () => {
    const leader = await createUser();
    const joiners = await createUsers(CONTENDERS);
    const tournament = await createTournament({ Team_Size_Limit: 2, Max_Players_Allowed: 2 });
    await post(`/api/tournaments/${tournament.tournament_id}/team1`, leader, {
      teamPassword: 'secret'
    });

    const responses = await Promise.all(
      joiners.map((user) =>
        post(`/api/tournaments/${tournament.tournament_id}/team/join`, user, {
          teamNumber: 1,
          teamPassword: 'secret'
        })
      )
    );

    expectNoServerErrors(responses);
    expect(count(responses, 200)).toBe(1);
    expect(count(responses, 400)).toBe(CONTENDERS - 1);

    const winner = joiners[statuses(responses).indexOf(200)];
    const [slot] = await occupiedSlots(tournament.tournament_id);
    expect(slot.team_members).toEqual([
      { id: leader.user_id, leader: true },
      { id: winner.user_id, leader: false }
    ]);
    expect(await TournamentParticipant.count()).toBe(2);
  });
});
