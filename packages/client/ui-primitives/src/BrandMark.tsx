import type { IconProps } from './icons/props.ts'

/** Native viewBox of {@link BRAND_MARK_PATH} (width and height in user units). */
export const BRAND_MARK_VIEWBOX = { width: 20, height: 20 }

/**
 * The Master Harness monogram: a rounded tile with the M cut out, so the
 * surrounding surface shows through the letter at any ink color.
 */
export const BRAND_MARK_PATH = 'M4 1h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3ZM5 15V5h2.6L10 9.2 12.4 5H15v10h-2.2V8.6L10.6 12H9.4L7.2 8.6V15H5Z'

/**
 * Render the Master Harness mark.
 * @param props.size - rendered edge length in px (default 24; the mark is square).
 * @param props.className - extra class for layout placement.
 * @returns the brand-mark svg (aria-hidden; pair it with text for accessibility).
 */
export function BrandMark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox={`0 0 ${BRAND_MARK_VIEWBOX.width} ${BRAND_MARK_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={BRAND_MARK_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  )
}
