import {
  getGroupMenuPermissions,
  getObjectIdString,
} from '@/components/chat/groupMenuPermissions';

describe('group menu permissions', () => {
  it('normalizes common populated and serialized Mongo id shapes', () => {
    expect(getObjectIdString({ _id: 'user-1' })).toBe('user-1');
    expect(getObjectIdString({ id: 'user-2' })).toBe('user-2');
    expect(getObjectIdString({ $oid: 'user-3' })).toBe('user-3');
    expect(getObjectIdString({ _id: { $oid: 'user-4' } })).toBe('user-4');
  });

  it('lets group creators manage members even when ids are populated objects', () => {
    expect(
      getGroupMenuPermissions(
        {
          createdBy: { _id: 'user-1', name: 'Travis' },
          participants: [
            {
              userId: { _id: 'user-1', name: 'Travis' },
              role: 'member',
              permissions: ['send_messages', 'edit_group_info'],
            },
          ],
        },
        'user-1',
      ),
    ).toEqual({
      canManageMembers: true,
      canEditInfo: true,
      canDelete: true,
    });
  });

  it('recognizes current and legacy member-management permission flags', () => {
    expect(
      getGroupMenuPermissions(
        {
          participants: [
            {
              userId: 'user-1',
              permissions: ['add_participants'],
            },
          ],
        },
        'user-1',
      ).canManageMembers,
    ).toBe(true);

    expect(
      getGroupMenuPermissions(
        {
          participants: [
            {
              userId: 'user-1',
              permissions: ['manage_members'],
            },
          ],
        },
        'user-1',
      ).canManageMembers,
    ).toBe(true);
  });

  it('keeps backward-compatible member management for legacy groups without permissions arrays', () => {
    expect(
      getGroupMenuPermissions(
        {
          participants: [
            {
              userId: 'user-1',
              role: 'member',
            },
          ],
        },
        'user-1',
      ),
    ).toEqual({
      canManageMembers: true,
      canEditInfo: true,
      canDelete: false,
    });
  });

  it('lets legacy admins manage members even without permissions arrays', () => {
    expect(
      getGroupMenuPermissions(
        {
          participants: [
            {
              userId: 'user-1',
              role: 'admin',
            },
          ],
        },
        'user-1',
      ),
    ).toEqual({
      canManageMembers: true,
      canEditInfo: true,
      canDelete: true,
    });
  });

  it('does not show member management to regular members with only edit permission', () => {
    expect(
      getGroupMenuPermissions(
        {
          participants: [
            {
              userId: 'user-1',
              role: 'member',
              permissions: ['send_messages', 'edit_group_info'],
            },
          ],
        },
        'user-1',
      ),
    ).toEqual({
      canManageMembers: false,
      canEditInfo: true,
      canDelete: false,
    });
  });
});
