export interface PointerSelection {
  selectedIds: string[];
  movingIds: string[];
  toggleOffOnClick: boolean;
}

/**
 * Clique/arraste normal isola o bloco. Ctrl/Shift preserva a seleção múltipla
 * e é a única forma de iniciar um arraste de grupo.
 */
export function beginNodePointerSelection(currentIds: string[], nodeId: string, additive: boolean): PointerSelection {
  if (!additive) return { selectedIds: [nodeId], movingIds: [nodeId], toggleOffOnClick: false };

  const alreadySelected = currentIds.includes(nodeId);
  const selectedIds = alreadySelected ? [...currentIds] : [...currentIds, nodeId];
  return { selectedIds, movingIds: selectedIds, toggleOffOnClick: alreadySelected };
}

export function finishNodePointerSelection(
  currentIds: string[],
  nodeId: string,
  toggleOffOnClick: boolean,
  moved: boolean,
): string[] {
  return toggleOffOnClick && !moved ? currentIds.filter((id) => id !== nodeId) : currentIds;
}
