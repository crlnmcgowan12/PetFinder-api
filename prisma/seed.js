const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // I think the emojis are okay and not unproffesional but please let me know prof/ta
  
  await prisma.application.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.shelter.deleteMany();
  await prisma.user.deleteMany();

  // users
  const adminPassword = await bcrypt.hash('Admin1234!', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Owner',
      email: 'admin@petfinder.com',
      password_hash: adminPassword,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  const regularPassword = await bcrypt.hash('User1234!', 10);
  const regularUser = await prisma.user.create({
    data: {
      name: 'Regular User',
      email: 'user@petfinder.com',
      password_hash: regularPassword,
    },
  });
  console.log(`✅ Created regular user: ${regularUser.email}`);

  // shekter
  const shelter = await prisma.shelter.create({
    data: {
      name: 'Happy Paws Shelter',
      city: 'Charlotte',
      state: 'NC',
      phone: '704-555-0100',
      owner_id: admin.id,
    },
  });
  console.log(`✅ Created shelter: ${shelter.name}`);

  // pets
  const pet1 = await prisma.pet.create({
    data: {
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
      status: 'AVAILABLE',
      shelter_id: shelter.id,
    },
  });
  console.log(`✅ Created pet: ${pet1.name}`);

  const pet2 = await prisma.pet.create({
    data: {
      name: 'Whiskers',
      species: 'Cat',
      breed: 'Domestic Shorthair',
      age: 2,
      status: 'AVAILABLE',
      shelter_id: shelter.id,
    },
  });
  console.log(`✅ Created pet: ${pet2.name}`);

  // application
  const application = await prisma.application.create({
    data: {
      user_id: regularUser.id,
      pet_id: pet1.id,
      status: 'PENDING',
      message: 'I would love to adopt Buddy! I have a large backyard and lots of love to give.',
    },
  });
  console.log(`✅ Created application ID: ${application.id}`);

  console.log('\n📋 Seed Summary:');
  console.log(`   Admin  → email: admin@petfinder.com  | password: Admin1234!  | id: ${admin.id}`);
  console.log(`   User   → email: user@petfinder.com   | password: User1234!   | id: ${regularUser.id}`);
  console.log(`   Shelter ID: ${shelter.id}`);
  console.log(`   Pet IDs: ${pet1.id} (Buddy), ${pet2.id} (Whiskers)`);
  console.log(`   Application ID: ${application.id}`);
  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
