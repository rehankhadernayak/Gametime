import "react";

declare module "react" {
  // Augment React's attribute bag; type param must mirror upstream signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    string?: string;
    "string-parallax"?: string;
  }
}

export {};
