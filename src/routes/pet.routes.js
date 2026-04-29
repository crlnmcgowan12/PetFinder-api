const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAllPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
} = require('../controllers/pet.controller');

router.get('/', getAllPets);
router.get('/:id', getPetById);
router.post('/', authenticate, createPet);
router.put('/:id', authenticate, updatePet);
router.delete('/:id', authenticate, deletePet);

module.exports = router;
