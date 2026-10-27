import { Link } from '@tanstack/react-router'
import { Fragment } from 'react'

export function Breadcrumbs({ items }: { items: { label: string; to?: '/' | '/cart' }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden text-sm font-bold md:block">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <li aria-hidden>/</li>}
            <li>
              {item.to && i < items.length - 1 ? (
                <Link to={item.to} className="hover:text-text-accent">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
