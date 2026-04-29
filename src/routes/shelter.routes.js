const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAllShelters,
  getShelterById,
  createShelter,
  updateShelter,
  deleteShelter,
} = require('../controllers/shelter.controller');

router.get('/', getAllShelters);
router.get('/:id', getShelterById);
router.post('/', authenticate, createShelter);
router.put('/:id', authenticate, updateShelter);
router.delete('/:id', authenticate, deleteShelter);

module.exports = router;
