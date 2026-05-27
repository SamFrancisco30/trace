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
  inferred: null,
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
        placeholder="TSLA 可能要回调了 / 今天学到不要追高 / AI 板块感觉开始过热"
        aria-label="Journal entry"
        className="resize-y"
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
