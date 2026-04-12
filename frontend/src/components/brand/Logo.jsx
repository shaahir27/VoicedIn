import { assetUrl } from '../../utils/api';

export default function Logo({ size = 'md', className = '', imageSrc = '', alt = 'VoicedIn' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  const imageSizes = {
    sm: 'h-7 max-w-[120px]',
    md: 'h-9 max-w-[150px]',
    lg: 'h-12 max-w-[190px]',
    xl: 'h-14 max-w-[220px]',
  };

  if (imageSrc) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <img src={assetUrl(imageSrc)} alt={alt} className={`${imageSizes[size] || imageSizes.md} w-auto object-contain`} />
      </span>
    );
  }

  return (
    <span className={`font-extrabold tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-slate-800">voiced</span>
      <span className="text-primary-500">In</span>
    </span>
  );
}
