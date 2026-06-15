import { resolveActiveChatData } from '@/components/chat/chatSelection';

describe('resolveActiveChatData', () => {
  it('falls back to the selected group when cached group data belongs to another thread', () => {
    const selectedGroup = {
      _id: 'group-trading-cabal',
      name: 'Trading Cabal',
    };
    const staleGroupData = {
      _id: 'group-astro-desk',
      name: 'Astro Trading Desk',
    };

    expect(
      resolveActiveChatData(selectedGroup, staleGroupData, true)
    ).toBe(selectedGroup);
  });

  it('uses fresh cached group data when it matches the selected group id', () => {
    const selectedGroup = {
      _id: 'group-trading-cabal',
      name: 'Trading Cabal',
    };
    const refreshedGroupData = {
      _id: 'group-trading-cabal',
      name: 'Trading Cabal',
      participants: [{ userId: { name: 'Travis' } }],
    };

    expect(
      resolveActiveChatData(selectedGroup, refreshedGroupData, true)
    ).toBe(refreshedGroupData);
  });

  it('does not use group cache data for private chats', () => {
    const selectedDirectChat = {
      _id: 'user-1',
      name: 'Direct chat',
    };
    const staleGroupData = {
      _id: 'group-astro-desk',
      name: 'Astro Trading Desk',
    };

    expect(
      resolveActiveChatData(selectedDirectChat, staleGroupData, false)
    ).toBe(selectedDirectChat);
  });
});
