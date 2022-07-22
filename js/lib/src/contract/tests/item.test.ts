import { jest } from "@jest/globals";

import { BN, web3, Program as AnchorProgram } from "@project-serum/anchor";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Token } from "@solana/spl-token";
import { InstructionUtils, Program } from "@raindrop-studios/sol-kit";
import { ITEM_ID } from "../../constants/programIds";
import {
  getAtaForMint,
  getEdition,
  getItemActivationMarker,
  getItemEscrow,
  getItemPDA,
  getMetadata,
  getCraftItemEscrow,
  getCraftItemCounter,
} from "../../utils/pda";
import { decodeItemClass, ItemClass } from "../../state/item";
import {
  AddCraftItemToEscrowArgs,
  DeactivateItemEscrowArgs,
} from "../../instructions/item";
import { getItemProgram, ItemClassWrapper, ItemProgram } from "../item";
import { ContractCommon } from "../common";

const { generateRemainingAccountsGivenPermissivenessToUse } = ContractCommon;

jest.mock("../../utils/pda");
jest.mock("../../state/item");
jest.mock("../common");
jest.mock("@raindrop-studios/sol-kit", () => {
  const SolKitMock = jest.requireActual("@raindrop-studios/sol-kit");
  // @ts-ignore
  class NoSendProgram extends SolKitMock.Program.Program {
    sendWithRetry(
      instructions: Array<TransactionInstruction>,
      signers: Array<Keypair> = [],
      options: { commitment: web3.Commitment; timeout?: number } = {
        commitment: "confirmed",
      }
    ) {
      return;
    }
  }
  // @ts-ignore
  SolKitMock.Program.Program = NoSendProgram;
  return SolKitMock;
});

