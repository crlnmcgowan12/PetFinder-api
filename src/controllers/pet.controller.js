const prisma = require('../../prisma/prismaClient');




//helper, returns or sends error

const verifyPetOwnership = async (res, petId, userId) => {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: { shelter: true },
  });
  if (!pet) {
    res.status(404).json({ error: 'Pet not found.' });
    return null;
  }
  if (pet.shelter.owner_id !== userId) {
    res.status(403).json({ error: 'Forbidden. Only the shelter owner can modify this pet.' });
    return null;
  }
  return pet;
};

//get, public

const getAllPets = async (req, res) => {
  const { species, status } = req.query;
  try {
    const pets = await prisma.pet.findMany({
      where: {
        ...(species && { species: { equals: species, mode: 'insensitive' } }),
        ...(status && { status }),
      },
      include: { shelter: { select: { id: true, name: true, city: true, state: true } } },
    });
    return res.status(200).json(pets);
  } catch (err) {
    console.error('getAllPets error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//get, public, one pet
const getPetById = async (req, res) => {
  const { id } = req.params;
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: parseInt(id) },
      include: { shelter: true },
    });
    if (!pet) return res.status(404).json({ error: 'Pet not found.' });
    return res.status(200).json(pet);
  } catch (err) {
    console.error('getPetById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//post, private

const createPet = async (req, res) => {
  const { name, species, breed, age, status, shelter_id } = req.body;

  if (!name || !species || !shelter_id) {
    return res.status(400).json({ error: 'name, species, and shelter_id are required.' });
  }

  try {
    const shelter = await prisma.shelter.findUnique({ where: { id: parseInt(shelter_id) } });
    if (!shelter) return res.status(404).json({ error: 'Shelter not found.' });

    if (shelter.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the shelter owner can add pets.' });
    }

    const pet = await prisma.pet.create({
      data: {
        name,
        species,
        breed: breed || null,
        age: age ? parseInt(age) : null,
        status: status || 'AVAILABLE',
        shelter_id: parseInt(shelter_id),
      },
      include: { shelter: { select: { id: true, name: true } } },
    });
    return res.status(201).json(pet);
  } catch (err) {
    console.error('createPet error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//put, private, only owner
const updatePet = async (req, res) => {
  const { id } = req.params;
  const { name, species, breed, age, status } = req.body;

  try {
    const pet = await verifyPetOwnership(res, parseInt(id), req.user.id);
    if (!pet) return;

    const updated = await prisma.pet.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(species && { species }),
        ...(breed !== undefined && { breed }),
        ...(age !== undefined && { age: age ? parseInt(age) : null }),
        ...(status && { status }),
      },
      include: { shelter: { select: { id: true, name: true } } },
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updatePet error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

//delete, return 204 no content
const deletePet = async (req, res) => {
  const { id } = req.params;

  try {
    const pet = await verifyPetOwnership(res, parseInt(id), req.user.id);
    if (!pet) return;

    // remove other applications first
    await prisma.application.deleteMany({ where: { pet_id: parseInt(id) } });
    await prisma.pet.delete({ where: { id: parseInt(id) } });

    return res.status(204).send();
  } catch (err) {
    console.error('deletePet error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { getAllPets, getPetById, createPet, updatePet, deletePet };
