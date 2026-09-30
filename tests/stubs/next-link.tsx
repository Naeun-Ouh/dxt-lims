import type { AnchorHTMLAttributes, ReactNode } from 'react';

export default function Link({ href, children, ...properties }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  return <a href={href} {...properties}>{children}</a>;
}