describe("ItemProgram", () => {
  let data = undefined;
  const publicKey0 = new web3.PublicKey(
    "Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm"
  );
  const publicKey1 = new web3.PublicKey(
    "CHFwQq7dSTBNfQQXLyJW8FucRFMvQZnWaJ26pCS9qcQG"
  );
  const publicKey2 = new web3.PublicKey(
    "3eUutUtjXcKKgHHpvks7CjrYnLvGyEcTAepumyJEy38n"
  );
  const publicKey3 = new web3.PublicKey(
    "38EvLPAz6uV34DEu3nedDpSh8QL9PPrUYDryTWhmzA3G"
  );
  const publicKey4 = new web3.PublicKey(
    "23kG7cppNai1myva6J88VYodQg24zwBPvyN2TMxvEDvB"
  );
  const publicKey5 = new web3.PublicKey(
    "FDFe97XpTWqwvqF38dV5TraR3KKH9M67he85w7H2ucWm"
  );
  const publicKey6 = new web3.PublicKey(
    "HqYW5kvNPPSimhHTDJcJxqkTDRzy4tfdH59vgvkg5eRA"
  );
  const publicKey7 = new web3.PublicKey(
    "D6equnrBHGUmwoazjcPQxp1ZpZ1kDtAQbxYGCEHS1Ts1"
  );
  const publicKey8 = new web3.PublicKey(
    "9GTH2UEq7AVuW5YHMJzy9TG932aiJGAzNVSjEmf6YQjU"
  );
  const publicKey9 = new web3.PublicKey(
    "EwxLS8ENQQT2rqamdDdbDRwwP7EJ3wZesLqTg6jqesS"
  );
  const instructionMock = jest.fn();
  const remainingAccountsMock = jest
    .fn()
    .mockReturnValue({ instruction: instructionMock });
  const accountsMock = jest
    .fn()
    .mockReturnValue({ remainingAccounts: remainingAccountsMock });
  const createItemEscrowMock = jest
    .fn()
    .mockReturnValue({ accounts: accountsMock });
  const completeItemEscrowBuildPhaseMock = jest
    .fn()
    .mockReturnValue({ accounts: accountsMock });
  const deactivateItemEscrowMock = jest
    .fn()
    .mockReturnValue({ accounts: remainingAccountsMock });
  const updateValidForUseIfWarmupPassedMock = jest
    .fn()
    .mockReturnValue({ accounts: remainingAccountsMock });
  const addCraftItemToEscrowMock = jest
    .fn()
    .mockReturnValue({ accounts: accountsMock });
  const program = {
    provider: {
      connection: {
        getAccountInfo: async (itemClass) => ({ data }),
      },
      wallet: {
        publicKey: publicKey0,
      },
    },
    account: {
      item: {
        fetch: jest.fn().mockReturnValue({ parent: null }),
      },
    },
    methods: {
      createItemEscrow: createItemEscrowMock,
      completeItemEscrowBuildPhase: completeItemEscrowBuildPhaseMock,
      deactivateItemEscrow: deactivateItemEscrowMock,
      updateValidForUseIfWarmupPassed: updateValidForUseIfWarmupPassedMock,
      addCraftItemToEscrow: addCraftItemToEscrowMock,
    },
  };
  const itemClassData = {
    data: Buffer.from("something"),
  };
  const itemClass = {} as ItemClass;
  let itemProgram: ItemProgram;
  const index = new BN(4);
  beforeAll(async () => {
    itemProgram = new ItemProgram();
    itemProgram.client = program as unknown as AnchorProgram;
  });
  beforeEach(() => {
    data = undefined;
    (getItemPDA as jest.Mock).mockClear().mockReturnValue([itemClassData]);
    (decodeItemClass as jest.Mock).mockClear().mockReturnValue(itemClass);
    (getItemEscrow as jest.Mock)
      .mockClear()
      .mockReturnValue([publicKey1, null]);
    (getAtaForMint as jest.Mock)
      .mockClear()
      .mockReturnValue([publicKey4, null]);
  });
  it("sets id", () => {
    const constructedItemProgram = new ItemProgram();
    expect(constructedItemProgram.id).toBe(ITEM_ID);
  });
  describe("fetchItemClass", () => {
    beforeEach(() => {
      (getItemPDA as jest.Mock).mockClear().mockReturnValue([itemClassData]);
      (decodeItemClass as jest.Mock).mockClear().mockReturnValue(itemClass);
    });
    it("exits if data is not populated", async () => {
      data = null;
      const result = await itemProgram.fetchItemClass(publicKey2, index);
      expect(result).toBeNull();
    });
    it("returns new ItemClassWrapper", async () => {
      data = "notfalsey";
      const result = await itemProgram.fetchItemClass(publicKey2, index);
      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(ItemClassWrapper);
      expect(result.data).toBe(data);
      expect(result.key).toBe(itemClassData);
      expect(result.program).toBe(itemProgram);
      expect(result.object).toBe(itemClass);
    });
  });
  describe("createItemEscrow", () => {
    const index = new BN(4);
    const parentClassIndex = new BN(6524);
    const args = {
      classIndex: index,
      parentClassIndex: null,
      craftEscrowIndex: index,
      componentScope: "",
      amountToMake: index,
      namespaceIndex: index,
      buildPermissivenessToUse: null,
      itemClassMint: publicKey2,
    };
    const accounts = {
      itemClassMint: publicKey2,
      newItemMint: publicKey4,
      newItemToken: publicKey5,
      newItemTokenHolder: publicKey2,
      parentMint: null,
      metadataUpdateAuthority: null,
    };
    const additionalArgs = {};
    beforeEach(() => {
      (
        generateRemainingAccountsGivenPermissivenessToUse as jest.Mock
      ).mockClear();
      (getItemPDA as jest.Mock).mockClear().mockReturnValue([itemClassData]);
      (getItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getAtaForMint as jest.Mock).mockClear();
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.createItemEscrow(args, accounts, additionalArgs)
      ).not.toThrow();
    });
    describe("gets remaining accounts", () => {
      it("with parent", async () => {
        await itemProgram.createItemEscrow(
          { ...args, parentClassIndex: index },
          { ...accounts, parentMint: publicKey2 },
          additionalArgs
        );
        expect(getItemPDA).toHaveBeenCalledWith(publicKey2, index);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(itemClassData);
      });
      it("without parent", async () => {
        await itemProgram.createItemEscrow(
          { ...args, parentClassIndex: null },
          { ...accounts, parentMint: publicKey3 },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(null, publicKey3);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(null);
        (getItemPDA as jest.Mock).mockClear();
        await itemProgram.createItemEscrow(
          { ...args, parentClassIndex },
          { ...accounts, parentMint: null },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(publicKey3, null);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(null);
      });
    });
    it("uses newItemToken account when given", async () => {
      await itemProgram.createItemEscrow(args, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(getAtaForMint).not.toHaveBeenCalled();
    });
    it("falls back to newItemMint Ata if no newItemToken", async () => {
      await itemProgram.createItemEscrow(
        args,
        { ...accounts, newItemToken: null },
        additionalArgs
      );
      expect(getItemEscrow).toHaveBeenCalled();
      expect(
        (getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(publicKey5);
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(publicKey5);
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(2);
      expect((getAtaForMint as jest.Mock).mock.calls[0][0]).toBe(publicKey4);
      expect((getAtaForMint as jest.Mock).mock.calls[1][0]).toBe(publicKey4);
    });
    it("calls createItemEscrow from program methods", async () => {
      await itemProgram.createItemEscrow(args, accounts, additionalArgs);
      expect(createItemEscrowMock).toHaveBeenCalledWith(args);
    });
    it("uses newItemTokenHolder when given", async () => {
      await itemProgram.createItemEscrow(
        args,
        { ...accounts, newItemTokenHolder: publicKey6 },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey6);
    });
    it("falls back to provider wallet if no newItemTokenHolder", async () => {
      await itemProgram.createItemEscrow(
        args,
        { ...accounts, newItemTokenHolder: null },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).not.toBe(publicKey6);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey0);
    });
    it("calls instruction", async () => {
      await itemProgram.createItemEscrow(args, accounts, additionalArgs);
      expect(instructionMock).toHaveBeenCalled();
    });
  });
  describe("addCraftItemToEscrow", () => {
    const index = new BN(4);
    const parentClassIndex = new BN(6524);
    const craftItemIndex = new BN(8);
    const craftEscrowIndex = new BN(398);
    const craftItemClassIndex = new BN(7653);
    const craftItemClassMint = publicKey0;
    const amountToMake = new BN(100);
    const amountToContributeFromThisContributor = new BN(1);
    const newItemMint = publicKey1;
    const originator = publicKey2;
    const namespaceIndex = null;
    const buildPermissivenessToUse = null;
    const itemClassMint = publicKey3;
    const componentProof = publicKey4;
    const component = publicKey5;
    const craftUsageInfo = {
      craftUsageStateProof: publicKey6,
      craftUsageState: {
        index: 1,
        uses: new BN(65),
        activatedAt: new BN(891),
      },
      craftUsageProof: publicKey7,
      craftUsage: "??", // TODO
    };
    const args: AddCraftItemToEscrowArgs = {
      classIndex: index,
      parentClassIndex,
      craftItemIndex,
      craftEscrowIndex,
      craftItemClassIndex,
      craftItemClassMint,
      componentScope: "scope",
      amountToMake,
      amountToContributeFromThisContributor,
      newItemMint,
      originator,
      namespaceIndex,
      buildPermissivenessToUse,
      itemClassMint,
      componentProof,
      component,
      craftUsageInfo,
    };
    const accounts = {
      itemClassMint: publicKey2,
      newItemToken: publicKey5,
      newItemTokenHolder: publicKey2,
      craftItemTokenMint: publicKey8,
      parentMint: null,
      metadataUpdateAuthority: null,
    };
    const additionalArgs = {};
    const keypair = web3.Keypair.generate();
    const ata = publicKey9;
    beforeEach(() => {
      jest.spyOn(web3.Keypair, "generate").mockReturnValue(keypair);
      jest.spyOn(Token, "createApproveInstruction");
      jest.spyOn(itemProgram, "sendWithRetry");
      (
        generateRemainingAccountsGivenPermissivenessToUse as jest.Mock
      ).mockClear();
      (getItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getCraftItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getCraftItemCounter as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getAtaForMint as jest.Mock).mockClear().mockReturnValue([ata, 42]);
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.addCraftItemToEscrow(args, accounts, additionalArgs)
      ).not.toThrow();
    });
    it("generates craftItemTransferAuthority", async () => {
      await itemProgram.addCraftItemToEscrow(args, accounts, additionalArgs);
      expect(web3.Keypair.generate).toHaveBeenCalled();
      expect(Token.createApproveInstruction).toHaveBeenCalled();
      expect(
        (Token.createApproveInstruction as jest.Mock).mock.lastCall[2]
      ).toEqual(keypair.publicKey);
      expect(itemProgram.sendWithRetry).toHaveBeenCalled();
      expect(
        (itemProgram.sendWithRetry as jest.Mock).mock.lastCall[1]
      ).toContain(keypair);
    });
    it("uses newItemToken account when given", async () => {
      await itemProgram.addCraftItemToEscrow(args, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
    });
    it("gets ata if no newItemToken", async () => {
      await itemProgram.addCraftItemToEscrow(
        args,
        { ...accounts, newItemToken: null },
        additionalArgs
      );
      expect(getItemEscrow).toHaveBeenCalled();
      // for getItemEscrow
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(3); // first is craftItemTokenAccount
      expect((getAtaForMint as jest.Mock).mock.calls[1][1]).toBe(originator);
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        ata
      );
      // for accounts
      expect((getAtaForMint as jest.Mock).mock.calls[2][1]).toBe(originator);
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        ata
      );
    });
    it("gets ata with wallet if no newItemToken or originator", async () => {
      await itemProgram.addCraftItemToEscrow(
        { ...args, originator: null },
        { ...accounts, newItemToken: null },
        additionalArgs
      );
      expect(getItemEscrow).toHaveBeenCalled();
      // for getItemEscrow
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(3); // first is craftItemTokenAccount
      expect((getAtaForMint as jest.Mock).mock.calls[1][1]).toBe(publicKey0); // wallet
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        ata
      );
      // for accounts
      expect((getAtaForMint as jest.Mock).mock.calls[2][1]).toBe(publicKey0);
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        ata
      );
    });
    it("calls addCraftItemToEscrow from program methods", async () => {
      await itemProgram.addCraftItemToEscrow(args, accounts, additionalArgs);
      expect(addCraftItemToEscrowMock).toHaveBeenCalledWith(args);
    });
    it("uses newItemTokenHolder when given", async () => {
      await itemProgram.addCraftItemToEscrow(
        args,
        { ...accounts, newItemTokenHolder: publicKey6 },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey6);
    });
    it("falls back to originator if no newItemTokenHolder", async () => {
      await itemProgram.addCraftItemToEscrow(
        args,
        { ...accounts, newItemTokenHolder: null },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).not.toBe(publicKey6);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(originator);
    });
    it("falls back to provider wallet if no newItemTokenHolder or originator", async () => {
      await itemProgram.addCraftItemToEscrow(
        { ...args, originator: null },
        { ...accounts, newItemTokenHolder: null },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).not.toBe(publicKey6);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey0);
    });
    it("calls instruction", async () => {
      await itemProgram.addCraftItemToEscrow(args, accounts, additionalArgs);
      expect(instructionMock).toHaveBeenCalled();
    });
  });
  describe("completeItemEscrowBuildPhase", () => {
    const index = new BN(4);
    const newItemIndex = new BN(92);
    const parentClassIndex = new BN(6524);
    const originator = new PublicKey(
      "CLisFRUq6N5Ndz1nTFE2cM5xF5XFpWvwPX8Mw9hiHtGx"
    );
    const args = {
      classIndex: index,
      newItemIndex: newItemIndex,
      parentClassIndex: null,
      craftEscrowIndex: index,
      componentScope: "",
      amountToMake: index,
      space: index,
      itemClassMint: publicKey2,
      originator: originator,
      buildPermissivenessToUse: null,
      storeMint: false,
      storeMetadataFields: false,
    };
    const accounts = {
      itemClassMint: publicKey2,
      newItemMint: publicKey4,
      newItemToken: publicKey5,
      newItemTokenHolder: publicKey2,
      parentMint: null,
      metadataUpdateAuthority: null,
    };
    const additionalArgs = {};
    beforeEach(() => {
      (
        generateRemainingAccountsGivenPermissivenessToUse as jest.Mock
      ).mockClear();
      (getItemPDA as jest.Mock).mockClear().mockReturnValue([itemClassData]);
      (getItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getAtaForMint as jest.Mock).mockClear();
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.completeItemEscrowBuildPhase(
            args,
            accounts,
            additionalArgs
          )
      ).not.toThrow();
    });
    describe("gets remaining accounts", () => {
      it("with parent", async () => {
        await itemProgram.completeItemEscrowBuildPhase(
          { ...args, parentClassIndex: index },
          { ...accounts, parentMint: publicKey2 },
          additionalArgs
        );
        expect(getItemPDA).toHaveBeenCalledWith(publicKey2, index);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(itemClassData);
      });
      it("without parent", async () => {
        await itemProgram.completeItemEscrowBuildPhase(
          { ...args, parentClassIndex: null },
          { ...accounts, parentMint: publicKey3 },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(null, publicKey3);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(null);
        (getItemPDA as jest.Mock).mockClear();
        await itemProgram.completeItemEscrowBuildPhase(
          { ...args, parentClassIndex },
          { ...accounts, parentMint: null },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(publicKey3, null);
        expect(
          generateRemainingAccountsGivenPermissivenessToUse
        ).toHaveBeenCalled();
        expect(
          (generateRemainingAccountsGivenPermissivenessToUse as jest.Mock).mock
            .lastCall[0].parent
        ).toBe(null);
      });
    });
    it("uses newItemToken account when given", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );
      expect(getItemEscrow).toHaveBeenCalled();
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(getAtaForMint).not.toHaveBeenCalled();
    });
    it("falls back to newItemMint Ata if no newItemToken", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        { ...accounts, newItemToken: null },
        additionalArgs
      );
      expect(getItemEscrow).toHaveBeenCalled();
      expect(
        (getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(publicKey5);
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(publicKey5);
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(2);
      expect((getAtaForMint as jest.Mock).mock.calls[0][0]).toBe(publicKey4);
      expect((getAtaForMint as jest.Mock).mock.calls[1][0]).toBe(publicKey4);
    });
    it("calls completeItemEscrowBuildPhase from program methods", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );
      expect(completeItemEscrowBuildPhaseMock).toHaveBeenCalledWith(args);
    });
    it("uses newItemTokenHolder when given", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        { ...accounts, newItemTokenHolder: publicKey6 },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey6);
    });
    it("falls back to originator if no newItemTokenHolder", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        { ...args, originator },
        { ...accounts, newItemTokenHolder: null },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).not.toBe(publicKey6);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(originator);
    });
    it("falls back to provider wallet if no newItemTokenHolder or originator", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        { ...args, originator: null },
        { ...accounts, newItemTokenHolder: null },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).not.toBe(publicKey6);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey0);
    });
    it("uses provider wallet as payer", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].payer).toBe(
        publicKey0
      );
    });
    it("calls instruction", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );
      expect(instructionMock).toHaveBeenCalled();
    });
    it("gets new item metadata", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        { ...accounts, newItemMint: publicKey4 },
        additionalArgs
      );
      expect(getMetadata).toHaveBeenCalledWith(publicKey4);
    });
    it("gets new item edition", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        { ...accounts, newItemMint: publicKey4 },
        additionalArgs
      );
      expect(getEdition).toHaveBeenCalledWith(publicKey4);
    });
  });
  describe("deactivateItemEscrow", () => {
    const index = new BN(4);
    let args = {} as DeactivateItemEscrowArgs; // this gets updated by function so populate in beforeEach
    const accounts = {};
    const additionalArgs = {};
    const ata = publicKey9;
    beforeEach(() => {
      (getItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
      (getAtaForMint as jest.Mock).mockClear().mockReturnValue([ata, 42]);
      args = {
        classIndex: index,
        parentClassIndex: null,
        craftEscrowIndex: index,
        componentScope: "",
        amountToMake: index,
        itemClassMint: publicKey2,
        newItemMint: publicKey4,
        newItemToken: publicKey5,
      };
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.deactivateItemEscrow(args, accounts, additionalArgs)
      ).not.toThrow();
    });
    it("uses newItemToken when given", async () => {
      const newArgs = { ...args, newItemToken: publicKey5 };
      await itemProgram.deactivateItemEscrow(newArgs, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        publicKey5
      );
      expect(getAtaForMint).not.toHaveBeenCalled();
      expect(newArgs.newItemToken).toBe(publicKey5);
    });
    it("falls back to newItemMint Ata if no newItemToken", async () => {
      const newArgs = { ...args, newItemToken: null, newItemMint: publicKey4 };
      await itemProgram.deactivateItemEscrow(newArgs, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect(
        (getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(publicKey5);
      expect((getAtaForMint as jest.Mock).mock.lastCall[0]).toBe(publicKey4);
      expect(newArgs.newItemToken).toBe(ata);
    });
    it("uses provider wallet as originator", async () => {
      await itemProgram.deactivateItemEscrow(args, accounts, additionalArgs);
      expect(remainingAccountsMock).toHaveBeenCalled();
      expect(
        (remainingAccountsMock as jest.Mock).mock.lastCall[0].originator
      ).toBe(publicKey0);
    });
    it("calls instruction", async () => {
      await itemProgram.deactivateItemEscrow(args, accounts, additionalArgs);
      expect(instructionMock).toHaveBeenCalled();
    });
  });
  describe("updateValidForUseIfWarmupPassed", () => {
    const classIndex = new BN(0);
    const index = new BN(4);
    const amount = new BN(8);
    let args = {
      classIndex,
      index,
      usageIndex: 32,
      itemClassMint: publicKey2,
      itemMint: publicKey4,
      amount,
      usageProof: null,
      usage: null,
    };
    const accounts = {};
    const additionalArgs = {};
    beforeEach(() => {
      (getItemActivationMarker as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey0, null]);
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.updateValidForUseIfWarmupPassed(
            args,
            accounts,
            additionalArgs
          )
      ).not.toThrow();
    });
    it("gets itemActivationMarker for accounts call", async () => {
      await itemProgram.updateValidForUseIfWarmupPassed(
        args,
        accounts,
        additionalArgs
      );
      expect((getItemActivationMarker as jest.Mock).mock.lastCall[0]).toEqual({
        itemMint: publicKey4,
        index,
        usageIndex: new BN(32),
        amount,
      });
      expect(
        (remainingAccountsMock as jest.Mock).mock.lastCall[0]
          .itemActivationMarker
      ).toEqual(publicKey0);
    });
    it("passes all args to updateValidForUseIfWarmupPassed", async () => {
      await itemProgram.updateValidForUseIfWarmupPassed(
        args,
        accounts,
        additionalArgs
      );
      expect(updateValidForUseIfWarmupPassedMock).toHaveBeenCalledWith(args);
    });
    it("calls instruction", async () => {
      await itemProgram.updateValidForUseIfWarmupPassed(
        args,
        accounts,
        additionalArgs
      );
      expect(instructionMock).toHaveBeenCalled();
    });
  });
});
