const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const DEFAULT_BALANCE = 1000.0;

const OPERATION_CODES = {
  TOTAL: "TOTAL ",
  CREDIT: "CREDIT",
  DEBIT: "DEBIT ",
  READ: "READ",
  WRITE: "WRITE",
};

const MENU_OPTIONS = {
  VIEW_BALANCE: "1",
  CREDIT_ACCOUNT: "2",
  DEBIT_ACCOUNT: "3",
  EXIT: "4",
};

let storageBalance = 1000.0;

function createConsoleWriter(stream = output) {
  return (message) => {
    stream.write(message);
  };
}

function formatBalance(balance) {
  const [wholeNumber, decimalNumber] = balance.toFixed(2).split(".");
  return `${wholeNumber.padStart(6, "0")}.${decimalNumber}`;
}

function getStorageBalance() {
  return storageBalance;
}

function resetStorageBalance() {
  storageBalance = DEFAULT_BALANCE;
}

function dataProgram(operationType, balance) {
  if (operationType === OPERATION_CODES.READ) {
    return storageBalance;
  }

  if (operationType === OPERATION_CODES.WRITE) {
    storageBalance = balance;
    return storageBalance;
  }

  return storageBalance;
}

async function promptForAmount(io, label) {
  const response = await io.question(`Enter ${label} amount: \n`);
  const amount = Number.parseFloat(response);

  if (Number.isNaN(amount)) {
    output.write("Invalid amount entered.\n");
    return null;
  }

  return amount;
}

async function operationsProgram(passedOperation, io, write = createConsoleWriter()) {
  if (passedOperation === OPERATION_CODES.TOTAL) {
    const finalBalance = dataProgram(OPERATION_CODES.READ);
    write(`Current balance: ${formatBalance(finalBalance)}\n`);
    return;
  }

  if (passedOperation === OPERATION_CODES.CREDIT) {
    const amount = await promptForAmount(io, "credit");

    if (amount === null) {
      return;
    }

    const finalBalance = dataProgram(OPERATION_CODES.READ) + amount;
    dataProgram(OPERATION_CODES.WRITE, finalBalance);
    write(`Amount credited. New balance: ${formatBalance(finalBalance)}\n`);
    return;
  }

  if (passedOperation === OPERATION_CODES.DEBIT) {
    const amount = await promptForAmount(io, "debit");

    if (amount === null) {
      return;
    }

    const finalBalance = dataProgram(OPERATION_CODES.READ);

    if (finalBalance >= amount) {
      const updatedBalance = finalBalance - amount;
      dataProgram(OPERATION_CODES.WRITE, updatedBalance);
      write(`Amount debited. New balance: ${formatBalance(updatedBalance)}\n`);
      return;
    }

    write("Insufficient funds for this debit.\n");
  }
}

async function runApplication(io, write = createConsoleWriter()) {
  let continueFlag = true;

  while (continueFlag) {
    write("--------------------------------\n");
    write("Account Management System\n");
    write("1. View Balance\n");
    write("2. Credit Account\n");
    write("3. Debit Account\n");
    write("4. Exit\n");
    write("--------------------------------\n");

    const userChoice = await io.question("Enter your choice (1-4): \n");

    switch (userChoice.trim()) {
      case MENU_OPTIONS.VIEW_BALANCE:
        await operationsProgram(OPERATION_CODES.TOTAL, io, write);
        break;
      case MENU_OPTIONS.CREDIT_ACCOUNT:
        await operationsProgram(OPERATION_CODES.CREDIT, io, write);
        break;
      case MENU_OPTIONS.DEBIT_ACCOUNT:
        await operationsProgram(OPERATION_CODES.DEBIT, io, write);
        break;
      case MENU_OPTIONS.EXIT:
        continueFlag = false;
        break;
      default:
        write("Invalid choice, please select 1-4.\n");
    }
  }

  write("Exiting the program. Goodbye!\n");
}

async function main() {
  const io = readline.createInterface({ input, output });
  const write = createConsoleWriter(output);

  try {
    await runApplication(io, write);
  } finally {
    io.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Application error:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_BALANCE,
  MENU_OPTIONS,
  OPERATION_CODES,
  createConsoleWriter,
  dataProgram,
  formatBalance,
  getStorageBalance,
  main,
  operationsProgram,
  promptForAmount,
  resetStorageBalance,
  runApplication,
};