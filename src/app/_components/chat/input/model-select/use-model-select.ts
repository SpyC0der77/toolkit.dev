"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  LanguageModel,
  LanguageModelCapability,
} from "@/ai/language/types";
import { languageModels } from "@/ai/language";
import { LanguageModelCapability as CapabilityEnum } from "@/ai/language/types";

interface UseModelSelectProps {
  selectedChatModel: LanguageModel | undefined;
  setSelectedChatModel: (model: LanguageModel) => void;
}

let cachedFreeIds: Set<string> | null = null;

async function fetchFreeModelIds(): Promise<Set<string>> {
  if (cachedFreeIds) return cachedFreeIds;
  try {
    const res = await fetch("/api/free-models");
    const data = await res.json();
    cachedFreeIds = new Set<string>(data.models ?? []);
    console.log("[use-model-select] fetched free models", {
      count: cachedFreeIds.size,
    });
  } catch (err) {
    console.log("[use-model-select] failed to fetch free models", err);
    cachedFreeIds = new Set();
  }
  return cachedFreeIds;
}

/**
 * check determines if a given modelId should receive the Free capability by
 * querying the /api/free-models endpoint and verifying membership.
 */
export const check = async (modelId: string): Promise<boolean> => {
  const ids = await fetchFreeModelIds();
  const isFree = ids.has(modelId);
  console.log("[use-model-select] check", { modelId, isFree });
  return isFree;
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

  const [modelsWithBadges, setModelsWithBadges] = useState<LanguageModel[]>(
    sortedModels,
  );

  useEffect(() => {
    let active = true;
    const augment = async () => {
      const augmented = await Promise.all(
        sortedModels.map(async (model) => {
          const flag = await check(model.modelId);
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
        })
      );
      if (active) setModelsWithBadges(augmented);
    };
    augment();
    return () => {
      active = false;
    };
  }, [sortedModels]);

  const filteredModels = useMemo(() => {
    const filtered = modelsWithBadges.filter((model) => {
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
      totalSorted: modelsWithBadges.length,
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
  }, [modelsWithBadges, selectedCapabilities, selectedProviders]);

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
