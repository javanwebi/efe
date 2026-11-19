import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { STORE_ASSETS } from '../../assets/images';

interface ProductImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
  disableFallback?: boolean;
  alt: string;
  missingLabel?: string;
}

export const ProductImage: React.FC<ProductImageProps> = (props) => (
  <ProductImageView key={JSON.stringify([props.src, props.fallbackSrc, props.disableFallback])} {...props} />
);

const ProductImageView: React.FC<ProductImageProps> = ({
  src,
  fallbackSrc = STORE_ASSETS.categories.belts,
  disableFallback = false,
  alt,
  missingLabel,
  className = '',
  onError,
  ...rest
}) => {
  const fallback = disableFallback ? '' : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(src?.trim() || fallback);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
      return;
    }
    setCurrentSrc('');
    onError?.(event);
  };

  if (!currentSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-50 text-slate-400 ${className}`}
        role="img"
        aria-label={missingLabel || alt || 'تصویر محصول'}
      >
        <Package className="w-8 h-8 opacity-45" aria-hidden="true" />
        {missingLabel && <span className="mt-2 px-3 text-center text-xs font-semibold text-slate-600">{missingLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
      {...rest}
    />
  );
};
