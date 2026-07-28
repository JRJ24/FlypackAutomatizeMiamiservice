import UsersModel from "./../models/Users.model";
import crypto from "crypto";

const getEmailIndex = (email: string) =>
  crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const userClientData = [
  {
    name: "Jorge",
    email: "jorge@gmail.com",
    role: "CLIENTFLYPACK",
    clientCode: "CL-0002",
  },
  {
    name: "Palma",
    email: "palma@gmail.com",
    role: "CLIENTFLYPACK",
    clientCode: "CL-0003",
  },
  {
    name: "Daniel",
    email: "daniel@gmail.com",
    role: "CLIENTFLYPACK",
    clientCode: "CL-0001",
  },
  {
    name: "Angel",
    email: "angel@gmail.com",
    role: "CLIENTFLYPACK",
    clientCode: "CL-0004",
  },
];
const seedUsers = async () => {
  console.log("Iniciando seeder de usuarios...");

  for (const userData of userClientData) {
    try {
      const existingUser = await UsersModel.findOne({
        emailIndex: getEmailIndex(userData.email),
      });

      if (existingUser) {
        existingUser.role = userData.role;
        existingUser.clientCode = userData.clientCode;
        await existingUser.save();
        console.log(`Usuario actualizado: ${userData.email}`);
        continue;
      }

      await UsersModel.create(userData);
      console.log(`Usuario creado: ${userData.email}`);
    } catch (error: any) {
      if (error.code === 11000) {
        console.log(`El usuario ${userData.email} ya existe. Saltando...`);
      } else {
        console.error(`Error al crear a ${userData.email}:`, error.message);
      }
    }
  }

  console.log("Seeder finalizado.");
};

export default seedUsers;
