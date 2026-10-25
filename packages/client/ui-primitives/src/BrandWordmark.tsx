import { BRAND_MARK_PATH } from './BrandMark.tsx'
import type { IconProps } from './icons/props.ts'

/** Display options for the Master Harness wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading monogram; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading monogram.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 182 : 156
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 182 24' : '26 0 156 24'}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && (
        <path d={BRAND_MARK_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" transform="translate(2 2)" />
      )}
      <text
        x={30}
        y={17}
        fill="currentColor"
        fontFamily="ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize={15}
        fontWeight={600}
        letterSpacing={0.1}
      >
        Master Harness
      </text>
    </svg>
  )
}
