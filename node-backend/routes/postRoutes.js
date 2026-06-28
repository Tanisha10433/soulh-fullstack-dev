const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Helper: Map Post to DTO
const mapPostToDTO = async (post) => {
  const author = await User.findById(post.authorId);
  
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

  const likes = [];
  if (post.likeUserIds && post.likeUserIds.length > 0) {
    for (const uid of post.likeUserIds) {
      const u = await User.findById(uid);
      if (u) {
        likes.push({
          id: u._id.toString(),
          name: u.name || u.email.split('@')[0]
        });
      }
    }
  }

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
    likes: likes
  };
};

// GET /api/posts - Get paginated posts feed
router.get('/', authMiddleware, async (req, res) => {
  try {
    let { page = 0, size = 10 } = req.query;
    page = parseInt(page);
    size = parseInt(size);

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(page * size)
      .limit(size);

    const result = [];
    for (const p of posts) {
      result.push(await mapPostToDTO(p));
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/posts - Create global/general post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrl, fileUrl, illnessTag, isAnonymous, communityId } = req.body;
    
    const post = new Post({
      communityId: communityId || 'global',
      authorId: req.user._id.toString(),
      content,
      imageUrl,
      fileUrl,
      illnessTag,
      isAnonymous: isAnonymous === true || isAnonymous === 'true'
    });

    await post.save();
    res.json(await mapPostToDTO(post));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/posts/:postId/comments - Add comment
router.post('/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = new Comment({
      postId: req.params.postId,
      author: req.user._id,
      content
    });

    await comment.save();
    
    // Populate author
    const populated = await Comment.findById(comment._id).populate('author');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts/:postId/comments - Get comments
router.get('/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const list = await Comment.find({ postId: req.params.postId })
      .populate('author')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.mapPostToDTO = mapPostToDTO;
