import CounterYearModel from "./../models/CounterYear.model";

const seedFutureCounters = async() => {
  const startYear = new Date().getFullYear();
  const yearsToGenerate = 5; // Generamos para 5 años a futuro

  try {
    for (let i = 0; i <= yearsToGenerate; i++) {
      const targetYear = startYear + i;

      await CounterYearModel.findOneAndUpdate(
        { id: "invoice_counter", year: targetYear },
        { 
          $setOnInsert: { seq: 0 } // Solo pone seq: 0 si el documento NO existe
        },
        { 
          upsert: true, 
          new: true 
        }
      );
      
      console.log(`✅ Contador asegurado para el año: ${targetYear}`);
    }
  } catch (error) {
    console.error("❌ Error al generar seeds multianuales:", error);
  }
}

export default seedFutureCounters;