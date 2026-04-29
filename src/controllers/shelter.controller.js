const prisma = require('../../prisma/prismaClient');


//get, oublic, list all sheleter 
const getAllShelters = async (req, res) => {
  try {
    const shelters = await prisma.shelter.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return res.status(200).json(shelters);
  } catch (err) {
    console.error('getAllShelters error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//get, public, one shelter
const getShelterById = async (req, res) => {
  const { id } = req.params;
  try {
    const shelter = await prisma.shelter.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        pets: true,
      },
    });
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });
    return res.status(200).json(shelter);
  } catch (err) {
    console.error('getShelterById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//post, private
const createShelter = async (req, res) => {
  const { name, city, state, phone } = req.body;

  if (!name || !city || !state || !phone) {
    return res.status(400).json({ error: 'name, city, state, and phone are required.' });
  }

  try {
    const shelter = await prisma.shelter.create({
      data: { name, city, state, phone, owner_id: req.user.id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return res.status(201).json(shelter);
  } catch (err) {
    console.error('createShelter error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//put, private
const updateShelter = async (req, res) => {
  const { id } = req.params;
  const { name, city, state, phone } = req.body;

  try {
    const shelter = await prisma.shelter.findUnique({ where: { id: parseInt(id) } });
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });

    if (shelter.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the shelter owner can update this shelter.' });
    }

    const updated = await prisma.shelter.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(city && { city }),
        ...(state && { state }),
        ...(phone && { phone }),
      },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updateShelter error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//delete, 204 no content too
const deleteShelter = async (req, res) => {
  const { id } = req.params;

  try {
    const shelter = await prisma.shelter.findUnique({
      where: { id: parseInt(id) },
      include: { pets: { include: { applications: true } } },
    });
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });

    if (shelter.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the shelter owner can delete this shelter.' });
    }

    // cascade delete
    for (const pet of shelter.pets) {
      await prisma.application.deleteMany({ where: { pet_id: pet.id } });
    }
    await prisma.pet.deleteMany({ where: { shelter_id: parseInt(id) } });
    await prisma.shelter.delete({ where: { id: parseInt(id) } });

    return res.status(204).send();
  } catch (err) {
    console.error('deleteShelter error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { getAllShelters, getShelterById, createShelter, updateShelter, deleteShelter };
