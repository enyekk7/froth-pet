import { create } from 'zustand';

// Load petTokenId from localStorage on init
const getInitialPetTokenId = () => {
  try {
    const stored = localStorage.getItem('equippedPetTokenId');
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
};

export const useStore = create((set) => ({
  address: null,
  frothBalance: 0n,
  petData: null,
  bag: { burger: 0n, ayam: 0n },
  uiLoading: false,
  petTokenId: getInitialPetTokenId(),

  setAddress: (address) => set({ address }),
  setFrothBalance: (balance) => set({ frothBalance: balance }),
  setPetData: (data) => set({ petData: data }),
  setBag: (bag) => set({ bag }),
  setUiLoading: (loading) => set({ uiLoading: loading }),
  setPetTokenId: (tokenId) => {
    set({ petTokenId: tokenId });
    // Save to localStorage for persistence
    try {
      if (tokenId !== null && tokenId !== undefined) {
        localStorage.setItem('equippedPetTokenId', tokenId.toString());
      } else {
        localStorage.removeItem('equippedPetTokenId');
      }
    } catch (err) {
      console.warn('Failed to save equipped pet to localStorage:', err);
    }
  },
  
  reset: () => {
    localStorage.removeItem('equippedPetTokenId');
    set({
      address: null,
      frothBalance: 0n,
      petData: null,
      bag: { burger: 0n, ayam: 0n },
      uiLoading: false,
      petTokenId: null,
    });
  },
}));


