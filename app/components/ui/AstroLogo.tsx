import { classNames } from '~/utils/classNames';

interface AstroLogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

export function AstroLogo({ className, textClassName, iconClassName }: AstroLogoProps) {
  return (
    <span className={classNames('inline-flex items-center gap-2.5 group cursor-default', className)}>
      <span className={classNames(
        "relative flex h-8 w-8 items-center justify-center rounded-full bg-[#168AE6] shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg",
        iconClassName
      )}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-4.5 h-4.5 text-white drop-shadow-sm"
        >
          <path 
            d="M12 2L12 2C12 2 11 5 11 9C11 13 12 15 12 15M12 2C12 2 13 5 13 9C13 13 12 15 12 15M12 2L9 6L8 11L9 16L12 22L15 16L16 11L15 6L12 2Z" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={classNames('text-2xl font-bold tracking-tight text-Astro-elements-textPrimary', textClassName)}>
        Astro
      </span>
    </span>
  );
}
