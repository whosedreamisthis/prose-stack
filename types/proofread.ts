export interface ProofreadIgnoreItem {
  id: string;
  kind: "WORD" | "RULE";
  value: string;
}
