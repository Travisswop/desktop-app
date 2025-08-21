'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, X, Lock, Globe, Users, Loader2 } from 'lucide-react';
import { useSocketChat } from '@/lib/context/SocketChatContext';
import { useToast } from '@/hooks/use-toast';

interface CreateGroupChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

const CreateGroupChat: React.FC<CreateGroupChatProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createGroup, searchUsers } = useSocketChat();
  const { toast } = useToast();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  
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
  }, [searchQuery]);
  
  // Handle search
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 3) return;
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for users',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchUsers, toast]);
  
  // Add member to selection
  const addMember = useCallback((member: any) => {
    setSelectedMembers(prev => {
      // Check if member is already selected
      if (prev.some(m => m.id === member.id)) {
        return prev;
      }
      return [...prev, member];
    });
    
    // Clear search results
    setSearchResults([]);
    setSearchQuery('');
  }, []);
  
  // Remove member from selection
  const removeMember = useCallback((memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);
  
  // Create group
  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Error',
        description: 'Group name is required',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreating(true);
    try {
      // Get member IDs
      const memberIds = selectedMembers.map(m => m.id);
      
      // Create group
      const groupId = await createGroup({
        name: groupName.trim(),
        description: description.trim(),
        members: memberIds,
        isPrivate
      });
      
      toast({
        title: 'Success',
        description: 'Group chat created successfully',
      });
      
      // Call onSuccess callback with group ID
      if (onSuccess) {
        onSuccess(groupId);
      }
      
      // Close dialog
      onClose();
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group chat',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [groupName, description, isPrivate, selectedMembers, createGroup, toast, onSuccess, onClose]);
  
  // Reset form
  const resetForm = useCallback(() => {
    setGroupName('');
    setDescription('');
    setIsPrivate(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
  }, []);
  
  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose, resetForm]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Group Chat</DialogTitle>
          <DialogDescription>
            Create a new group chat with your connections
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Group Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description (optional)"
              className="w-full resize-none"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Privacy
            </label>
            <Select value={isPrivate ? "private" : "public"} onValueChange={(value) => setIsPrivate(value === "private")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select privacy setting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe size={16} />
                    <span>Public</span>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock size={16} />
                    <span>Private</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {isPrivate 
                ? "Private: Only members can see and join this group" 
                : "Public: Anyone can find and join this group"}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Add Members
            </label>
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
                          <p className="text-xs text-gray-500">{result.id}</p>
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
                <p className="text-xs font-medium text-gray-500">Selected Members ({selectedMembers.length})</p>
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
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={isCreating || !groupName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupChat;
