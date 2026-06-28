const express = require('express');
const router = express.Router();
const Community = require('../models/Community');
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

// --- COMMUNITY ENDPOINTS (/api/communities) ---

// Get all communities
router.get('/', authMiddleware, async (req, res) => {
  try {
    const list = await Community.find();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get community joined feed
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const joinedCommunities = await Community.find({ members: req.user._id });
    const communityIds = joinedCommunities.map(c => c._id.toString());
    
    const posts = await Post.find({ communityId: { $in: communityIds } }).sort({ createdAt: -1 });
    
    const result = [];
    for (const p of posts) {
      result.push(await mapPostToDTO(p));
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get community by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const comm = await Community.findById(req.params.id);
    if (!comm) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(comm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get posts for community
router.get('/:id/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ communityId: req.params.id }).sort({ createdAt: -1 });
    const result = [];
    for (const p of posts) {
      result.push(await mapPostToDTO(p));
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create post under community
router.post('/:id/posts', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrl, fileUrl, illnessTag, isAnonymous } = req.body;
    
    const post = new Post({
      communityId: req.params.id,
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

// Join community
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const comm = await Community.findById(req.params.id);
    if (!comm) return res.status(404).json({ error: 'Community not found' });

    if (!comm.members.includes(req.user._id)) {
      comm.members.push(req.user._id);
      await comm.save();
    }
    res.json({ message: 'Joined' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave community
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const comm = await Community.findById(req.params.id);
    if (!comm) return res.status(404).json({ error: 'Community not found' });

    comm.members = comm.members.filter(m => m.toString() !== req.user._id.toString());
    await comm.save();
    res.json({ message: 'Left' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- GLOBAL/PAGINATED POST ENDPOINTS (/api/posts) ---

// Get paginated posts feed
router.get('/posts/feed/all', authMiddleware, async (req, res) => {
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

// Create global/general post
router.post('/posts/create', authMiddleware, async (req, res) => {
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

// Update post
router.patch('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.authorId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    post.content = req.body.content;
    await post.save();
    res.json(await mapPostToDTO(post));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete post
router.delete('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.authorId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like post
router.post('/posts/:postId/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const index = post.likeUserIds.indexOf(req.user._id.toString());
    if (index > -1) {
      post.likeUserIds.splice(index, 1);
    } else {
      post.likeUserIds.push(req.user._id.toString());
    }

    await post.save();
    res.json(await mapPostToDTO(post));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to post
router.post('/posts/:postId/comments', authMiddleware, async (req, res) => {
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

// Get post comments
router.get('/posts/:postId/comments', authMiddleware, async (req, res) => {
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
