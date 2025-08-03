"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  LanguageModel,
  LanguageModelCapability,
} from "@/ai/language/types";
import { languageModels } from "@/ai/language";
import { getFreeModelIds } from "@/ai/language/free";
import { LanguageModelCapability as CapabilityEnum } from "@/ai/language/types";

interface UseModelSelectProps {
  selectedChatModel: LanguageModel | undefined;
  setSelectedChatModel: (model: LanguageModel) => void;
}

/**
 * check determines if a given modelId should receive the Free capability.
 * Current rule: modelId starts with a vowel (a, e, i, o, u), case-insensitive.
 */
export const check = (modelId: string): boolean => {
  if (!modelId) return false;
  const first = modelId.trim().charAt(0).toLowerCase();
  return ["a", "e", "i", "o", "u"].includes(first);
};

export const useModelSelect = ({
  setSelectedChatModel,
}: UseModelSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    LanguageModelCapability[]
  >([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [freeIds, setFreeIds] = useState<Set<string> | null>(null);


  const handleModelSelect = (model: LanguageModel) => {
    setSelectedChatModel(model);
    setIsOpen(false);
  };

  const sortedModels = useMemo(() => {
    // Base list straight from registry; no external free.ts usage
    const augmented: LanguageModel[] = languageModels as LanguageModel[];

    const providers = Array.from(new Set(augmented.map((model) => model.provider)));

    const modelsByProvider = providers.reduce((acc, provider) => {
      acc[provider] = augmented.filter((model) => model.provider === provider);
      return acc;
    }, {} as Record<string, LanguageModel[]>);

    const result: LanguageModel[] = [];
    let index = 0;
    while (result.length < augmented.length) {
      for (const provider of providers) {
        const providerModels = modelsByProvider[provider];
        const model = providerModels?.[index];
        if (model) result.push(model);
      }
      index++;
    }
    return result;
  }, []);

  // Mark models as "Free" when check(modelId) is true; keep hasBadge for UI check
  const modelsWithRandomBadges = useMemo(() => {
    return sortedModels.map((model) => {
      const flag = check(model.modelId);
      if (!flag) return { ...model, hasBadge: false };
      const capsSet = new Set<LanguageModelCapability>([
        ...(model.capabilities ?? []),
        CapabilityEnum.Free,
      ]);
      return {
        ...model,
        hasBadge: true,
        capabilities: Array.from(capsSet),
      };
    });
  }, [sortedModels]);

  const filteredModels = useMemo(() => {
    const filtered = modelsWithRandomBadges.filter((model) => {
      const matchesCapabilities =
        selectedCapabilities.length === 0 ||
        selectedCapabilities.every((capability) =>
          model.capabilities?.includes(capability),
        );

      const matchesProviders =
        selectedProviders.length === 0 ||
        selectedProviders.includes(model.provider);

      return matchesCapabilities && matchesProviders;
    });
    console.log("[ModelSelect] filteredModels computed.", {
      totalSorted: modelsWithRandomBadges.length,
      totalFiltered: filtered.length,
      selectedCapabilities,
      selectedProviders,
      firstFew: filtered.slice(0, 100).map(m => ({
        id: m.modelId,
        caps: m.capabilities,
        provider: m.provider,
      })),
    });
    return filtered;
  }, [modelsWithRandomBadges, selectedCapabilities, selectedProviders]);

  const toggleCapability = (capability: LanguageModelCapability) => {
    setSelectedCapabilities((prev) =>
      prev.includes(capability)
        ? prev.filter((c) => c !== capability)
        : [...prev, capability],
    );
  };

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider],
    );
  };

  return {
    models: filteredModels,
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    selectedCapabilities,
    selectedProviders,
    toggleCapability,
    toggleProvider,
    handleModelSelect,
  };
};
