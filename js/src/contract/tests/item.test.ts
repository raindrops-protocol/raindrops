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
} from "../../utils/pda";
import { decodeItemClass, ItemClass } from "../../state/item";
import { DeactivateItemEscrowArgs } from "../../instructions/item";
import { getItemProgram, ItemClassWrapper, ItemProgram } from "../item";
import { generateRemainingAccountsGivenPermissivenessToUse } from "../common";

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
  const publicKey = new web3.PublicKey(
    "Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm"
  );
  const itemEscrow = new web3.PublicKey(
    "CHFwQq7dSTBNfQQXLyJW8FucRFMvQZnWaJ26pCS9qcQG"
  );
  const mint = new web3.PublicKey(
    "3eUutUtjXcKKgHHpvks7CjrYnLvGyEcTAepumyJEy38n"
  );
  const parentMint = new web3.PublicKey(
    "38EvLPAz6uV34DEu3nedDpSh8QL9PPrUYDryTWhmzA3G"
  );
  const newItemMint = new web3.PublicKey(
    "23kG7cppNai1myva6J88VYodQg24zwBPvyN2TMxvEDvB"
  );
  const newItemToken = new web3.PublicKey(
    "FDFe97XpTWqwvqF38dV5TraR3KKH9M67he85w7H2ucWm"
  );
  const newItemTokenHolder = new web3.PublicKey(
    "HqYW5kvNPPSimhHTDJcJxqkTDRzy4tfdH59vgvkg5eRA"
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
  const program = {
    provider: {
      connection: {
        getAccountInfo: async (itemClass) => ({ data }),
      },
      wallet: {
        publicKey,
      },
    },
    methods: {
      createItemEscrow: createItemEscrowMock,
      completeItemEscrowBuildPhase: completeItemEscrowBuildPhaseMock,
      deactivateItemEscrow: deactivateItemEscrowMock,
      updateValidForUseIfWarmupPassed: updateValidForUseIfWarmupPassedMock,
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
      .mockReturnValue([itemEscrow, null]);
    (getAtaForMint as jest.Mock)
      .mockClear()
      .mockReturnValue([newItemMint, null]);
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
      const result = await itemProgram.fetchItemClass(mint, index);
      expect(result).toBeNull();
    });
    it("returns new ItemClassWrapper", async () => {
      data = "notfalsey";
      const result = await itemProgram.fetchItemClass(mint, index);
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
      itemClassMint: mint,
    };
    const accounts = {
      itemClassMint: mint,
      newItemMint: newItemMint,
      newItemToken: newItemToken,
      newItemTokenHolder: mint,
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
        .mockReturnValue([publicKey, null]);
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
          { ...accounts, parentMint: mint },
          additionalArgs
        );
        expect(getItemPDA).toHaveBeenCalledWith(mint, index);
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
          { ...accounts, parentMint },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(null, parentMint);
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
        expect(getItemPDA).not.toHaveBeenCalledWith(parentMint, null);
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
        newItemToken
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        newItemToken
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
      ).not.toBe(newItemToken);
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(newItemToken);
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(2);
      expect((getAtaForMint as jest.Mock).mock.calls[0][0]).toBe(newItemMint);
      expect((getAtaForMint as jest.Mock).mock.calls[1][0]).toBe(newItemMint);
    });
    it("calls createItemEscrow from program methods", async () => {
      await itemProgram.createItemEscrow(args, accounts, additionalArgs);
      expect(createItemEscrowMock).toHaveBeenCalledWith(args);
    });
    it("uses newItemTokenHolder when given", async () => {
      await itemProgram.createItemEscrow(
        args,
        { ...accounts, newItemTokenHolder },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(newItemTokenHolder);
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
      ).not.toBe(newItemTokenHolder);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey);
    });
    it("calls instruction", async () => {
      await itemProgram.createItemEscrow(args, accounts, additionalArgs);
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
      itemClassMint: mint,
      originator: originator,
      buildPermissivenessToUse: null,
      storeMint: false,
      storeMetadataFields: false,
    };
    const accounts = {
      itemClassMint: mint,
      newItemMint: newItemMint,
      newItemToken: newItemToken,
      newItemTokenHolder: mint,
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
        .mockReturnValue([publicKey, null]);
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
          { ...accounts, parentMint: mint },
          additionalArgs
        );
        expect(getItemPDA).toHaveBeenCalledWith(mint, index);
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
          { ...accounts, parentMint },
          additionalArgs
        );
        expect(getItemPDA).not.toHaveBeenCalledWith(null, parentMint);
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
        expect(getItemPDA).not.toHaveBeenCalledWith(parentMint, null);
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
        newItemToken
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        newItemToken
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
      ).not.toBe(newItemToken);
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(newItemToken);
      expect((getAtaForMint as jest.Mock).mock.calls.length).toBe(2);
      expect((getAtaForMint as jest.Mock).mock.calls[0][0]).toBe(newItemMint);
      expect((getAtaForMint as jest.Mock).mock.calls[1][0]).toBe(newItemMint);
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
        { ...accounts, newItemTokenHolder },
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(newItemTokenHolder);
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
      ).not.toBe(newItemTokenHolder);
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
      ).not.toBe(newItemTokenHolder);
      expect(
        (accountsMock as jest.Mock).mock.lastCall[0].newItemTokenHolder
      ).toBe(publicKey);
    });
    it("uses provider wallet as payer", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        accounts,
        additionalArgs
      );
      expect(accountsMock).toHaveBeenCalled();
      expect((accountsMock as jest.Mock).mock.lastCall[0].payer).toBe(
        publicKey
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
        { ...accounts, newItemMint },
        additionalArgs
      );
      expect(getMetadata).toHaveBeenCalledWith(newItemMint);
    });
    it("gets new item edition", async () => {
      await itemProgram.completeItemEscrowBuildPhase(
        args,
        { ...accounts, newItemMint },
        additionalArgs
      );
      expect(getEdition).toHaveBeenCalledWith(newItemMint);
    });
  });
  describe("deactivateItemEscrow", () => {
    const index = new BN(4);
    let args = {} as DeactivateItemEscrowArgs; // this gets updated by function so populate in beforeEach
    const accounts = {};
    const additionalArgs = {};
    const ata = new PublicKey("HqYW5kvNPPSimhHTDJcJxqkTDRzy4tfdH59vgvkg5eRA");
    beforeEach(() => {
      (getItemEscrow as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey, null]);
      (getAtaForMint as jest.Mock).mockClear().mockReturnValue([ata, 42]);
      args = {
        classIndex: index,
        parentClassIndex: null,
        craftEscrowIndex: index,
        componentScope: "",
        amountToMake: index,
        itemClassMint: mint,
        newItemMint: newItemMint,
        newItemToken: newItemToken,
      };
    });
    it("does not throw", async () => {
      expect(
        async () =>
          await itemProgram.deactivateItemEscrow(args, accounts, additionalArgs)
      ).not.toThrow();
    });
    it("uses newItemToken when given", async () => {
      const newArgs = { ...args, newItemToken };
      await itemProgram.deactivateItemEscrow(newArgs, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect((getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken).toBe(
        newItemToken
      );
      expect(getAtaForMint).not.toHaveBeenCalled();
      expect(newArgs.newItemToken).toBe(newItemToken);
    });
    it("falls back to newItemMint Ata if no newItemToken", async () => {
      const newArgs = { ...args, newItemToken: null, newItemMint };
      await itemProgram.deactivateItemEscrow(newArgs, accounts, additionalArgs);
      expect(getItemEscrow).toHaveBeenCalled();
      expect(
        (getItemEscrow as jest.Mock).mock.lastCall[0].newItemToken
      ).not.toBe(newItemToken);
      expect((getAtaForMint as jest.Mock).mock.lastCall[0]).toBe(newItemMint);
      expect(newArgs.newItemToken).toBe(ata);
    });
    it("uses provider wallet as originator", async () => {
      await itemProgram.deactivateItemEscrow(args, accounts, additionalArgs);
      expect(remainingAccountsMock).toHaveBeenCalled();
      expect(
        (remainingAccountsMock as jest.Mock).mock.lastCall[0].originator
      ).toBe(publicKey);
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
      itemClassMint: mint,
      itemMint: newItemMint,
      amount,
      usageProof: null,
      usage: null,
    };
    const accounts = {};
    const additionalArgs = {};
    beforeEach(() => {
      (getItemActivationMarker as jest.Mock)
        .mockClear()
        .mockReturnValue([publicKey, null]);
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
        itemMint: newItemMint,
        index,
        usageIndex: new BN(32),
        amount,
      });
      expect(
        (remainingAccountsMock as jest.Mock).mock.lastCall[0]
          .itemActivationMarker
      ).toEqual(publicKey);
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
