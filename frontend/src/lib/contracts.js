// Contract ABIs
export const frothAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const petNFTAbi = [
  {
    inputs: [{ name: 'price', type: 'uint256' }],
    name: 'mintWithFroth',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'cost', type: 'uint8' },
    ],
    name: 'spendEnergy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'foodType', type: 'uint8' },
    ],
    name: 'feed',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newName', type: 'string' },
    ],
    name: 'rename',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getPet',
    outputs: [
      {
        components: [
          { name: 'level', type: 'uint8' },
          { name: 'energy', type: 'uint8' },
          { name: 'tier', type: 'string' },
          { name: 'imageURI', type: 'string' },
          { name: 'name', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mintPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export const shopAbi = [
  {
    inputs: [
      { name: 'foodType', type: 'uint8' },
      { name: 'quantity', type: 'uint256' },
    ],
    name: 'buyFood',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'foodType', type: 'uint8' },
    ],
    name: 'useFood',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBag',
    outputs: [
      { name: 'burgerQty', type: 'uint256' },
      { name: 'ayamQty', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'foodType', type: 'uint8' }],
    name: 'foods',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'price', type: 'uint256' },
      { name: 'foodType', type: 'uint8' },
      { name: 'restoreAmount', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// Helper function to validate Ethereum address
export const isValidAddress = (addr) => {
  if (!addr) return false;
  if (typeof addr !== 'string') return false;
  if (addr === '0x0000000000000000000000000000000000000000') return false;
  return addr.startsWith('0x') && addr.length === 42;
};

// Contract addresses from env with validation
// Clean environment variables (remove trailing \r\n and whitespace)
const cleanEnvVar = (value) => {
  if (!value) return null;
  return value.toString().trim().replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '');
};

export const frothAddress = cleanEnvVar(import.meta.env.VITE_FROTH_ADDRESS) || '0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba';
export const petNFTAddress = cleanEnvVar(import.meta.env.VITE_PET_NFT_ADDRESS) || null;
export const shopAddress = cleanEnvVar(import.meta.env.VITE_SHOP_ADDRESS) || null;

// Debug logging
console.log('📋 [contracts.js] Contract addresses:', {
  frothAddress,
  petNFTAddress,
  shopAddress,
  rawPetNFT: import.meta.env.VITE_PET_NFT_ADDRESS
});

// Validated addresses (only use if valid)
export const getValidShopAddress = () => {
  return isValidAddress(shopAddress) ? shopAddress : null;
};

export const getValidPetNFTAddress = () => {
  return isValidAddress(petNFTAddress) ? petNFTAddress : null;
};

