const {
  DEFAULT_BALANCE,
  MENU_OPTIONS,
  OPERATION_CODES,
  dataProgram,
  formatBalance,
  getStorageBalance,
  operationsProgram,
  resetStorageBalance,
  runApplication,
} = require("./index");

function createMockIo(responses = []) {
  let responseIndex = 0;

  return {
    close: jest.fn(),
    question: jest.fn(async (prompt) => {
      const response = responses[responseIndex];
      responseIndex += 1;
      return response ?? "";
    }),
  };
}

function createWriteCollector() {
  const writes = [];

  return {
    writes,
    write: (message) => {
      writes.push(message);
    },
  };
}

describe("COBOL test plan coverage", () => {
  beforeEach(() => {
    resetStorageBalance();
  });

  test("TC-001 displays the main menu when the application starts", async () => {
    const io = createMockIo([MENU_OPTIONS.EXIT]);
    const collector = createWriteCollector();

    await runApplication(io, collector.write);

    expect(collector.writes.join("")).toContain("Account Management System");
    expect(collector.writes.join("")).toContain("1. View Balance");
    expect(collector.writes.join("")).toContain("2. Credit Account");
    expect(collector.writes.join("")).toContain("3. Debit Account");
    expect(collector.writes.join("")).toContain("4. Exit");
    expect(io.question).toHaveBeenCalledWith("Enter your choice (1-4): \n");
  });

  test("TC-002 shows the initial student account balance", async () => {
    const io = createMockIo([]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Current balance: 001000.00\n");
  });

  test("TC-003 credits the account and increases the balance", async () => {
    const io = createMockIo(["200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.CREDIT, io, collector.write);

    expect(collector.writes).toContain("Amount credited. New balance: 001200.00\n");
    expect(getStorageBalance()).toBe(1200);
  });

  test("TC-004 retains the credited balance within the same session", async () => {
    const io = createMockIo(["200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.CREDIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Current balance: 001200.00\n");
  });

  test("TC-005 accumulates multiple successful credits correctly", async () => {
    const io = createMockIo(["100", "50"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.CREDIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.CREDIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Current balance: 001150.00\n");
    expect(getStorageBalance()).toBe(1150);
  });

  test("TC-006 debits the account when funds are sufficient", async () => {
    const io = createMockIo(["200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);

    expect(collector.writes).toContain("Amount debited. New balance: 000800.00\n");
    expect(getStorageBalance()).toBe(800);
  });

  test("TC-007 allows a debit equal to the full available balance", async () => {
    const io = createMockIo(["1000"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Amount debited. New balance: 000000.00\n");
    expect(collector.writes).toContain("Current balance: 000000.00\n");
  });

  test("TC-008 rejects a debit when funds are insufficient", async () => {
    const io = createMockIo(["1200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);

    expect(collector.writes).toContain("Insufficient funds for this debit.\n");
  });

  test("TC-009 leaves the balance unchanged after a rejected debit", async () => {
    const io = createMockIo(["1200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);

    expect(getStorageBalance()).toBe(DEFAULT_BALANCE);
    expect(dataProgram(OPERATION_CODES.READ)).toBe(DEFAULT_BALANCE);
  });

  test("TC-010 retains a successful debit within the same session", async () => {
    const io = createMockIo(["200"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Current balance: 000800.00\n");
  });

  test("TC-011 applies credit followed by debit in sequence", async () => {
    const io = createMockIo(["300", "125"]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.CREDIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.DEBIT, io, collector.write);
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);

    expect(collector.writes).toContain("Current balance: 001175.00\n");
    expect(getStorageBalance()).toBe(1175);
  });

  test("TC-012 handles an invalid menu choice gracefully", async () => {
    const io = createMockIo(["9", MENU_OPTIONS.EXIT]);
    const collector = createWriteCollector();

    await runApplication(io, collector.write);

    expect(collector.writes).toContain("Invalid choice, please select 1-4.\n");
    expect(collector.writes.join("")).toContain("Exiting the program. Goodbye!");
  });

  test("TC-013 exits the application from the menu", async () => {
    const io = createMockIo([MENU_OPTIONS.EXIT]);
    const collector = createWriteCollector();

    await runApplication(io, collector.write);

    expect(collector.writes.at(-1)).toBe("Exiting the program. Goodbye!\n");
  });

  test("TC-014 resets the balance for a new application session", async () => {
    const firstSessionIo = createMockIo(["200"]);
    const firstCollector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.CREDIT, firstSessionIo, firstCollector.write);
    expect(getStorageBalance()).toBe(1200);

    resetStorageBalance();

    const secondSessionIo = createMockIo([]);
    const secondCollector = createWriteCollector();
    await operationsProgram(OPERATION_CODES.TOTAL, secondSessionIo, secondCollector.write);

    expect(secondCollector.writes).toContain("Current balance: 001000.00\n");
  });

  test("TC-015 supports only one shared student account balance", async () => {
    const io = createMockIo([MENU_OPTIONS.EXIT]);
    const collector = createWriteCollector();

    await runApplication(io, collector.write);

    expect(Object.keys(MENU_OPTIONS)).toHaveLength(4);
    expect(io.question.mock.calls.flat()).not.toContainEqual(expect.stringMatching(/student|account id/i));
  });

  test("TC-016 keeps balance inquiry read-only", async () => {
    const io = createMockIo([]);
    const collector = createWriteCollector();

    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);
    const balanceAfterFirstRead = getStorageBalance();
    await operationsProgram(OPERATION_CODES.TOTAL, io, collector.write);
    const balanceAfterSecondRead = getStorageBalance();

    expect(balanceAfterFirstRead).toBe(DEFAULT_BALANCE);
    expect(balanceAfterSecondRead).toBe(DEFAULT_BALANCE);
    expect(collector.writes.filter((message) => message === "Current balance: 001000.00\n")).toHaveLength(2);
  });
});

describe("balance formatting", () => {
  test("formats values using COBOL-style zero padding", () => {
    expect(formatBalance(0)).toBe("000000.00");
    expect(formatBalance(1175)).toBe("001175.00");
  });
});