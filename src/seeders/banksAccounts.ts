import { IAccountsAvailable } from "./../interfaces/finanzes/IAccounts";
import AccountsAvailableModel from "./../models/Finanzes/AccountsAvailable.model";

const banks: IAccountsAvailable[] = [
  {
    bankAccountName: "Efec Tvs MH",
    amount: 0,
  },
  {
    bankAccountName: "Popular WE4",
    amount: 0,
  },
  {
    bankAccountName: "Popular Tvs JD",
    amount: 0,
  },
  {
    bankAccountName: "BR WE4",
    amount: 0,
  },
  {
    bankAccountName: "BR MH TVs",
    amount: 0,
  },
];

const MaintenanceBanks = async () => {
  try {
    const count = await AccountsAvailableModel.countDocuments();
    if (count === 0) {
      await AccountsAvailableModel.create(banks);
    }
  } catch (error: any) {
    throw new Error(`Error: ${error}`);
  }
};

export default MaintenanceBanks;
