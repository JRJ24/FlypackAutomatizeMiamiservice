import { type IProcess } from "../interfaces/IProcessmodel";
import ProcessModel from "../models/Process.model";

const processRouterSeeder = async () => {
  try {
    const count = await ProcessModel.countDocuments();
    if (count === 0) {
      const processRoutesData: IProcess[] = [
        {
          nameProcess: "Pallets",
          icon: "LayoutPanelTop",
          path: "/pallets",
        },
        {
          nameProcess: "Suitcases",
          icon: "Luggage",
          path: "/suitcases",
        },
      ];

      for (const processData of processRoutesData) {
        const existingRoute = await ProcessModel.findOne({
          path: processData.path,
        });
        if (!existingRoute) {
          await ProcessModel.create(processData);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding process routes:", error);
  }
};

export default processRouterSeeder;