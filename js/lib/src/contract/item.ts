import {
  ObjectWrapper,
  Program,
  Transaction,
  SendOptions,
} from "@raindrop-studios/sol-kit";
import { web3, BN, AnchorProvider, Wallet } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import { ITEM_ID } from "../constants/programIds";
import * as ItemInstruction from "../instructions/item";
import {
  Build,
  BuildMaterialData,
  BuildMaterialMint,
  decodeItemClass,
  ItemClass,
  ItemClassV1,
  ItemV1,
  Material,
  Schema,
} from "../state/item";
import { getAtaForMint, getItemPDA } from "../utils/pda";
import { PREFIX } from "../constants/item";

export class ItemProgram extends Program.Program {
  declare instruction: ItemInstruction.Instruction;
  static PREFIX = PREFIX;
  PROGRAM_ID = ITEM_ID;

  constructor() {
    super();
    this.instruction = new ItemInstruction.Instruction({ program: this });
  }

  async fetchItemClass(
    mint: web3.PublicKey,
    index: BN
  ): Promise<ItemClassWrapper | null> {
    const itemClass = (await getItemPDA(mint, index))[0];

    // Need a manual deserializer due to our hack we had to do.
    const itemClassObj = await (
      this.client.provider as AnchorProvider
    ).connection.getAccountInfo(itemClass);

    if (!itemClassObj?.data) {
      return Promise.resolve(null);
    }
    const ic = decodeItemClass(itemClassObj.data);

    return new ItemClassWrapper({
      program: this,
      key: itemClass,
      data: itemClassObj.data,
      object: ic,
    });
  }

