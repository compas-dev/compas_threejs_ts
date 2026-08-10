import { pbLoadBytes } from "@gramaziokohler/compas-pb-ts";

/** Decode a complete COMPAS Protobuf message envelope. */
export function decodeMessage(message: Uint8Array): unknown {
    return pbLoadBytes(message);
}
