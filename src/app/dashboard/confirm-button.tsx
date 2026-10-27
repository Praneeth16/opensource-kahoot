"use client";

import { Icon } from "@/ui/icons";

export function ConfirmButton({
  action,
  label,
  message,
}: {
  action: () => Promise<void>;
  label: string;
  message: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <button
        aria-label={label}
        className="btn-ghost hover:text-action"
        type="submit"
      >
        <Icon name="trash" />
        <span className="hidden md:inline">Delete</span>
      </button>
    </form>
  );
}
