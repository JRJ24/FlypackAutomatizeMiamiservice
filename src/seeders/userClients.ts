import UsersModel from "./../models/Users.model";
const userClientData = [
  {
    name: "Jorge",
    email: "jorge@gmail.com",
    role: "CLIENTFLYPACK",
  },
  {
    name: "Palma",
    email: "palma@gmail.com",
    role: "CLIENTFLYPACK",
  },
  {
    name: "Daniel",
    email: "daniel@gmail.com",
    role: "CLIENTFLYPACK",
  },
  {
    name: "Angel",
    email: "angel@gmail.com",
    role: "CLIENTFLYPACK",
  },
];
const seedUsers = async () => {
  console.log("Iniciando seeder de usuarios...");

  for (const userData of userClientData) {
    try {
      // Intentamos crear el usuario
      await UsersModel.create(userData);
      console.log(`✅ Usuario creado: ${userData.email}`);
    } catch (error: any) {
      // 11000 es el código de error exacto para "Llave duplicada"
      if (error.code === 11000) {
        console.log(`⏩ El usuario ${userData.email} ya existe. Saltando...`);
      } else {
        // Si es un error diferente (ej. falta un campo requerido), lo mostramos
        console.error(`❌ Error al crear a ${userData.email}:`, error.message);
      }
    }
  }

  console.log("Seeder finalizado.");
};

export default seedUsers;
