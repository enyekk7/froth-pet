const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET = import.meta.env.VITE_PINATA_SECRET;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

if (!PINATA_JWT) {
  console.warn('Pinata credentials not configured. Please set VITE_PINATA_JWT in environment variables.');
}

// Upload gambar ke Pinata
export async function uploadImageToPinata(file) {
  if (!PINATA_JWT) {
    throw new Error('Pinata credentials not configured. Please set VITE_PINATA_JWT in environment variables.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata response error:', errorText);
      throw new Error(`Pinata upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.IpfsHash) {
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    }
    
    throw new Error('Failed to upload to Pinata - no hash returned');
  } catch (error) {
    console.error('Pinata upload error:', error);
    throw error;
  }
}

// Upload JSON metadata ke Pinata
export async function uploadMetadataToPinata(metadata) {
  if (!PINATA_JWT) {
    throw new Error('Pinata credentials not configured. Please set VITE_PINATA_JWT in environment variables.');
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata metadata response error:', errorText);
      throw new Error(`Pinata metadata upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.IpfsHash) {
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    }
    
    throw new Error('Failed to upload metadata to Pinata - no hash returned');
  } catch (error) {
    console.error('Pinata metadata upload error:', error);
    throw error;
  }
}

// Daftar gambar NFT berdasarkan tier (untuk random selection)
// Total: 10 gambar dibagi sesuai tier:
// - Common: pet-1, pet-2, pet-3, pet-4 (4 gambar)
// - Uncommon: pet-5, pet-6, pet-7 (3 gambar)
// - Epic: pet-8, pet-9 (2 gambar)
// - Legendary: pet-10 (1 gambar)
export const NFT_IMAGES = {
  common: [
    '/nft-images/common/pet-1.png',
    '/nft-images/common/pet-2.png',
    '/nft-images/common/pet-3.png',
    '/nft-images/common/pet-4.png',
  ],
  uncommon: [
    '/nft-images/uncommon/pet-5.png',
    '/nft-images/uncommon/pet-6.png',
    '/nft-images/uncommon/pet-7.png',
  ],
  epic: [
    '/nft-images/epic/pet-8.png',
    '/nft-images/epic/pet-9.png',
  ],
  legendary: [
    '/nft-images/legendary/pet-10.png',
  ],
};

// Fungsi untuk random select tier berdasarkan weight
export function selectRandomTier() {
  const random = Math.random() * 100;
  
  if (random < 3) return 'legendary';      // 3%
  if (random < 10) return 'epic';          // 7%
  if (random < 30) return 'uncommon';      // 20%
  return 'common';                          // 70%
}

// Fungsi untuk random select image dari tier
export function selectRandomImage(tier) {
  const images = NFT_IMAGES[tier] || NFT_IMAGES.common;
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

// Helper untuk convert local image ke File object untuk upload
export async function imageUrlToFile(imageUrl, filename) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error converting image to file:', error);
    throw error;
  }
}

