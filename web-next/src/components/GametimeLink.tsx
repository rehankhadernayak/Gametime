"use client";

import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type GametimeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  children?: ReactNode;
};

function isExternalPath(to: string) {
  return (
    /^https?:\/\//i.test(to) ||
    to.startsWith("//") ||
    to.startsWith("mailto:") ||
    to.startsWith("tel:")
  );
}

/** Drop-in for react-router `<Link to="...">` using Next.js App Router navigation. */
export function GametimeLink({ to, children, ...rest }: GametimeLinkProps) {
  if (isExternalPath(to)) {
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={to} prefetch={false} {...rest}>
      {children}
    </NextLink>
  );
}
