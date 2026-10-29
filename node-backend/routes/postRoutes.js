const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { mapPostToDTO, mapPostsToDTO } = require('../utils/postDto');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/posts - Get paginated posts feed
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 0);
    const size = Number(req.query.size ?? 10);
    if (!Number.isInteger(page) || !Number.isInteger(size) || page < 0 || size < 1 || size > 50) {
      return res.status(400).json({ error: 'page must be non-negative and size must be between 1 and 50' });
    }

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(page * size)
      .limit(size)
      .lean();
    res.json(await mapPostsToDTO(posts));
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
