'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, X, UserMinus, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { useSocketChat, Group, GroupMember } from '@/lib/context/SocketChatContext';
import { useToast } from '@/hooks/use-toast';
const { resolveEnsToUserId } = await import('@/lib/api/ensResolver');

interface ManageGroupMembersProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

const ManageGroupMembers: React.FC<ManageGroupMembersProps> = ({ isOpen, onClose, group }) => {
  const { addGroupMembers, socket } = useSocketChat();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  
  // Fetch group members
  const fetchMembers = useCallback(async () => {
    if (!group?.groupId || !socket) return;
    
    setIsLoading(true);
    try {
      // Request members data from server
      socket.emit('get_group_members', { groupId: group.groupId });
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch group members',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, [group, socket, toast]);
  
  // Handle search
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 3 || !group?.groupId) return;
    
    setIsSearching(true);
    try {
      // Import the resolver
      
      
      // If it looks like an ENS name (contains a dot)
      if (searchQuery.includes('.') && 
          (searchQuery.endsWith('.eth') || searchQuery.endsWith('.swop.id'))) {
        console.log('Resolving ENS name:', searchQuery);
        const userId = await resolveEnsToUserId(searchQuery);
        
        if (userId) {
          console.log(`Resolved ENS ${searchQuery} to user ID: ${userId}`);
          
          // Use the resolved ID as the ETH address
          const results = [{
            id: searchQuery,
            type: 'ens',
            displayName: searchQuery,
            ethAddress: userId,
            note: 'Resolved ENS name'
          }];
          setSearchResults(results);
        } else {
          console.error('Failed to resolve ENS name:', searchQuery);
          toast({
            title: 'Warning',
            description: `Could not find user with ENS name: ${searchQuery}`,
            variant: 'default',
          });
          setSearchResults([]);
        }
      }
      // If it's an Ethereum address
      else if (searchQuery.startsWith('0x')) {
        const results = [{
          id: searchQuery,
          type: 'ethAddress',
          displayName: `${searchQuery.substring(0, 6)}...${searchQuery.substring(searchQuery.length - 4)}`,
          ethAddress: searchQuery
        }];
        setSearchResults(results);
      }
      // For other queries
      else {
        // Suggest as a possible swop.id address
        const ensName = `${searchQuery}.swop.id`;
        const userId = await resolveEnsToUserId(ensName);
        
        if (userId) {
          const results = [{
            id: ensName,
            type: 'ens',
            displayName: ensName,
            ethAddress: userId,
            note: 'Resolved ENS name'
          }];
          setSearchResults(results);
        } else {
          toast({
            title: 'Info',
            description: `No user found with name: ${searchQuery}`,
            variant: 'default',
          });
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for users',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, toast, group]);
  
  // Listen for group members updates
  useEffect(() => {
    if (!socket) return;
    
    const handleGroupMembers = (data: { groupId: string, members: GroupMember[] }) => {
      if (data.groupId === group.groupId) {
        console.log('Received group members:', data.members);
        setGroupMembers(data.members);
        setIsLoading(false);
      }
    };
    
    socket.on('group_members', handleGroupMembers);
    
    return () => {
      socket.off('group_members', handleGroupMembers);
    };
  }, [socket, group.groupId]);
  
  // Fetch group members when dialog opens
  useEffect(() => {
    if (isOpen && group) {
      fetchMembers();
    }
  }, [isOpen, group, fetchMembers]);
  
  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearchDebouncing(true);
    const debounce = setTimeout(() => {
      handleSearch();
      setIsSearchDebouncing(false);
    }, 500);
    
    return () => clearTimeout(debounce);
  }, [searchQuery, handleSearch]);
  
  // Add member to selection
  const addMember = useCallback((member: any) => {
    // Log the member data to see what's available
    console.log("Adding member with data:", member);
    
    // Member should already have an ethAddress from the search
    // But let's make sure we have it
    if (!member.ethAddress && member.id.startsWith('0x')) {
      // If the ID itself is an ETH address, use that
      member.ethAddress = member.id;
    }
    
    if (!member.ethAddress) {
      toast({
        title: 'Error',
        description: 'Could not determine Ethereum address for this user',
        variant: 'destructive',
      });
      return;
    }
    
    // Add the member using their Ethereum address
    const enhancedMember = {
      ...member,
      // Always use the ethAddress for adding to the group
      id: member.ethAddress
    };
    
    setSelectedMembers(prev => {
      // Check if member is already selected
      if (prev.some(m => m.id === enhancedMember.id)) {
        return prev;
      }
      return [...prev, enhancedMember];
    });
    
    // Clear search results
    setSearchResults([]);
    setSearchQuery('');
  }, [toast]);
  
  // Remove member from selection
  const removeMember = useCallback((memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);
  
  // Listen for members_added_success event
  useEffect(() => {
    if (!socket) return;
    
    const handleMembersAdded = (response: { 
      success: boolean; 
      groupId: string; 
      members: any[]; 
      alreadyMembers?: any[] 
    }) => {
      if (response.success && response.groupId === group.groupId) {
        setIsAdding(false);
        
        // Show different messages based on results
        if (response.members.length > 0) {
          toast({
            title: 'Success',
            description: `Added ${response.members.length} members to the group`,
          });
        }
        
        if (response.alreadyMembers && response.alreadyMembers.length > 0) {
          toast({
            title: 'Information',
            description: `${response.alreadyMembers.length} member(s) were already in the group`,
            variant: 'default',
          });
        }
        
        // Refresh members list
        fetchMembers();
        
        // Clear selected members
        setSelectedMembers([]);
      }
    };
    
    socket.on('members_added_success', handleMembersAdded);
    
    return () => {
      socket.off('members_added_success', handleMembersAdded);
    };
  }, [socket, group.groupId, fetchMembers, toast]);
  
  // Add selected members to group
  const handleAddMembers = useCallback(async () => {
    if (selectedMembers.length === 0 || !group?.groupId) return;
    
    setIsAdding(true);
    try {
      // Get member IDs
      const memberIds = selectedMembers.map(m => m.id);
      console.log('Adding members with IDs:', memberIds);
      
      // Add members to group
      await addGroupMembers(group.groupId, memberIds);
      
      // Response will be handled by the members_added_success event listener
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: 'Error',
        description: 'Failed to add members to the group',
        variant: 'destructive',
      });
      setIsAdding(false);
    }
  }, [selectedMembers, group, addGroupMembers, toast]);
  
  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    onClose();
    // Reset form
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
  }, [onClose]);
  
  // Get role icon
  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck size={14} className="text-green-500" />;
      case 'moderator':
        return <Shield size={14} className="text-blue-500" />;
      default:
        return null;
    }
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Manage Group Members</DialogTitle>
          <DialogDescription>
            Add or remove members from {group?.name || 'the group'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Add members section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Add Members</h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by address or ENS"
                  className="pl-10 pr-10"
                />
                {(isSearching || isSearchDebouncing) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" size={18} />
                )}
              </div>
              <Button variant="secondary" size="icon" onClick={handleSearch} disabled={isSearching || searchQuery.trim().length < 3}>
                <UserPlus size={18} />
              </Button>
            </div>
            
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md mt-2 max-h-40 overflow-y-auto">
                <ul>
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                      onClick={() => addMember(result)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/default-avatar.png" alt={result.displayName} />
                          <AvatarFallback>{result.displayName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{result.displayName}</p>
                          <p className="text-xs text-gray-500">
                            {result.ethAddress ? (
                              <span className="text-green-600">
                                {result.ethAddress.substring(0, 6)}...{result.ethAddress.substring(result.ethAddress.length - 4)}
                              </span>
                            ) : result.id}
                          </p>
                          {result.note && (
                            <p className="text-xs text-blue-400">{result.note}</p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <UserPlus size={16} />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Selected members */}
            {selectedMembers.length > 0 && (
              <div className="border rounded-md p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-medium text-gray-500">Selected Members ({selectedMembers.length})</p>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMembers([])}>
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <Badge key={member.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                      <span className="text-xs">{member.displayName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full hover:bg-gray-200"
                        onClick={() => removeMember(member.id)}
                      >
                        <X size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Button 
                  className="w-full mt-2" 
                  size="sm" 
                  onClick={handleAddMembers}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Selected Members
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {/* Current members list */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Current Members</h3>
              {isLoading && <Loader2 size={14} className="animate-spin text-gray-500" />}
            </div>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  <p className="text-sm text-gray-500">Loading members...</p>
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">No members found</p>
              ) : (
                <ul>
                  {groupMembers.map((member) => (
                    <li
                      key={member.id}
                      className="p-3 hover:bg-gray-50 border-b last:border-0 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={member.avatarUrl || "/default-avatar.png"} 
                            alt={member.displayName} 
                          />
                          <AvatarFallback>{member.displayName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium">{member.displayName}</p>
                            {getRoleIcon(member.role)}
                          </div>
                          <p className="text-xs text-gray-500">
                            {member.status === 'online' ? (
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                Online
                              </span>
                            ) : (
                              'Offline'
                            )}
                          </p>
                        </div>
                      </div>
                      {member.role !== 'admin' && group.role === 'admin' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <UserMinus size={16} />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageGroupMembers;
