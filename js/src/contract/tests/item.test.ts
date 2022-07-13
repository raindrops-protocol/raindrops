import { BN, web3 } from "@project-serum/anchor";
import { convertNumsToBNs } from "../item";

describe("convertNumsToBNs", () => {
  let data: any = {};
  beforeEach(() => {
    data = {
      itemClassData: {
        settings: {
          stakingWarmUpDuration: 45,
          stakingCooldownDuration: 32,
        },
        config: {
          components: [
            {
              timeToBuild: 2,
            },
            {
              timeToBuild: 9,
            },
          ],
          usages: [
            {
              validation: undefined,
              callback: undefined,
              itemClassType: {
                consumable: {
                  maxUses: null,
                  maxPlayersPerUse: null,
                  warmupDuration: null,
                  cooldownDuration: null,
                },
                wearable: {
                  limitPerPart: null,
                },
              },
            },
            {
              validation: { key: "Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm", code: 4 },
              callback: {
                key: "Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm",
                code: 1024,
              },
              itemClassType: {
                consumable: {
                  maxUses: 0,
                  maxPlayersPerUse: 1,
                  warmupDuration: 2,
                  cooldownDuration: 3,
                },
                wearable: {
                  limitPerPart: 4,
                },
              },
            },
            {
              validation: undefined,
              callback: null,
              itemClassType: {
                consumable: null,
                wearable: null,
              },
            },
          ],
        },
      },
    };
  });
  it("does nothing if itemClassData not populated", () => {
    const keyNotPresent = { not: "itemClassData" };
    const isNull = { itemClassData: null };
    expect(() => convertNumsToBNs(keyNotPresent)).not.toThrow();
    expect(() => convertNumsToBNs(isNull)).not.toThrow();
  });
  it("converts staking durations", () => {
    convertNumsToBNs(data);
    expect(data.itemClassData.settings.stakingWarmUpDuration).toEqual(
      new BN(45)
    );
    expect(data.itemClassData.settings.stakingCooldownDuration).toEqual(
      new BN(32)
    );
  });
  it("converts component time to build", () => {
    convertNumsToBNs(data);
    expect(data.itemClassData.config.components[0].timeToBuild).toEqual(new BN(2));
    expect(data.itemClassData.config.components[1].timeToBuild).toEqual(
      new BN(9)
    );
  });
  it("converts usage validation", () => {
    convertNumsToBNs(data);
    expect(data.itemClassData.config.usages[0].validation).toBeUndefined();
    expect(data.itemClassData.config.usages[1].validation.key).toEqual(
      new web3.PublicKey("Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm")
    );
    expect(data.itemClassData.config.usages[1].validation.code).toEqual(
      new BN(4)
    );
  });
  it("converts usage callback", () => {
    convertNumsToBNs(data);
    expect(data.itemClassData.config.usages[0].callback).toBeUndefined();
    expect(data.itemClassData.config.usages[1].callback.key).toEqual(
      new web3.PublicKey("Faxb4sjJfL5wXMtEL2vhnzKHyYnywspSz4PWTLuaZ4cm")
    );
    expect(data.itemClassData.config.usages[1].callback.code).toEqual(
      new BN(1024)
    );
    expect(data.itemClassData.config.usages[2].callback).toBeNull();
  });
  it("converts usage consumable", () => {
    convertNumsToBNs(data);
    expect(
      data.itemClassData.config.usages[0].itemClassType.consumable.maxUses
    ).toBeNull();
    expect(
      data.itemClassData.config.usages[0].itemClassType.consumable
        .maxPlayersPerUse
    ).toBeNull();
    expect(
      data.itemClassData.config.usages[0].itemClassType.consumable
        .warmupDuration
    ).toBeNull();
    expect(
      data.itemClassData.config.usages[0].itemClassType.consumable
        .cooldownDuration
    ).toBeNull();
    expect(
      data.itemClassData.config.usages[1].itemClassType.consumable.maxUses
    ).toEqual(new BN(0));
    expect(
      data.itemClassData.config.usages[1].itemClassType.consumable
        .maxPlayersPerUse
    ).toEqual(new BN(1));
    expect(
      data.itemClassData.config.usages[1].itemClassType.consumable
        .warmupDuration
    ).toEqual(new BN(2));
    expect(
      data.itemClassData.config.usages[1].itemClassType.consumable
        .cooldownDuration
    ).toEqual(new BN(3));
    expect(
      data.itemClassData.config.usages[2].itemClassType.consumable
    ).toBeNull();
  });
  it("converts usage wearable", () => {
    convertNumsToBNs(data);
    expect(
      data.itemClassData.config.usages[0].itemClassType.wearable.limitPerPart
    ).toBeNull();
    expect(
      data.itemClassData.config.usages[1].itemClassType.wearable.limitPerPart
    ).toEqual(new BN(4));
    expect(
      data.itemClassData.config.usages[2].itemClassType.wearable
    ).toBeNull();
  });
});