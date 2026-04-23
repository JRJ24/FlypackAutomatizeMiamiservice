import { type IProcess } from "../interfaces/IProcessmodel";
import ProcessModel from "../models/Process.model";

const processRouterSeeder = async () => {
  try {
    const processRoutesData: IProcess[] = [
      {
        nameProcess: "Pallets",
        icon: "LayoutPanelTop",
        path: "/pallets",
        description: "",
      },
      {
        nameProcess: "Suitcases",
        icon: "Luggage",
        path: "/suitcases",
        description: "",
      },
      {
        nameProcess: "Inventory",
        icon: "CirclePile",
        path: "/inventory",
        description: "",
      },
      {
        nameProcess: "Maintenances",
        icon: "ToolCase",
        path: "/maintenances",
        description: "",
      },
      {
        nameProcess: "Invoices",
        icon: "scrollText",
        path: "/invoices",
        description: "",
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
  } catch (error) {
    console.error("Error seeding process routes:", error);
  }
};

export default processRouterSeeder;
