"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteJournalEntry,
  updateJournalEntry,
  type EntryFormState,
} from "@/lib/journal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: EntryFormState = {
  message: "",
  status: "idle",
  inferred: null,
};

export function TimelineEntryActions({
  entryId,
  rawText,
}: {
  entryId: string;
  rawText: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {isEditing ? (
        <EditForm
          entryId={entryId}
          rawText={rawText}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      ) : (
        <div className="flex justify-end">
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 px-0 text-base text-zinc-600"
              aria-label="Entry actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              ⋯
            </Button>

            {menuOpen ? (
              <div
                className="absolute right-0 top-10 z-10 min-w-32 rounded-md border border-zinc-200 bg-white p-1 shadow-sm"
                role="menu"
                aria-label="Entry actions"
              >
                <button
                  type="button"
                  className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditing(true);
                  }}
                >
                  Edit
                </button>

                <form
                  action={deleteJournalEntry}
                  onSubmit={(event) => {
                    if (!window.confirm("Move this entry to trash?")) {
                      event.preventDefault();
                      return;
                    }
                    setMenuOpen(false);
                  }}
                >
                  <input type="hidden" name="eventId" value={entryId} />
                  <DeleteMenuButton />
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function EditForm({
  entryId,
  rawText,
  onCancel,
  onSuccess,
}: {
  entryId: string;
  rawText: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(updateJournalEntry, initialState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [onSuccess, state.status]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="eventId" value={entryId} />
      <Textarea
        name="rawText"
        defaultValue={rawText}
        aria-label="Edit journal entry"
        className="min-h-28"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
          {state.message}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <SaveButton />
        </div>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-8 px-3 text-xs" disabled={pending}>
      {pending ? "Saving" : "Save"}
    </Button>
  );
}

function DeleteMenuButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
      role="menuitem"
      disabled={pending}
    >
      {pending ? "Deleting" : "Delete"}
    </button>
  );
}
