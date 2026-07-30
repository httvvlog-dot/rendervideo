"use client"

import * as Dialog from "@base-ui/react/dialog";
import { useState } from "react";

export default function TestDialogPage() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-4 bg-blue-500 text-white rounded">
        Open
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/50" />
          <Dialog.Popup className="fixed inset-0 m-auto w-64 h-64 bg-white p-4">
            TEST RAW BASE UI DIALOG
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
