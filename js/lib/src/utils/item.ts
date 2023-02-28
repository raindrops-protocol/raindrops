import { web3, AnchorProvider, BN, Address } from "@project-serum/anchor";
import { getMetadata } from "./pda";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";

export enum TokenStandard {
    ProgrammableNft,
    Spl,
}

export async function getTokenStandard(connection: web3.Connection, mint: web3.PublicKey): Promise<TokenStandard> {
    try {
        const metadataAddr = await getMetadata(mint)
        const metadata = await mpl.Metadata.fromAccountAddress(connection, metadataAddr, "confirmed");
        if (metadata.tokenStandard === mpl.TokenStandard.ProgrammableNonFungible) {
            return TokenStandard.ProgrammableNft
        }
    } catch(_e) {}

    return TokenStandard.Spl
}
