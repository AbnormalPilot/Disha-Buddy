"use client";

import { useState } from "react";
import Wizard from "./Wizard";
import ControlRoom from "./ControlRoom";
import type { StatusResponse } from "./types";

export default function HermesClient({ initialStatus }: { initialStatus: StatusResponse }) {
  const [mode, setMode] = useState<"wizard" | "control">(
    initialStatus.configured ? "control" : "wizard",
  );
  const [status, setStatus] = useState(initialStatus);

  if (mode === "wizard") {
    return <Wizard onLaunched={() => setMode("control")} />;
  }
  return (
    <ControlRoom
      initialStatus={status}
      onEditConfig={() => {
        setStatus(status);
        setMode("wizard");
      }}
    />
  );
}
