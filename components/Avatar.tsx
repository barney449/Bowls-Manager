import React from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (!src) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold border-2 border-white shadow-sm`}>
        ?
      </div>
    );
  }

  return (
    <div className="relative group z-10 hover:z-[100]">
      <img
        src={src}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm bg-gray-200 transition-all duration-200 group-hover:scale-[3] group-hover:shadow-2xl group-hover:ring-4 group-hover:ring-white/50`}
      />
    </div>
  );
};

export default Avatar;
