type ChatSelectionWithId = {
  _id?: unknown;
} | null | undefined;

export function resolveActiveChatData<T extends ChatSelectionWithId>(
  selectedChat: T,
  currentGroupData: T,
  isGroup: boolean
) {
  if (!isGroup) return selectedChat;
  if (!selectedChat) return selectedChat;

  const selectedId = selectedChat._id;
  const currentId = currentGroupData?._id;

  if (
    selectedId !== null &&
    selectedId !== undefined &&
    currentId !== null &&
    currentId !== undefined &&
    String(selectedId) === String(currentId)
  ) {
    return currentGroupData;
  }

  return selectedChat;
}
