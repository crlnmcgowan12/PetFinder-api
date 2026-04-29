const prisma = require('../prismaClient');

/**
 * POST /api/applications
 * Private – any authenticated user
 * Body: { pet_id, message }
 */
const createApplication = async (req, res) => {
  const { pet_id, message } = req.body;

  if (!pet_id) {
    return res.status(400).json({ error: 'pet_id is required.' });
  }

  try {
    const pet = await prisma.pet.findUnique({ where: { id: parseInt(pet_id) } });
    if (!pet) return res.status(404).json({ error: 'Pet not found.' });

    if (pet.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'This pet is not currently available for adoption.' });
    }

    // Prevent duplicate applications from the same user for the same pet
    const existing = await prisma.application.findFirst({
      where: { user_id: req.user.id, pet_id: parseInt(pet_id) },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already applied for this pet.' });
    }

    const application = await prisma.application.create({
      data: {
        user_id: req.user.id,
        pet_id: parseInt(pet_id),
        message: message || null,
        status: 'PENDING',
      },
      include: {
        pet: { select: { id: true, name: true, species: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(201).json(application);
  } catch (err) {
    console.error('createApplication error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/applications
 * Private – returns only the applications the user is allowed to see:
 *   - Their own submissions (as applicant)
 *   - Applications for pets in shelters they own (as shelter owner)
 */
const getApplications = async (req, res) => {
  try {
    // Find all shelters owned by this user
    const ownedShelters = await prisma.shelter.findMany({
      where: { owner_id: req.user.id },
      select: { id: true },
    });
    const shelterIds = ownedShelters.map((s) => s.id);

    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { user_id: req.user.id },                          // applicant
          { pet: { shelter_id: { in: shelterIds } } },       // shelter owner
        ],
      },
      include: {
        pet: { select: { id: true, name: true, species: true, shelter_id: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return res.status(200).json(applications);
  } catch (err) {
    console.error('getApplications error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/applications/:id
 * Private – only applicant or shelter owner
 */
const getApplicationById = async (req, res) => {
  const { id } = req.params;
  try {
    const application = await prisma.application.findUnique({
      where: { id: parseInt(id) },
      include: {
        pet: { include: { shelter: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    const isApplicant = application.user_id === req.user.id;
    const isShelterOwner = application.pet.shelter.owner_id === req.user.id;

    if (!isApplicant && !isShelterOwner) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this application.' });
    }
    return res.status(200).json(application);
  } catch (err) {
    console.error('getApplicationById error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PUT /api/applications/:id
 * Private:
 *   - Applicant can update `message`
 *   - Shelter owner can update `status`
 */
const updateApplication = async (req, res) => {
  const { id } = req.params;
  const { message, status } = req.body;

  try {
    const application = await prisma.application.findUnique({
      where: { id: parseInt(id) },
      include: { pet: { include: { shelter: true } } },
    });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    const isApplicant = application.user_id === req.user.id;
    const isShelterOwner = application.pet.shelter.owner_id === req.user.id;

    if (!isApplicant && !isShelterOwner) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to update this application.' });
    }

    const updateData = {};

    // Applicant can update message
    if (message !== undefined) {
      if (!isApplicant) {
        return res.status(403).json({ error: 'Only the applicant can update the message.' });
      }
      updateData.message = message;
    }

    // Shelter owner can update status
    if (status !== undefined) {
      if (!isShelterOwner) {
        return res.status(403).json({ error: 'Only the shelter owner can update the application status.' });
      }
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}.` });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update. Provide message or status.' });
    }

    const updated = await prisma.application.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        pet: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updateApplication error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * DELETE /api/applications/:id
 * Private – only the applicant
 * Returns 204 No Content
 */
const deleteApplication = async (req, res) => {
  const { id } = req.params;

  try {
    const application = await prisma.application.findUnique({
      where: { id: parseInt(id) },
    });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    if (application.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. Only the applicant can delete their application.' });
    }

    await prisma.application.delete({ where: { id: parseInt(id) } });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteApplication error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
};
