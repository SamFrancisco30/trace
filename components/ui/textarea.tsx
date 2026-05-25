import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-3 text-base leading-7 text-black outline-none placeholder:text-zinc-400 focus:border-black",
        className,
      )}
      {...props}
    />
  );
}
