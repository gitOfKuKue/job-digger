import type { OutreachTemplate } from "@/lib/types";

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: "intro",
    name: "Intro",
    subject: "Hello from {{name}} — interest in {{company}}",
    body: `Hi {{name}},

I came across {{company}} and wanted to reach out about {{title}}.

I'd welcome a short conversation if you're open to it.

Thanks,
`,
  },
  {
    id: "role",
    name: "Role outreach",
    subject: "{{title}} at {{company}}",
    body: `Hi {{name}},

I'm writing about the {{title}} work at {{company}}. I'd like to connect and share a bit of context on how I might help.

Best,
`,
  },
  {
    id: "blank",
    name: "Blank",
    subject: "",
    body: "",
  },
];
