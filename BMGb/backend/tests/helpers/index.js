const jwt = require('jsonwebtoken');
const { sequelize } = require('../../config/database');
const { User, Tournament, TournamentTeam } = require('../../models');
const stripeMock = require('stripe');

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

/** Clears every table and the Stripe mock. Call from beforeEach. */
async function resetState() {
  const tables = Object.values(sequelize.models)
    .map((model) => {
      const { schema, tableName } = model.getTableName();
      return `"${schema}"."${tableName}"`;
    })
    .join(', ');
  await sequelize.query(`TRUNCATE ${tables} CASCADE;`);
  stripeMock.reset();
}

const closeDb = () => sequelize.close();

function createUser(overrides = {}) {
  const id = unique();
  return User.create({
    Name: `Player ${id}`,
    email: `player-${id}@example.test`,
    password: 'Password123!',
    ...overrides
  });
}

const createUsers = (count) => Promise.all(Array.from({ length: count }, () => createUser()));

function tokenFor(user, options = { expiresIn: '1h' }) {
  return jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, options);
}

const bearer = (user) => `Bearer ${tokenFor(user)}`;

function tournamentAttributes(overrides = {}) {
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  return {
    tournament_Name: `Tournament ${unique()}`,
    Registration_Amount: '10.00',
    Currency: 'USD',
    Registration_Start_Time: new Date(now - hour),
    Registration_End_Time: new Date(now + hour),
    Event_Start_Time: new Date(now + 2 * hour),
    Event_End_Time: new Date(now + 3 * hour),
    Status: 'Accepting Registrations',
    GameName: 'Valorant',
    Team_Size_Limit: 1,
    Max_Players_Allowed: 4,
    ...overrides
  };
}

/** Creates a tournament with its slots, laid out as createTournament does. */
async function createTournament(overrides = {}) {
  const tournament = await Tournament.create(tournamentAttributes(overrides));
  const slotCount = Math.ceil(tournament.Max_Players_Allowed / tournament.Team_Size_Limit);
  await TournamentTeam.bulkCreate(
    Array.from({ length: slotCount }, (_, index) => ({
      Tournament_Id: tournament.tournament_id,
      Team_Number: index + 1,
      team_members: []
    }))
  );
  return tournament;
}

/** Slots that have at least one member. */
async function occupiedSlots(tournamentId) {
  const slots = await TournamentTeam.findAll({ where: { Tournament_Id: tournamentId } });
  return slots.filter((slot) => slot.team_members.length > 0);
}

module.exports = {
  resetState,
  closeDb,
  createUser,
  createUsers,
  tokenFor,
  bearer,
  tournamentAttributes,
  createTournament,
  occupiedSlots,
  stripeMock
};
