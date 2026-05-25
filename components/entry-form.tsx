"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import {
  createJournalEntry,
  type EntryFormState,
} from "@/lib/journal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: EntryFormState = {
  message: "",
  status: "idle",
};

export function EntryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    createJournalEntry,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <Textarea
        name="rawText"
        required
        placeholder="Bought 20 shares of NVDA at 187 because AI demand still looks strong"
        aria-label="Journal entry"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          className="min-h-5 text-sm text-zinc-500"
          aria-live="polite"
        >
          {state.message}
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving" : "Save"}
    </Button>
  );
}
