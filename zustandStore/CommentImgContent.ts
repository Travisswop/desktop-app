// CommentImgContent.ts
import { create } from "zustand";

interface ContentItem {
  type: "image" | "gif" | "video";
  src: string;
}

interface CommentContentStore {
  postContent: ContentItem[];
  addContent: (item: ContentItem) => void;
  removeContent: (index: number) => void;
  setPostContent: (items: ContentItem[]) => void;
}

export const useCommentContentStore = create<CommentContentStore>((set) => ({
  postContent: [],
  addContent: (item) =>
    set((state) => ({
      postContent:
        state.postContent.length < 4
          ? [...state.postContent, item]
          : state.postContent,
    })),
  removeContent: (index) =>
    set((state) => ({
      postContent: state.postContent.filter((_, i) => i !== index),
    })),
  setPostContent: (items) => set({ postContent: items }),
}));
