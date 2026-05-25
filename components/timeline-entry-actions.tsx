"use client";

import { useActionState, useEffect, useState } from "react";
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
};

export function TimelineEntryActions({
  entryId,
  rawText,
}: {
  entryId: string;
  rawText: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>

          <form
            action={deleteJournalEntry}
            onSubmit={(event) => {
              if (!window.confirm("Move this entry to trash?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="eventId" value={entryId} />
            <DeleteButton />
          </form>
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

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="h-8 px-3 text-xs text-zinc-600"
      disabled={pending}
    >
      {pending ? "Deleting" : "Delete"}
    </Button>
  );
}
