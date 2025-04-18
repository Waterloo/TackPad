// stores/linkStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { LinkItem, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useLinkStore = defineStore('links', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()
  
  // Add a link item
  const addLinkItem = async (link: string, position: Position): Promise<LinkItem | null> => {
    if (!boardStore.board) return null;

    // Create initial link item immediately
    const hostname = new URL(link).hostname;
    const initialLinkItem: LinkItem = {
      id: `LINK-${nanoid(10)}`,
      kind: 'link',
      content: {
        url: link,
        title: `Link to ${hostname}`,
        image: '',
        description: `Loading metadata...`
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width || 400,
      height: position.height || 200
    };

    // Add to board immediately
    boardStore.addBoardItem(initialLinkItem);
    boardStore.debouncedSaveBoard();
  
    try {
      const response = await fetch(
        `/api/metadata?url=${encodeURIComponent(link)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch link data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Determine if we received oEmbed or regular metadata
      const isOEmbed = data.source === 'oembed';
      const metadata = data.data;
      
      // Update the existing link item with metadata
      const updatedContent = isOEmbed 
        ? {
            url: link,
            thumbnail_url: metadata.thumbnail_url || '',
            thumbnail_width: metadata.width || metadata.thumbnail_width || position.width,
            thumbnail_height: metadata.height || metadata.thumbnail_height || position.height,
            html: metadata.html || '',
            type: metadata.type || 'rich'
          }
        : {
            url: link,
            title: metadata.title || `Link to ${hostname}`,
            image: metadata.image || metadata.thumbnail_url || '',
            description: metadata.description || `A link to ${hostname}`
          };

      const updatedDimensions = isOEmbed 
        ? {
            width: metadata.width || metadata.thumbnail_width || position.width,
            height: metadata.height || metadata.thumbnail_height || position.height
          }
        : {
            width: position.width || 400,
            height: position.height || 200
          };
  
      // Find and update the link item
      const itemIndex = boardStore.board.data.items.findIndex(item => item.id === initialLinkItem.id);
      if (itemIndex !== -1) {
        const updatedItem: LinkItem = {
          ...initialLinkItem,
          content: updatedContent,
          width: updatedDimensions.width || 400,
          height: updatedDimensions.height || 200
        };
        boardStore.board.data.items[itemIndex] = updatedItem;
        boardStore.debouncedSaveBoard();
        return updatedItem;
      }
      return initialLinkItem;
  
    } catch (error) {
      console.error('Error adding link item:', error);

      // Update the initial link item with final fallback content
      const itemIndex = boardStore.board.data.items.findIndex(item => item.id === initialLinkItem.id);
      if (itemIndex !== -1) {
        const fallbackItem: LinkItem = {
          ...initialLinkItem,
          content: {
            ...initialLinkItem.content,
            description: `A link to ${hostname}`
          }
        };
        boardStore.board.data.items[itemIndex] = fallbackItem;
        boardStore.debouncedSaveBoard();
        return fallbackItem;
      }
      return initialLinkItem;
    }
  }
  
  return {
    addLinkItem
  }
})