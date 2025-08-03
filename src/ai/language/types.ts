import type { ProviderMetadata } from "ai";

export enum LanguageModelCapability {
  Vision = "vision",
  WebSearch = "web-search",
  Reasoning = "reasoning",
  Pdf = "pdf",
  ToolCalling = "tool-calling",
  Free = "free",
}

export type LanguageModel = {
  name: string;
  provider: string;
  modelId: string;
  description?: string;
  capabilities?: LanguageModelCapability[];
  bestFor?: string[];
  contextLength?: number;
  isNew?: boolean;
  /**
   * Free flag to show a badge in the model selector.
   * This is evaluated client-side and not persisted.
   */
  hasBadge?: boolean;
  providerOptions?: ProviderMetadata;
};
