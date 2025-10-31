import { convertImageURI } from '../lib/imageUtils';

export default function KittyCard({ imageUrl, level, energy, tier, name }) {
  const getTierColor = (tier) => {
    const tierLower = (tier || '').toLowerCase();
    const colors = {
      common: 'bg-gradient-to-r from-gray-500 to-gray-600',
      uncommon: 'bg-gradient-to-r from-green-500 to-emerald-600',
      epic: 'bg-gradient-to-r from-emerald-500 to-green-600',
      legendary: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    };
    return colors[tierLower] || colors.common;
  };
  
  const displayImageUrl = convertImageURI(imageUrl, tier);

  return (
    <div className="relative inline-block w-full">
      {/* Main Image Container - Compact */}
      <div className="relative bg-gradient-to-br from-white to-green-50 rounded-xl p-2 shadow-lg border-2 border-green-200 backdrop-blur-sm">
        {/* Image with Frame Effect - Compact */}
        <div className="relative rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-green-100 to-emerald-100 p-1.5 border border-green-200">
          <img 
            src={displayImageUrl || '/placeholder-pet.png'} 
            alt={name || 'Kitty'} 
            className="w-full h-auto rounded-lg object-contain"
            style={{ minHeight: '150px', maxHeight: '200px' }}
            onError={(e) => {
              // Try fallback: check if it's a local path
              if (displayImageUrl && displayImageUrl.startsWith('/nft-images/')) {
                // Already local path, show placeholder
              } else if (displayImageUrl && !displayImageUrl.startsWith('http')) {
                // Try local path fallback
                const localPath = displayImageUrl.startsWith('/') ? displayImageUrl : `/nft-images/common/pet-1.png`;
                e.target.src = localPath;
              } else {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2U1ZTdmYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjIwIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+S2l0dHkgUGV0PC90ZXh0Pjwvc3ZnPg==';
              }
            }}
          />
        </div>
        
        {/* Name Display - Below image, compact */}
        <div className="mt-2 text-center">
          <p className="text-green-800 font-bold text-sm md:text-base truncate">
            {name || 'Unnamed Kitty'}
          </p>
        </div>
      </div>
    </div>
  );
}
