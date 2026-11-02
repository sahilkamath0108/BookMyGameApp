const request = require('supertest');
const app = require('../../app');
const { Tournament, TournamentTeam, UserAdmin } = require('../../models');
const {
  resetState,
  closeDb,
  createUser,
  bearer,
  tournamentAttributes,
  createTournament
} = require('../helpers');

beforeEach(resetState);
afterAll(closeDb);

const createViaApi = (user, overrides) =>
  request(app)
    .post('/api/tournaments/create')
    .set('Authorization', bearer(user))
    .send(tournamentAttributes(overrides));

describe('POST /api/tournaments/create', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/tournaments/create').send(tournamentAttributes());
    expect(res.status).toBe(401);
  });

  it('creates one slot per player for a solo tournament', async () => {
    const user = await createUser();
    const res = await createViaApi(user, { Team_Size_Limit: 1, Max_Players_Allowed: 8 });

    expect(res.status).toBe(201);
    const tournament = await Tournament.findOne();
    expect(await TournamentTeam.count({ where: { Tournament_Id: tournament.tournament_id } })).toBe(8);
  });

  it('creates one slot per team, rounding up, for a team tournament', async () => {
    const user = await createUser();
    await createViaApi(user, { Team_Size_Limit: 4, Max_Players_Allowed: 10 });

    const tournament = await Tournament.findOne();
    expect(await TournamentTeam.count({ where: { Tournament_Id: tournament.tournament_id } })).toBe(3);
  });

  it('makes the creator a tournament admin', async () => {
    const user = await createUser();
    await createViaApi(user);

    const tournament = await Tournament.findOne();
    const admin = await UserAdmin.findOne({
      where: { user_id: user.user_id, associated_tournament_id: tournament.tournament_id }
    });
    expect(admin.role).toBe('super_admin');
    expect(tournament.listed_by).toBe(user.user_id);
  });

  it.each([
    ['registration ends before it starts', { Registration_End_Time: new Date(Date.now() - 2 * 3600 * 1000) }],
    ['the event starts before registration ends', { Event_Start_Time: new Date(Date.now() + 1800 * 1000) }],
    ['the event ends before it starts', { Event_End_Time: new Date(Date.now() + 1.5 * 3600 * 1000) }]
  ])('rejects dates where %s', async (_description, overrides) => {
    const user = await createUser();
    const res = await createViaApi(user, overrides);

    expect(res.status).toBe(400);
    expect(await Tournament.count()).toBe(0);
  });
});

describe('PATCH /api/tournaments/:id/status', () => {
  const setStatus = (user, id, status) =>
    request(app)
      .patch(`/api/tournaments/${id}/status`)
      .set('Authorization', bearer(user))
      .send({ status });

  it('lets the tournament admin change the status', async () => {
    const admin = await createUser();
    await createViaApi(admin);
    const tournament = await Tournament.findOne();

    const res = await setStatus(admin, tournament.tournament_id, 'Registrations Closed');

    expect(res.status).toBe(200);
    await tournament.reload();
    expect(tournament.Status).toBe('Registrations Closed');
  });

  it('forbids a user who is not an admin of the tournament', async () => {
    const admin = await createUser();
    const outsider = await createUser();
    await createViaApi(admin);
    const tournament = await Tournament.findOne();
    const before = tournament.Status;

    const res = await setStatus(outsider, tournament.tournament_id, 'Ended');

    expect(res.status).toBe(403);
    await tournament.reload();
    expect(tournament.Status).toBe(before);
  });

  it('returns 404 for an unknown tournament', async () => {
    const user = await createUser();
    const res = await setStatus(user, '00000000-0000-4000-8000-000000000000', 'Ended');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tournaments/:id/approve', () => {
  // KNOWN BUG: approveTournament only checks that the caller is logged in.
  // it.failing goes red once the bug is fixed; then change it to a plain it().
  it.failing('forbids a user who is not an admin', async () => {
    const outsider = await createUser();
    const tournament = await createTournament({ Status: 'Coming Soon', is_approved: false });

    const res = await request(app)
      .patch(`/api/tournaments/${tournament.tournament_id}/approve`)
      .set('Authorization', bearer(outsider))
      .send({ isApproved: true });

    expect(res.status).toBe(403);
  });
});
