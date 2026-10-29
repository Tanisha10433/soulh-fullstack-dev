const User = require('../models/User');

const mapPostsToDTO = async (posts) => {
  const userIds = new Set();
  for (const post of posts) {
    if (!post.isAnonymous && post.authorId) userIds.add(post.authorId);
    for (const id of post.likeUserIds || []) userIds.add(id);
  }

  const users = userIds.size
    ? await User.find({ _id: { $in: [...userIds] } })
      .select('name email illnessCondition isVerified role')
      .lean()
    : [];
  const usersById = new Map(users.map(user => [user._id.toString(), user]));

  return posts.map(post => {
    const author = usersById.get(post.authorId);
    let authorDTO;

    if (post.isAnonymous) {
      authorDTO = {
        name: 'Anonymous Warrior',
        isVerified: false,
        role: 'USER'
      };
    } else if (author) {
      authorDTO = {
        id: author._id.toString(),
        name: author.name || author.email.split('@')[0],
        illnessCondition: author.illnessCondition,
        isVerified: author.isVerified,
        role: author.role
      };
    } else {
      authorDTO = { name: 'Unknown' };
    }

    const likes = (post.likeUserIds || [])
      .map(id => usersById.get(id.toString()))
      .filter(Boolean)
      .map(user => ({
        id: user._id.toString(),
        name: user.name || user.email.split('@')[0]
      }));

    return {
      id: post._id.toString(),
      communityId: post.communityId,
      author: authorDTO,
      content: post.content,
      illnessTag: post.illnessTag,
      imageUrl: post.imageUrl,
      fileUrl: post.fileUrl,
      isAnonymous: post.isAnonymous,
      createdAt: post.createdAt,
      likes
    };
  });
};

const mapPostToDTO = async (post) => (await mapPostsToDTO([post]))[0];

module.exports = { mapPostToDTO, mapPostsToDTO };
