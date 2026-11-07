import React from 'react';
import {
  Sparkles,
  Store,
  ShoppingBag,
  TrendingUp,
  Compass,
  Award
} from 'lucide-react';
import { AppBranding } from '../types';

interface BrandLogoProps {
  branding: AppBranding;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  branding,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
    xl: 'w-14 h-14 rounded-3xl text-xl'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  // If custom logo image is provided and logoType is 'custom'
  if (branding.logoType === 'custom' && branding.customLogoUrl) {
    return (
      <div
        className={`${sizeClasses[size]} overflow-hidden border border-black/10 dark:border-white/10 shadow-sm shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 ${className}`}
      >
        <img
          src={branding.customLogoUrl}
          alt={branding.appName}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Render preset vector icon with customizable brand accent color
  const renderIcon = () => {
    const iconClass = `${iconSizes[size]} text-white`;
    switch (branding.logoIcon) {
      case 'Store':
        return <Store className={iconClass} />;
      case 'ShoppingBag':
        return <ShoppingBag className={iconClass} />;
      case 'TrendingUp':
        return <TrendingUp className={iconClass} />;
      case 'Compass':
        return <Compass className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'Sparkles':
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const bgColor = branding.logoColor || '#248A60';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`${sizeClasses[size]} shrink-0 flex items-center justify-center shadow-md shadow-black/10 font-bold transition-transform ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
