// postStore.ts
import { create } from "zustand";

type PostContentItem = {
  type: string;
  src: string;
};

type PostStore = {
  postContent: PostContentItem[];
  setPostContent: (content: PostContentItem[]) => void;
};

export const useCommentContentStore = create<PostStore>((set) => ({
  postContent: [], // Initial state (empty array)
  setPostContent: (content) => set({ postContent: content }), // Action to update state
}));
