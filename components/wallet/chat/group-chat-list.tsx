'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Users, Plus, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSocketChat, Group } from '@/lib/context/SocketChatContext';
import CreateGroupChat from './create-group-chat';
import ManageGroupMembers from './manage-group-members';

interface GroupChatListProps {
  tokens?: any;
}

const GroupChatList: React.FC<GroupChatListProps> = ({ tokens }) => {
  const { groups, joinGroup } = useSocketChat();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Filter groups based on search
  const filteredGroups = searchQuery.trim().length > 0
    ? groups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;
  
  // Handle group selection
  const handleGroupSelect = async (group: Group) => {
    try {
      await joinGroup(group.groupId);
      router.push(`/chat?groupId=${group.groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };
  
  // Handle group creation success
  const handleGroupCreated = (groupId: string) => {
    router.push(`/chat?groupId=${groupId}`);
  };
  
  // Handle manage members click
  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    setIsManageMembersOpen(true);
  };
  
  return (
    <>
      <Card className="w-full border-none rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="font-bold text-xl text-gray-700">
                Group Chats
              </h3>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsCreateGroupOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus size={16} />
              <span>New Group</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups..."
                className="pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredGroups.length === 0 && (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  {searchQuery.trim().length > 0 
                    ? "No matching groups found" 
                    : "No groups yet"}
                </p>
                <Button 
                  variant="link" 
                  className="text-blue-500 mt-1"
                  onClick={() => setIsCreateGroupOpen(true)}
                >
                  Create your first group
                </Button>
              </div>
            )}
            
            {filteredGroups.map((group) => (
              <GroupCard 
                key={group.groupId} 
                group={group} 
                onSelect={handleGroupSelect}
                onManageMembers={handleManageMembers}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Create group dialog */}
      <CreateGroupChat
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onSuccess={handleGroupCreated}
      />
      
      {/* Manage members dialog */}
      {selectedGroup && (
        <ManageGroupMembers
          isOpen={isManageMembersOpen}
          onClose={() => setIsManageMembersOpen(false)}
          group={selectedGroup}
        />
      )}
    </>
  );
};

interface GroupCardProps {
  group: Group;
  onSelect: (group: Group) => void;
  onManageMembers: (group: Group) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onSelect, onManageMembers }) => {
  const getGroupAvatarUrl = () => {
    return group.avatarUrl || '/images/default-group.png';
  };
  
  const isAdmin = group.role === 'admin';
  
  return (
    <Card className="mb-3 hover:bg-gray-50 cursor-pointer border shadow-sm" onClick={() => onSelect(group)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={getGroupAvatarUrl()} alt={group.name} />
              <AvatarFallback>
                <Users size={20} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-base truncate">{group.name}</h4>
                {isAdmin && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Admin</span>
                )}
              </div>
              {group.description && (
                <p className="text-gray-500 text-sm line-clamp-1">{group.description}</p>
              )}
            </div>
          </div>
          
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-200" 
              onClick={(e) => {
                e.stopPropagation();
                onManageMembers(group);
              }}
            >
              <Settings size={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupChatList;
