import { jest } from "@jest/globals";

import { BN, web3, Program as AnchorProgram } from "@project-serum/anchor";
import { Keypair, TransactionInstruction } from "@solana/web3.js";
import { getAtaForMint, getItemPDA } from "../../utils/pda";
import { ContractCommon } from "../common";
import { ItemProgram } from "../item";

const { generateRemainingAccountsForCreateClass } = ContractCommon;

jest.mock("../../utils/pda");
jest.mock("../../state/item");
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

describe("generateRemainingAccountsForCreateClass", () => {
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
  const program = {
    provider: {
      wallet: {
        publicKey: publicKey0,
      },
    },
  };
  let itemProgram: ItemProgram;
  beforeAll(async () => {
    itemProgram = new ItemProgram();
    itemProgram.client = program as unknown as AnchorProgram;
  });
  beforeEach(() => {
    (getItemPDA as jest.Mock).mockClear().mockReturnValue([publicKey1]);
    (getAtaForMint as jest.Mock)
      .mockClear()
      .mockReturnValue([publicKey2, null]);
  });
  describe("permissivenessToUse is parentTokenHolder", () => {
    let args = {
      permissivenessToUse: null,
      program: itemProgram,
      tokenMint: null,
      parentMint: null,
      parent: null,
      metadataUpdateAuthority: null,
      parentOfParentClassMint: null,
      parentOfParentClassIndex: null,
      parentOfParentClass: null,
      parentUpdateAuthority: null,
    };
    beforeEach(() => {
      (getItemPDA as jest.Mock).mockClear().mockReturnValue([publicKey1]);
      args = {
        permissivenessToUse: {
          parentTokenHolder: true,
        },
        program: itemProgram,
        tokenMint: publicKey3,
        parentMint: publicKey7,
        parent: publicKey6,
        metadataUpdateAuthority: null,
        parentOfParentClassMint: publicKey4,
        parentOfParentClassIndex: null,
        parentOfParentClass: null,
        parentUpdateAuthority: null,
      };
    });
    it("continues if no mint", async () => {
      const accounts = await generateRemainingAccountsForCreateClass({
        ...args,
        parentOfParentClassMint: null,
      });
      expect(accounts).toEqual([]);
    });
    it("uses parentOfParentClass if given", async () => {
      const accounts = await generateRemainingAccountsForCreateClass({
        ...args,
        parentOfParentClass: publicKey5,
      });
      expect(accounts).not.toEqual([]);
      expect(accounts.length).toBe(4);
      expect(accounts[0].pubkey).toBe(publicKey2); // parentToken
      expect(accounts[1].pubkey).toBe(publicKey0); // parentHolder
      expect(accounts[2].pubkey).toBe(publicKey5); // parentClass
      expect(accounts[3].pubkey).toBe(publicKey4); // parentOfParentClassMint
      expect(getItemPDA).not.toHaveBeenCalled();
    });
    it("falls back to index if no parentOfParentClass", async () => {
      const index = new BN(33);
      const accounts = await generateRemainingAccountsForCreateClass({
        ...args,
        parentOfParentClassIndex: index,
      });
      expect(accounts).not.toEqual([]);
      expect(accounts.length).toBe(4);
      expect(accounts[0].pubkey).toBe(publicKey2); // parentToken
      expect(accounts[1].pubkey).toBe(publicKey0); // parentHolder
      expect(accounts[2].pubkey).toBe(publicKey1); // parentClass
      expect(accounts[3].pubkey).toBe(publicKey4); // parentOfParentClassMint
      expect(getItemPDA).toHaveBeenCalledWith(publicKey4, index);
    });
  });
});
