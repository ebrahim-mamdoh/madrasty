"use client";

import { useState } from "react";

/**
 * State for a list screen's create/edit dialog and delete confirmation.
 * `editing` is null when creating; `deleting` holds the row awaiting confirmation.
 */
export function useCrudDialogs<T>() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  return {
    formOpen,
    editing,
    deleting,
    openCreate: () => {
      setEditing(null);
      setFormOpen(true);
    },
    openEdit: (row: T) => {
      setEditing(row);
      setFormOpen(true);
    },
    setFormOpen,
    askDelete: setDeleting,
    closeDelete: () => setDeleting(null),
  };
}
