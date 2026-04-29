const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require('../controllers/application.controller');

// All application routes require authentication
router.post('/', authenticate, createApplication);
router.get('/', authenticate, getApplications);
router.get('/:id', authenticate, getApplicationById);
router.put('/:id', authenticate, updateApplication);
router.delete('/:id', authenticate, deleteApplication);

module.exports = router;