  async createItemClass(
    args: ItemInstruction.CreateItemClassArgs,
    accounts: ItemInstruction.CreateItemClassAccounts,
    additionalArgs: ItemInstruction.CreateItemClassAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.createItemClass(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateItemClass(
    args: ItemInstruction.UpdateItemClassArgs,
    accounts: ItemInstruction.UpdateItemClassAccounts,
    additionalArgs: ItemInstruction.UpdateItemClassAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateItemClass(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async createItemEscrow(
    args: ItemInstruction.CreateItemEscrowArgs,
    accounts: ItemInstruction.CreateItemEscrowAccounts,
    additionalArgs: ItemInstruction.CreateItemEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.createItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async completeItemEscrowBuildPhase(
    args: ItemInstruction.CompleteItemEscrowBuildPhaseArgs,
    accounts: ItemInstruction.CompleteItemEscrowBuildPhaseAccounts,
    additionalArgs: ItemInstruction.CompleteItemEscrowBuildPhaseAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.completeItemEscrowBuildPhase(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async deactivateItemEscrow(
    args: ItemInstruction.DeactivateItemEscrowArgs,
    accounts: ItemInstruction.DeactivateItemEscrowAccounts,
    additionalArgs: ItemInstruction.DeactivateItemEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.deactivateItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateValidForUseIfWarmupPassed(
    args: ItemInstruction.UpdateValidForUseIfWarmupPassedArgs,
    accounts: ItemInstruction.UpdateValidForUseIfWarmupPassedAccounts,
    additionalArgs: ItemInstruction.UpdateValidForUseIfWarmupPassedAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateValidForUseIfWarmupPassed(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async addCraftItemToEscrow(
    args: ItemInstruction.AddCraftItemToEscrowArgs,
    accounts: Omit<
      ItemInstruction.AddCraftItemToEscrowAccounts,
      "craftItemTransferAuthority"
    >,
    additionalArgs: ItemInstruction.AddCraftItemToEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const signers = [];
    const craftItemTransferAuthority = web3.Keypair.generate();
    signers.push(craftItemTransferAuthority);

    const instructions = await this.instruction.addCraftItemToEscrow(
      args,
      {
        ...accounts,
        craftItemTransferAuthority: craftItemTransferAuthority.publicKey,
      },
      { additionalArgs }
    );

    return this.sendWithRetry(instructions, signers, options);
  }

  async removeCraftItemFromEscrow(
    args: ItemInstruction.RemoveCraftItemFromEscrowArgs,
    accounts: ItemInstruction.RemoveCraftItemFromEscrowAccounts,
    additionalArgs: ItemInstruction.RemoveCraftItemFromEscrowAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.removeCraftItemFromEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async beginItemActivation(
    args: Omit<ItemInstruction.BeginItemActivationArgs, "itemClass">,
    accounts: ItemInstruction.BeginItemActivationAccounts,
    additionalArgs: ItemInstruction.BeginItemActivationAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const itemClass = await this.fetchItemClass(
      args.itemClassMint,
      args.classIndex
    );
    if (!itemClass) {
      throw new ItemClassNotFoundError(
        "Please double check the specified itemClassMint and classIndex"
      );
    }

    const instruction = await this.instruction.beginItemActivation(
      { ...args, itemClass },
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async endItemActivation(
    args: ItemInstruction.EndItemActivationArgs,
    accounts: ItemInstruction.EndItemActivationAccounts,
    additionalArgs: ItemInstruction.EndItemActivationAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const signers = [];

    let itemTransferAuthority = accounts.itemTransferAuthority;
    if (
      !itemTransferAuthority &&
      accounts.itemAccount &&
      accounts.itemAccount.equals(
        (
          await getAtaForMint(
            accounts.itemMint,
            (this.client.provider as AnchorProvider).wallet.publicKey
          )
        )[0]
      )
    ) {
      itemTransferAuthority = web3.Keypair.generate();
      signers.push(itemTransferAuthority);
    }

    const instruction = await this.instruction.endItemActivation(
      args,
      { ...accounts, itemTransferAuthority },
      additionalArgs
    );
    return this.sendWithRetry(instruction, signers, options);
  }

  async drainItemEscrow(
    args: ItemInstruction.DrainItemEscrowArgs,
    accounts: ItemInstruction.DrainItemEscrowAccounts,
    additionalArgs: ItemInstruction.DrainItemEscrowAdditionalArgs = {},
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.drainItemEscrow(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async startItemEscrowBuildPhase(
    args: ItemInstruction.StartItemEscrowBuildPhaseArgs,
    accounts: ItemInstruction.StartItemEscrowBuildPhaseAccounts,
    additionalArgs: ItemInstruction.StartItemEscrowBuildPhaseAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.startItemEscrowBuildPhase(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async updateItem(
    args: ItemInstruction.UpdateItemArgs,
    accounts: ItemInstruction.UpdateItemAccounts,
    additionalArgs: ItemInstruction.UpdateItemAdditionalArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const instruction = await this.instruction.updateItem(
      args,
      accounts,
      additionalArgs
    );
    return this.sendWithRetry(instruction, [], options);
  }

  async createItemClassV1(
    args: ItemInstruction.CreateItemClassV1Args,
    options?: SendOptions
  ): Promise<[web3.PublicKey, Transaction.SendTransactionResult]> {
    const [itemClass, itemsKp, instructions] =
      await this.instruction.createItemClassV1(args);
    const result = await this.sendWithRetry(instructions, [itemsKp], options);
    return [itemClass, result];
  }

  // TODO: chunk the returned instructions
  async addItemsToItemClass(
    accounts: ItemInstruction.AddItemsToItemClass,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.addItemsToItemClass(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async addSchema(
    accounts: ItemInstruction.AddSchemaAccounts,
    args: ItemInstruction.AddSchemaArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.addSchema(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async startBuild(
    accounts: ItemInstruction.StartBuildAccounts,
    args: ItemInstruction.StartBuildArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.startBuild(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async addBuildMaterial(
    accounts: ItemInstruction.AddBuildMaterialAccounts,
    args: ItemInstruction.AddBuildMaterialArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.addBuildMaterial(accounts, args);
    return await this.sendWithRetry(ixns, [], options);
  }

  async verifyBuildMaterial(
    accounts: ItemInstruction.VerifyBuildMaterialAccounts,
    args: ItemInstruction.VerifyBuildMaterialArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.verifyBuildMaterial(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async completeBuild(
    accounts: ItemInstruction.CompleteBuildAccounts,
    args: ItemInstruction.CompleteBuildArgs,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.completeBuild(accounts, args);
    return await this.sendWithRetry([ix], [], options);
  }

  async receiveItem(
    accounts: ItemInstruction.ReceiveItemAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.receiveItem(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async applyBuildEffect(
    accounts: ItemInstruction.ApplyBuildEffectAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.applyBuildEffect(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async returnBuildMaterial(
    accounts: ItemInstruction.ReturnBuildMaterialAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ixns = await this.instruction.returnBuildMaterial(accounts);
    return await this.sendWithRetry(ixns, [], options);
  }

  async consumeBuildMaterial(
    accounts: ItemInstruction.ConsumeBuildMaterialAccounts,
    options?: SendOptions
  ): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.consumeBuildMaterial(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async closeBuild(accounts: ItemInstruction.CloseBuildAccounts, options?: SendOptions): Promise<Transaction.SendTransactionResult> {
    const ix = await this.instruction.closeBuild(accounts);
    return await this.sendWithRetry([ix], [], options);
  }

  async getItemClassV1(itemClass: web3.PublicKey): Promise<ItemClassV1 | null> {
    const itemClassData = await this.client.account.itemClassV1.fetch(
      itemClass
    );
    if (!itemClassData) {
      return null;
    }

    const schemaIndex = new BN(itemClassData.schemaIndex as string);

    const schemas: Schema[] = [];
    for (let i = 0; i <= schemaIndex.toNumber(); i++) {
      const [schemaAddr, _schemaAddrBump] =
        web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from("schema"),
            schemaIndex.toArrayLike(Buffer, "le", 8),
            itemClass.toBuffer(),
          ],
          this.PROGRAM_ID
        );

      const schemaData = await this.client.account.schema.fetch(schemaAddr);

      const materials: Material[] = [];
      for (let schemaMaterial of schemaData.materials as any[]) {
        const material: Material = {
          itemClass: new web3.PublicKey(schemaMaterial.itemClass),
          requiredAmount: new BN(schemaMaterial.requiredAmount as string),
        };

        materials.push(material);
      }

      const schema: Schema = {
        itemClass: itemClass,
        schemaIndex: i,
        buildEnabled: schemaData.buildEnabled as boolean,
        materials: materials,
      };

      schemas.push(schema);
    }

    const itemClassV1: ItemClassV1 = {
      authority: new web3.PublicKey(itemClassData.authority),
      items: new web3.PublicKey(itemClassData.items),
      schemaIndex: schemaIndex,
      schemas: schemas,
    };

    return itemClassV1;
  }

  async getBuild(build: web3.PublicKey): Promise<Build | null> {
    const buildDataRaw = await this.client.account.build.fetch(build);
    if (!buildDataRaw) {
      return null;
    }

    const buildMaterialData: BuildMaterialData[] = [];

    for (let rawMaterial of buildDataRaw.materials as any[]) {
      const mints: BuildMaterialMint[] = [];
      for (let rawMaterialMint of rawMaterial.mints as any[]) {
        mints.push({
          mint: new web3.PublicKey(rawMaterialMint.mint),
          buildEffectApplied: rawMaterialMint.buildEffectApplied,
        });
      }

      buildMaterialData.push({
        itemClass: new web3.PublicKey(rawMaterial.itemClass),
        currentAmount: new BN(rawMaterial.currentAmount),
        requiredAmount: new BN(rawMaterial.requiredAmount),
        buildEffect: rawMaterial.buildEffect,
        mints: mints,
      });
    }

    const buildData: Build = {
      schemaIndex: buildDataRaw.schemaIndex as number,
      builder: new web3.PublicKey(buildDataRaw.builder),
      itemClass: new web3.PublicKey(buildDataRaw.itemClass),
      itemMint: new web3.PublicKey(buildDataRaw.itemMint) || null,
      materials: buildMaterialData,
      status: buildDataRaw.status,
    };

    return buildData;
  }

  async getItemV1(item: web3.PublicKey): Promise<ItemV1 | null> {
    const itemDataRaw = await this.client.account.itemV1.fetch(item);
    if (!itemDataRaw) {
      return null;
    }

    let cooldown: BN | null = null;
    if ((itemDataRaw.itemState as any).nonFungible.cooldown !== null) {
      cooldown = new BN((itemDataRaw.itemState as any).nonFungible.cooldown);
    }

    const itemData: ItemV1 = {
      initialized: itemDataRaw.initialized as boolean,
      itemClass: new web3.PublicKey(itemDataRaw.itemClass),
      itemMint: new web3.PublicKey(itemDataRaw.itemMint),
      itemState: {
        cooldown: cooldown,
        durability: new BN((itemDataRaw.itemState as any).nonFungible.durability),
      },
    };

    return itemData;
  }
}
export class ItemClassWrapper implements ObjectWrapper<ItemClass, ItemProgram> {
  program: ItemProgram;
  key: web3.PublicKey;
  object: ItemClass;
  data: Buffer;

  constructor(args: {
    program: ItemProgram;
    key: web3.PublicKey;
    object: ItemClass;
    data: Buffer;
  }) {
    this.program = args.program;
    this.key = args.key;
    this.object = args.object;
    this.data = args.data;
  }
}

export async function getItemProgram(
  anchorWallet: NodeWallet | web3.Keypair,
  env: string,
  customRpcUrl: string
): Promise<ItemProgram> {
  if ((anchorWallet as web3.Keypair).secretKey) {
    return ItemProgram.getProgramWithWalletKeyPair(
      ItemProgram,
      anchorWallet as web3.Keypair,
      env,
      customRpcUrl
    );
  }

  return ItemProgram.getProgramWithWallet(
    ItemProgram,
    anchorWallet as Wallet,
    env,
    customRpcUrl
  );
}

export class ItemClassNotFoundError extends Error {
  constructor(message: string) {
    super(`ItemClass Not Found: ${message}`);

    // Set the prototype explicitly
    // Ref: https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, Error.prototype);
  }
}
