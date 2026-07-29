import Link from "next/link"

/**
 * Logo teks. Mengikuti pola logo pada design system: chip tinta berisi inisial,
 * lalu nama merek dengan titik merah sebagai aksen.
 */
export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-base font-bold text-paper">
        D
      </span>
      <span className="hand text-2xl leading-none text-ink">
        Dilirik<span className="text-red">.</span>
      </span>
    </Link>
  )
}
