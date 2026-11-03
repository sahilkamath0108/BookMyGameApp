const request = require('supertest');
const app = require('../../app');
const { TournamentPost, TournamentPostComment } = require('../../models');
const { resetState, closeDb, createUser, bearer, createTournament } = require('../helpers');

beforeEach(resetState);
afterEach(() => {
  delete process.env.PLATFORM_ADMIN_USER_IDS;
});
afterAll(closeDb);

async function platformAdmin() {
  const admin = await createUser();
  process.env.PLATFORM_ADMIN_USER_IDS = admin.user_id;
  return admin;
}

async function postWithComment() {
  const author = await createUser();
  const tournament = await createTournament();
  const post = await TournamentPost.create({
    Author_id: author.user_id,
    Tournament_Id: tournament.tournament_id,
    Title: 'A post',
    Content: 'Text'
  });
  const comment = await TournamentPostComment.create({
    Post_Id: post.Post_id,
    Author_id: author.user_id,
    Content: 'A comment'
  });
  return { post, comment };
}

describe('POST /api/admin-console/cleanup-expired-reservations', () => {
  const cleanup = (user) =>
    request(app)
      .post('/api/admin-console/cleanup-expired-reservations')
      .set('Authorization', bearer(user));

  it('runs for a platform admin', async () => {
    const res = await cleanup(await platformAdmin());
    expect(res.status).toBe(200);
    expect(res.body.data.clearedCount).toBe(0);
  });

  it('forbids anyone else', async () => {
    await platformAdmin();
    const res = await cleanup(await createUser());
    expect(res.status).toBe(403);
  });

  it('forbids everyone when no platform admins are configured', async () => {
    const res = await cleanup(await createUser());
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/tournament-posts/:postId', () => {
  const deletePost = (user, post) =>
    request(app)
      .delete(`/api/tournament-posts/${post.Post_id}`)
      .set('Authorization', bearer(user));

  it('lets a platform admin delete any post', async () => {
    const { post } = await postWithComment();

    const res = await deletePost(await platformAdmin(), post);

    expect(res.status).toBe(200);
    expect(await TournamentPost.findByPk(post.Post_id)).toBeNull();
  });

  it('forbids an unrelated user', async () => {
    const { post } = await postWithComment();
    await platformAdmin();

    const res = await deletePost(await createUser(), post);

    expect(res.status).toBe(403);
    expect(await TournamentPost.findByPk(post.Post_id)).not.toBeNull();
  });

  it('ignores a role sent in the request', async () => {
    const { post } = await postWithComment();

    const res = await deletePost(await createUser(), post).send({ role: 'superadmin' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/tournament-posts/comment/:commentId', () => {
  const deleteComment = (user, comment) =>
    request(app)
      .delete(`/api/tournament-posts/comment/${comment.Comment_id}`)
      .set('Authorization', bearer(user));

  it('lets a platform admin delete any comment', async () => {
    const { comment } = await postWithComment();

    const res = await deleteComment(await platformAdmin(), comment);

    expect(res.status).toBe(200);
    expect(await TournamentPostComment.findByPk(comment.Comment_id)).toBeNull();
  });

  it('forbids an unrelated user', async () => {
    const { comment } = await postWithComment();
    await platformAdmin();

    const res = await deleteComment(await createUser(), comment);

    expect(res.status).toBe(403);
    expect(await TournamentPostComment.findByPk(comment.Comment_id)).not.toBeNull();
  });
});
