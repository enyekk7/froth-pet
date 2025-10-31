// Helper untuk convert imageURI dari contract ke URL yang bisa digunakan untuk display
// Memastikan konsistensi antara thumbnail dan display besar

// Helper untuk detect placeholder IPFS (QmXXX1, QmXXX2, dll)
export function isPlaceholderIPFS(url) {
  if (!url) return false;
  const hash = url.replace('ipfs://', '').replace('https://gateway.pinata.cloud/ipfs/', '').replace('http://gateway.pinata.cloud/ipfs/', '');
  return /^Qm(XXX|YYY|ZZZ|AAA)[0-9]+$/i.test(hash);
}

// Helper untuk extract pet number dari imageURI
// Contoh: /nft-images/common/pet-2.png -> 2
//         nft-images/common/pet-2.png -> 2
//         pet-2.png -> 2
export function extractPetNumberFromURI(imageURI) {
  if (!imageURI) return null;
  
  // Extract nomor pet dari path
  const match = imageURI.match(/pet-(\d+)\.png/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

// Helper untuk get local image berdasarkan tier dan pet number
export function getLocalImageByTierAndPet(tier, petNumber = null) {
  const tierLower = (tier || 'common').toLowerCase();
  
  // Jika petNumber ada, gunakan itu
  if (petNumber !== null && petNumber !== undefined) {
    return `/nft-images/${tierLower}/pet-${petNumber}.png`;
  }
  
  // Default: return gambar pertama dari tier
  const firstImages = {
    common: '/nft-images/common/pet-1.png',
    uncommon: '/nft-images/uncommon/pet-5.png',
    epic: '/nft-images/epic/pet-8.png',
    legendary: '/nft-images/legendary/pet-10.png',
  };
  return firstImages[tierLower] || firstImages.common;
}

// Helper untuk convert IPFS URL ke gateway URL atau fallback ke local
// INI ADALAH FUNGSI UTAMA yang digunakan di semua tempat
export function convertImageURI(imageURI, tier = 'common') {
  if (!imageURI) {
    return getLocalImageByTierAndPet(tier);
  }
  
  // Extract pet number jika ada di imageURI
  const petNumber = extractPetNumberFromURI(imageURI);
  
  // Jika placeholder IPFS, gunakan local image dengan pet number yang sama
  if (isPlaceholderIPFS(imageURI)) {
    return getLocalImageByTierAndPet(tier, petNumber);
  }
  
  // Jika sudah gateway URL (https://...), return as is
  if (imageURI.startsWith('http://') || imageURI.startsWith('https://')) {
    // Tapi check apakah ini placeholder di dalam URL
    if (isPlaceholderIPFS(imageURI)) {
      return getLocalImageByTierAndPet(tier, petNumber);
    }
    return imageURI;
  }
  
  // Convert ipfs:// ke gateway
  if (imageURI.startsWith('ipfs://')) {
    const hash = imageURI.replace('ipfs://', '');
    // Jika placeholder, gunakan local dengan pet number
    if (isPlaceholderIPFS(imageURI)) {
      return getLocalImageByTierAndPet(tier, petNumber);
    }
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  
  // Handle local paths (misalnya /nft-images/... atau nft-images/...)
  if (imageURI.includes('nft-images') || imageURI.includes('pet-')) {
    // Pastikan ada leading slash
    if (!imageURI.startsWith('/')) {
      return '/' + imageURI;
    }
    return imageURI;
  }
  
  // Jika imageURI hanya pet-X.png, construct full path
  if (imageURI.match(/^pet-\d+\.png$/i)) {
    return `/nft-images/${tier.toLowerCase()}/${imageURI}`;
  }
  
  // Default: return dengan pet number jika ada
  return getLocalImageByTierAndPet(tier, petNumber);
}

