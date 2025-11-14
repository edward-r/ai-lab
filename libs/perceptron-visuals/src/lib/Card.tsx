import React from 'react'

export type CardProps = {
  title?: string
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => (
  <section className={`rounded-lg border p-3 min-w-0 ${className ?? ''}`}>
    {title ? <h3 className="mb-2 font-semibold">{title}</h3> : null}
    {children}
  </section>
)
