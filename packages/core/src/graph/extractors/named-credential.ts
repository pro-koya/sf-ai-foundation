import type { NamedCredential } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

/**
 * NamedCredential XML から最低限の情報を抽出する。
 * シークレット (password / oauthToken / consumer secret 等) は **値そのものは出さない**。
 * 「シークレットあり/なし」のフラグだけを返す。
 */
export function extractNamedCredential({
  descriptor,
  content,
}: ExtractContext): NamedCredential | undefined {
  const root = parseXml(content);
  const node = (root.NamedCredential ?? {}) as Record<string, unknown>;
  const hasSecret = detectSecretPresence(content);
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    label: asString(node.label),
    endpoint: asString(node.endpoint),
    principalType: asString(node.principalType),
    protocol: asString(node.protocol),
    hasSecret,
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

const SECRET_TAGS = [
  "password",
  "oauthToken",
  "oauthRefreshToken",
  "consumerKey",
  "consumerSecret",
  "certificate",
];

function detectSecretPresence(rawXml: string): boolean {
  for (const tag of SECRET_TAGS) {
    const re = new RegExp(`<${tag}>[^<]+</${tag}>`, "i");
    if (re.test(rawXml)) return true;
  }
  return false;
}
